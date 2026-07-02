import csv
import io

from flask import Blueprint, request, jsonify
from marshmallow import ValidationError

from app.extensions import db
from app.models import Supplier
from app.schemas import SupplierSchema
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth, require_permission

suppliers_bp = Blueprint("suppliers", __name__, url_prefix="/api/v1/suppliers")


@suppliers_bp.route("", methods=["GET"])
@require_auth
@require_permission("suppliers.view")
def list_suppliers():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()

    query = Supplier.query
    if search:
        query = query.filter(Supplier.name.ilike(f"%{search}%"))

    branch_id = request.args.get("branch_id", type=int)
    if branch_id:
        query = query.filter(Supplier.branch_id == branch_id)

    pagination = query.order_by(Supplier.name.asc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify(
        {
            "items": [s.to_dict() for s in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }
    )


@suppliers_bp.route("/<int:supplier_id>", methods=["GET"])
@require_auth
@require_permission("suppliers.view")
def get_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    return jsonify(supplier.to_dict())


@suppliers_bp.route("", methods=["POST"])
@require_auth
@require_permission("suppliers.create")
def create_supplier():
    try:
        data = SupplierSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    supplier = Supplier(tenant_id=TenantContext.get(), **data)
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier.to_dict()), 201


@suppliers_bp.route("/import", methods=["POST"])
@require_auth
@require_permission("suppliers.import")
def import_suppliers():
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
            data = SupplierSchema().load(cleaned)
        except ValidationError as err:
            errors.append({"row": row_number, "errors": err.messages})
            continue

        # Explicitly set branch_id
        imported.append(Supplier(tenant_id=TenantContext.get(), branch_id=branch_id, **data))

    if errors:
        return jsonify({"error": "Import failed.", "details": errors}), 422

    db.session.add_all(imported)
    db.session.commit()
    return jsonify({"imported": len(imported)}), 201


@suppliers_bp.route("/<int:supplier_id>", methods=["PUT"])
@require_auth
@require_permission("suppliers.edit")
def update_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    try:
        data = SupplierSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    for key, value in data.items():
        setattr(supplier, key, value)
    db.session.commit()
    return jsonify(supplier.to_dict())


@suppliers_bp.route("/<int:supplier_id>", methods=["DELETE"])
@require_auth
@require_permission("suppliers.delete")
def delete_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    db.session.delete(supplier)
    db.session.commit()
    return "", 204