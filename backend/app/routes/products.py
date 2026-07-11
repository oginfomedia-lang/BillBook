import csv
import io

from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError

from app.extensions import db
from app.models import Product
from app.schemas import ProductSchema
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext
from app.utils.decorators import require_auth, require_permission

products_bp = Blueprint("products", __name__, url_prefix="/api/v1/products")


@products_bp.route("", methods=["GET"])
@require_auth
def list_products():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    branch_id = request.args.get("branch_id", type=int)

    query = Product.query.filter_by(is_active=True)
    
    # ✅ Get user from g (now properly set by require_auth)
    user = getattr(g, 'user', None)
    
    # Apply branch filter
    if branch_id:
        query = query.filter(Product.branch_id == branch_id)
    elif user and user.branch_id and not user.is_super_admin:
        query = query.filter(Product.branch_id == user.branch_id)
    
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    pagination = query.order_by(Product.name.asc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify(
        {
            "items": [p.to_dict() for p in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }
    )


@products_bp.route("/<int:product_id>", methods=["GET"])
@require_auth
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())


@products_bp.route("", methods=["POST"])
@require_auth
def create_product():
    try:
        data = ProductSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    user = getattr(g, 'user', None)
    
    branch_id = data.get('branch_id')
    if not branch_id:
        branch_id = BranchContext.get()
    if not branch_id and user and user.branch_id:
        branch_id = user.branch_id
    
    if 'branch_id' in data:
        del data['branch_id']
    
    product = Product(
        tenant_id=TenantContext.get(),
        branch_id=branch_id,
        **data
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.route("/<int:product_id>", methods=["PUT"])
@require_auth
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    try:
        data = ProductSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    for key, value in data.items():
        setattr(product, key, value)
    db.session.commit()
    return jsonify(product.to_dict())


@products_bp.route("/<int:product_id>", methods=["DELETE"])
@require_auth
def delete_product(product_id):
    """Soft delete — keeps invoice history intact even if a product is retired."""
    product = Product.query.get_or_404(product_id)
    product.is_active = False
    db.session.commit()
    return "", 204


@products_bp.route("/import", methods=["POST"])
@require_auth
@require_permission("products.import")
def import_products():
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

    user = getattr(g, 'user', None)
    branch_id = BranchContext.get()
    if not branch_id and user and user.branch_id:
        branch_id = user.branch_id

    for row_number, row in enumerate(reader, start=2):
        cleaned = {key: (value.strip() if isinstance(value, str) else value) for key, value in row.items()}
        try:
            data = ProductSchema().load(cleaned)
        except ValidationError as err:
            errors.append({"row": row_number, "errors": err.messages})
            continue

        if 'branch_id' in data:
            del data['branch_id']

        imported.append(Product(
            tenant_id=TenantContext.get(),
            branch_id=branch_id,
            **data
        ))

    if errors:
        return jsonify({"error": "Import failed.", "details": errors}), 422

    db.session.add_all(imported)
    db.session.commit()
    return jsonify({"imported": len(imported)}), 201