import csv
import io

from flask import Blueprint, request, jsonify
from marshmallow import ValidationError

from app.extensions import db
from app.models import Customer
from app.schemas import CustomerSchema
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth, require_permission

customers_bp = Blueprint("customers", __name__, url_prefix="/api/v1/customers")


@customers_bp.route("", methods=["GET"])
@require_auth
def list_customers():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()

    query = Customer.query
    if search:
        query = query.filter(Customer.name.ilike(f"%{search}%"))

    branch_id = request.args.get("branch_id", type=int)
    if branch_id:
        query = query.filter(Customer.branch_id == branch_id)

    pagination = query.order_by(Customer.name.asc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify(
        {
            "items": [c.to_dict() for c in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }
    )


@customers_bp.route("/<int:customer_id>", methods=["GET"])
@require_auth
def get_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    return jsonify(customer.to_dict())


@customers_bp.route("", methods=["POST"])
@require_auth
def create_customer():
    try:
        data = CustomerSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    customer = Customer(tenant_id=TenantContext.get(), **data)
    db.session.add(customer)
    db.session.commit()
    return jsonify(customer.to_dict()), 201


@customers_bp.route("/import", methods=["POST"])
@require_auth
@require_permission("customers.import")
def import_customers():
    if "file" not in request.files:
        return jsonify({"error": "CSV file is required."}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "CSV file is required."}), 400

    # Get branch_id from query parameters
    branch_id = request.args.get("branch_id", type=int)

    try:
        content = file.stream.read().decode("utf-8-sig")
    except Exception:
        return jsonify({"error": "Unable to read uploaded file."}), 400

    reader = csv.DictReader(io.StringIO(content))
    imported = []
    errors = []

    for row_number, row in enumerate(reader, start=2):
        cleaned = {key: (value.strip() if isinstance(value, str) else value) for key, value in row.items()}
        try:
            data = CustomerSchema().load(cleaned)
        except ValidationError as err:
            errors.append({"row": row_number, "errors": err.messages})
            continue

        # Explicitly set branch_id (overrides CSV if present)
        imported.append(Customer(tenant_id=TenantContext.get(), branch_id=branch_id, **data))

    if errors:
        return jsonify({"error": "Import failed.", "details": errors}), 422

    db.session.add_all(imported)
    db.session.commit()
    return jsonify({"imported": len(imported)}), 201


@customers_bp.route("/<int:customer_id>", methods=["PUT"])
@require_auth
def update_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    try:
        data = CustomerSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    for key, value in data.items():
        setattr(customer, key, value)
    db.session.commit()
    return jsonify(customer.to_dict())


@customers_bp.route("/<int:customer_id>", methods=["DELETE"])
@require_auth
def delete_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    db.session.delete(customer)
    db.session.commit()
    return "", 204