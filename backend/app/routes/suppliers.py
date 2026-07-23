import csv
import io

from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError

from app.extensions import db
from app.models import Supplier
from app.schemas import SupplierSchema
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth, require_permission

suppliers_bp = Blueprint("suppliers", __name__, url_prefix="/api/v1/suppliers")


@suppliers_bp.route("", methods=["GET"])
@require_auth
@require_permission("suppliers.view")
def list_suppliers():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    branch_id = request.args.get("branch_id", type=int)

    query = Supplier.query.filter_by(is_active=True)
    
    # Apply branch filter
    if branch_id:
        query = query.filter(Supplier.branch_id == branch_id)
    elif g.user and g.user.branch_id and not g.user.is_super_admin:
        query = query.filter(Supplier.branch_id == g.user.branch_id)
    
    if search:
        query = query.filter(
            db.or_(
                Supplier.name.ilike(f"%{search}%"),
                Supplier.email.ilike(f"%{search}%"),
                Supplier.phone.ilike(f"%{search}%")
            )
        )

    pagination = query.order_by(Supplier.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
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

    if data.get("mobile") and Supplier.query.filter(
        Supplier.mobile == data.get("mobile"), Supplier.is_active.isnot(False)
    ).first():
        return jsonify({"error": "Validation failed", "details": {"mobile": "A supplier is already registered with this mobile number"}}), 422
    if data.get("phone") and Supplier.query.filter(
        Supplier.phone == data.get("phone"), Supplier.is_active.isnot(False)
    ).first():
        return jsonify({"error": "Validation failed", "details": {"phone": "A supplier is already registered with this phone number"}}), 422

    # ✅ Get branch_id properly
    branch_id = data.get('branch_id')
    if not branch_id:
        branch_id = BranchContext.get() or g.user.branch_id
    
    # ✅ Remove branch_id from data to avoid duplication
    if 'branch_id' in data:
        del data['branch_id']

    # ✅ Create supplier with branch_id only once
    supplier = Supplier(
        tenant_id=TenantContext.get(),
        branch_id=branch_id,  # ✅ Pass branch_id once
        **data                 # ✅ data no longer contains branch_id
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier.to_dict()), 201


@suppliers_bp.route("/<int:supplier_id>", methods=["PUT"])
@require_auth
@require_permission("suppliers.edit")
def update_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    try:
        data = SupplierSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("mobile") and data.get("mobile") != supplier.mobile:
        if Supplier.query.filter(
            Supplier.mobile == data.get("mobile"), Supplier.is_active.isnot(False)
        ).first():
            return jsonify({"error": "Validation failed", "details": {"mobile": "A supplier is already registered with this mobile number"}}), 422
    if data.get("phone") and data.get("phone") != supplier.phone:
        if Supplier.query.filter(
            Supplier.phone == data.get("phone"), Supplier.is_active.isnot(False)
        ).first():
            return jsonify({"error": "Validation failed", "details": {"phone": "A supplier is already registered with this phone number"}}), 422

    for key, value in data.items():
        setattr(supplier, key, value)
    db.session.commit()
    return jsonify(supplier.to_dict())


@suppliers_bp.route("/<int:supplier_id>", methods=["DELETE"])
@require_auth
@require_permission("suppliers.delete")
def delete_supplier(supplier_id):
    """Soft delete supplier."""
    supplier = Supplier.query.get_or_404(supplier_id)
    supplier.is_active = False
    db.session.commit()
    return "", 204


@suppliers_bp.route("/import", methods=["POST"])
@require_auth
@require_permission("suppliers.import")
def import_suppliers():
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
    seen_mobiles = {}  # mobile -> row_number, catches duplicates within this file
    seen_phones = {}  # phone -> row_number, catches duplicates within this file

    # ✅ Get branch_id once for all imports
    branch_id = BranchContext.get() or g.user.branch_id

    for row_number, row in enumerate(reader, start=2):
        cleaned = {key: (value.strip() if isinstance(value, str) else value) for key, value in row.items()}
        try:
            data = SupplierSchema().load(cleaned)
        except ValidationError as err:
            errors.append({"row": row_number, "errors": err.messages})
            continue

        mobile = data.get("mobile")
        if mobile:
            if mobile in seen_mobiles:
                errors.append({
                    "row": row_number,
                    "errors": {"mobile": f"Duplicate mobile number within this file (already used on row {seen_mobiles[mobile]})"},
                })
                continue
            if Supplier.query.filter(Supplier.mobile == mobile, Supplier.is_active.isnot(False)).first():
                errors.append({"row": row_number, "errors": {"mobile": "A supplier is already registered with this mobile number"}})
                continue
            seen_mobiles[mobile] = row_number

        phone = data.get("phone")
        if phone:
            if phone in seen_phones:
                errors.append({
                    "row": row_number,
                    "errors": {"phone": f"Duplicate phone number within this file (already used on row {seen_phones[phone]})"},
                })
                continue
            if Supplier.query.filter(Supplier.phone == phone, Supplier.is_active.isnot(False)).first():
                errors.append({"row": row_number, "errors": {"phone": "A supplier is already registered with this phone number"}})
                continue
            seen_phones[phone] = row_number

        # ✅ Remove branch_id from data if it exists
        if 'branch_id' in data:
            del data['branch_id']

        # ✅ Create supplier with branch_id only once
        imported.append(Supplier(
            tenant_id=TenantContext.get(),
            branch_id=branch_id,  # ✅ Pass branch_id once
            **data                 # ✅ data no longer contains branch_id
        ))

    if errors:
        return jsonify({"error": "Import failed.", "details": errors}), 422

    db.session.add_all(imported)
    db.session.commit()
    return jsonify({"imported": len(imported)}), 201