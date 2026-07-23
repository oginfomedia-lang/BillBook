import csv
import io

from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError

from app.extensions import db
from app.models import Customer
from app.schemas import CustomerSchema
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth, require_permission

customers_bp = Blueprint("customers", __name__, url_prefix="/api/v1/customers")


@customers_bp.route("", methods=["GET"])
@require_auth
def list_customers():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    branch_id = request.args.get("branch_id", type=int)

    query = Customer.query
    query = query.filter(Customer.is_active.isnot(False))
    
    # ✅ Apply branch filter
    if branch_id:
        query = query.filter(Customer.branch_id == branch_id)
    else:
        query = apply_branch_scope(query, Customer)
    
    if search:
        query = query.filter(
            db.or_(
                Customer.name.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%"),
                Customer.phone.ilike(f"%{search}%")
            )
        )

    pagination = query.order_by(Customer.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
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

    if data.get("phone") and Customer.query.filter(
        Customer.phone == data.get("phone"), Customer.is_active.isnot(False)
    ).first():
        return jsonify({"error": "Validation failed", "details": {"phone": "A customer is already registered with this phone number"}}), 422

    # ✅ Get branch_id properly
    branch_id = data.get('branch_id')
    if not branch_id:
        branch_id = BranchContext.get()
    
    # ✅ Get user from g (if available)
    user = getattr(g, 'user', None)
    if not branch_id and user and user.branch_id:
        branch_id = user.branch_id
    
    # ✅ Remove branch_id from data to avoid duplication
    if 'branch_id' in data:
        del data['branch_id']

    # ✅ Create customer with branch_id only once
    customer = Customer(
        tenant_id=TenantContext.get(),
        branch_id=branch_id,  # ✅ Pass branch_id once
        **data                 # ✅ data no longer contains branch_id
    )
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

    try:
        content = file.stream.read().decode("utf-8-sig")
    except Exception:
        return jsonify({"error": "Unable to read uploaded file."}), 400

    reader = csv.DictReader(io.StringIO(content))
    imported = []
    errors = []
    seen_phones = {}  # phone -> row_number, catches duplicates within this file

    # ✅ Get branch_id once for all imports
    branch_id = BranchContext.get()
    user = getattr(g, 'user', None)
    if not branch_id and user and user.branch_id:
        branch_id = user.branch_id

    for row_number, row in enumerate(reader, start=2):
        cleaned = {key: (value.strip() if isinstance(value, str) else value) for key, value in row.items()}
        try:
            data = CustomerSchema().load(cleaned)
        except ValidationError as err:
            errors.append({"row": row_number, "errors": err.messages})
            continue

        phone = data.get("phone")
        if phone:
            if phone in seen_phones:
                errors.append({
                    "row": row_number,
                    "errors": {"phone": f"Duplicate phone number within this file (already used on row {seen_phones[phone]})"},
                })
                continue
            if Customer.query.filter(Customer.phone == phone, Customer.is_active.isnot(False)).first():
                errors.append({"row": row_number, "errors": {"phone": "A customer is already registered with this phone number"}})
                continue
            seen_phones[phone] = row_number

        # ✅ Remove branch_id from data if it exists
        if 'branch_id' in data:
            del data['branch_id']

        imported.append(Customer(
            tenant_id=TenantContext.get(),
            branch_id=branch_id,  # ✅ Pass branch_id once
            **data                 # ✅ data no longer contains branch_id
        ))

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

    if data.get("phone") and data.get("phone") != customer.phone:
        if Customer.query.filter(
            Customer.phone == data.get("phone"), Customer.is_active.isnot(False)
        ).first():
            return jsonify({"error": "Validation failed", "details": {"phone": "A customer is already registered with this phone number"}}), 422

    for key, value in data.items():
        setattr(customer, key, value)
    db.session.commit()
    return jsonify(customer.to_dict())


@customers_bp.route("/<int:customer_id>", methods=["DELETE"])
@require_auth
def delete_customer(customer_id):
    """Soft delete customer."""
    customer = Customer.query.get_or_404(customer_id)
    customer.is_active = False
    db.session.commit()
    return "", 204