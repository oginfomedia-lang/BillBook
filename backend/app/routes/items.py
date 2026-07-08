import csv
import io
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError

from app.extensions import db
from app.models import Item, Brand, Category, Unit, Tax, ItemGroup, Variant
from app.schemas.item_schemas import (
    ItemSchema, CreateItemSchema, UpdateItemSchema,
    BrandSchema, CategorySchema, UnitSchema, TaxSchema, ItemGroupSchema, VariantSchema
)
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth

items_bp = Blueprint("items", __name__, url_prefix="/api/v1/items")


# -----------------------------------------------------------------------------
# Items / Services Routes
# -----------------------------------------------------------------------------

@items_bp.route("", methods=["GET"])
@require_auth
def list_items():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()
    item_type = request.args.get("type", "").strip()  # 'item' or 'service'
    category_id = request.args.get("category_id", type=int)
    brand_id = request.args.get("brand_id", type=int)
    warehouse_id = request.args.get("warehouse_id", type=int)

    query = Item.query

    if search:
        query = query.filter(
            db.or_(
                Item.item_name.ilike(f"%{search}%"),
                Item.item_code.ilike(f"%{search}%"),
                Item.sku.ilike(f"%{search}%"),
                Item.barcode.ilike(f"%{search}%")
            )
        )
    if status:
        query = query.filter(Item.status == status)
    if item_type:
        query = query.filter(Item.type == item_type)
    if category_id:
        query = query.filter(Item.category_id == category_id)
    if brand_id:
        query = query.filter(Item.brand_id == brand_id)
    if warehouse_id:
        query = query.filter(Item.warehouse_id == warehouse_id)

    pagination = query.order_by(Item.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "items": [item.to_dict(include_relations=True) for item in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
        "per_page": per_page
    })


@items_bp.route("/<int:item_id>", methods=["GET"])
@require_auth
def get_item(item_id):
    item = Item.query.get_or_404(item_id)
    return jsonify(item.to_dict(include_relations=True))


@items_bp.route("", methods=["POST"])
@require_auth
def create_item():
    try:
        data = CreateItemSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # Check unique constraints
    if Item.query.filter_by(item_code=data.get("item_code")).first():
        return jsonify({"error": "Item code already exists"}), 400

    if data.get("barcode") and Item.query.filter_by(barcode=data.get("barcode")).first():
        return jsonify({"error": "Barcode already exists"}), 400

    item = Item(tenant_id=TenantContext.get(), **data)
    
    # Calculate profit margin if prices are provided
    item.calculate_profit_margin()
    
    db.session.add(item)
    db.session.commit()
    return jsonify({"message": "Item created successfully", "item": item.to_dict(include_relations=True)}), 201


@items_bp.route("/<int:item_id>", methods=["PUT"])
@require_auth
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    try:
        data = UpdateItemSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # Check uniqueness if code/barcode is being updated
    if data.get("item_code") and data.get("item_code") != item.item_code:
        if Item.query.filter_by(item_code=data.get("item_code")).first():
            return jsonify({"error": "Item code already exists"}), 400

    if data.get("barcode") and data.get("barcode") != item.barcode:
        if Item.query.filter_by(barcode=data.get("barcode")).first():
            return jsonify({"error": "Barcode already exists"}), 400

    for key, value in data.items():
        setattr(item, key, value)

    # Recalculate profit margin
    item.calculate_profit_margin()

    db.session.commit()
    return jsonify({"message": "Item updated successfully", "item": item.to_dict(include_relations=True)})


@items_bp.route("/<int:item_id>", methods=["DELETE"])
@require_auth
def delete_item(item_id):
    item = Item.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item deleted successfully"}), 200


@items_bp.route("/<int:item_id>/barcode", methods=["GET"])
@require_auth
def get_item_barcode(item_id):
    item = Item.query.get_or_404(item_id)
    return jsonify({
        "item_id": item.id,
        "item_code": item.item_code,
        "item_name": item.item_name,
        "barcode": item.barcode or item.item_code
    })


@items_bp.route("/bulk-import", methods=["POST"])
@require_auth
def bulk_import_items():
    if "file" not in request.files:
        return jsonify({"error": "CSV file is required"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "CSV file is required"}), 400

    try:
        content = file.stream.read().decode("utf-8-sig")
    except Exception:
        return jsonify({"error": "Unable to read uploaded file"}), 400

    reader = csv.DictReader(io.StringIO(content))
    imported = []
    errors = []

    tenant_id = TenantContext.get()

    for row_number, row in enumerate(reader, start=2):
        cleaned = {key.strip(): (value.strip() if isinstance(value, str) else value) for key, value in row.items()}
        
        # Simple lookup for related names to IDs
        # To make import user-friendly, we try to map category name, brand name, unit name to database records.
        if cleaned.get("category"):
            cat = Category.query.filter_by(name=cleaned.get("category")).first()
            if cat:
                cleaned["category_id"] = cat.id
        if cleaned.get("brand"):
            brand = Brand.query.filter_by(name=cleaned.get("brand")).first()
            if brand:
                cleaned["brand_id"] = brand.id
        if cleaned.get("unit"):
            unit = Unit.query.filter(
                db.or_(Unit.name == cleaned.get("unit"), Unit.short_name == cleaned.get("unit"))
            ).first()
            if unit:
                cleaned["unit_id"] = unit.id

        # Prices conversion
        try:
            if "sales_price" in cleaned:
                cleaned["sales_price"] = float(cleaned["sales_price"])
            if "purchase_price" in cleaned:
                cleaned["purchase_price"] = float(cleaned["purchase_price"]) if cleaned["purchase_price"] else 0.0
            if "price_expenses" in cleaned:
                cleaned["price_expenses"] = float(cleaned["price_expenses"]) if cleaned["price_expenses"] else 0.0
            if "opening_stock" in cleaned:
                cleaned["opening_stock"] = int(cleaned["opening_stock"]) if cleaned["opening_stock"] else 0
            if "alert_quantity" in cleaned:
                cleaned["alert_quantity"] = int(cleaned["alert_quantity"]) if cleaned["alert_quantity"] else 0
        except ValueError as val_err:
            errors.append({"row": row_number, "errors": {"prices": f"Invalid number format: {str(val_err)}"}})
            continue

        try:
            data = CreateItemSchema().load(cleaned)
        except ValidationError as err:
            errors.append({"row": row_number, "errors": err.messages})
            continue

        # Check unique constraint
        if Item.query.filter_by(item_code=data.get("item_code")).first():
            errors.append({"row": row_number, "errors": {"item_code": "Item code already exists"}})
            continue

        item = Item(tenant_id=tenant_id, **data)
        item.calculate_profit_margin()
        imported.append(item)

    if errors:
        return jsonify({"error": "Import failed", "details": errors}), 422

    db.session.add_all(imported)
    db.session.commit()
    return jsonify({"message": "Items imported successfully", "imported_count": len(imported)}), 201


# -----------------------------------------------------------------------------
# Categories Routes
# -----------------------------------------------------------------------------

@items_bp.route("/categories", methods=["GET"])
@require_auth
def list_categories():
    categories = Category.query.order_by(Category.name.asc()).all()
    return jsonify([c.to_dict() for c in categories])


@items_bp.route("/categories", methods=["POST"])
@require_auth
def create_category():
    try:
        data = CategorySchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if Category.query.filter_by(name=data.get("name")).first():
        return jsonify({"error": "Category name already exists"}), 400

    category = Category(tenant_id=TenantContext.get(), **data)
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@items_bp.route("/categories/<int:cat_id>", methods=["PUT"])
@require_auth
def update_category(cat_id):
    category = Category.query.get_or_404(cat_id)
    try:
        data = CategorySchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("name") and data.get("name") != category.name:
        if Category.query.filter_by(name=data.get("name")).first():
            return jsonify({"error": "Category name already exists"}), 400

    for key, value in data.items():
        setattr(category, key, value)
    db.session.commit()
    return jsonify(category.to_dict())


@items_bp.route("/categories/<int:cat_id>", methods=["DELETE"])
@require_auth
def delete_category(cat_id):
    category = Category.query.get_or_404(cat_id)
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted successfully"}), 200


# -----------------------------------------------------------------------------
# Brands Routes
# -----------------------------------------------------------------------------

@items_bp.route("/brands", methods=["GET"])
@require_auth
def list_brands():
    brands = Brand.query.order_by(Brand.name.asc()).all()
    return jsonify([b.to_dict() for b in brands])


@items_bp.route("/brands", methods=["POST"])
@require_auth
def create_brand():
    try:
        data = BrandSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if Brand.query.filter_by(name=data.get("name")).first():
        return jsonify({"error": "Brand name already exists"}), 400

    brand = Brand(tenant_id=TenantContext.get(), **data)
    db.session.add(brand)
    db.session.commit()
    return jsonify(brand.to_dict()), 201


@items_bp.route("/brands/<int:brand_id>", methods=["PUT"])
@require_auth
def update_brand(brand_id):
    brand = Brand.query.get_or_404(brand_id)
    try:
        data = BrandSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("name") and data.get("name") != brand.name:
        if Brand.query.filter_by(name=data.get("name")).first():
            return jsonify({"error": "Brand name already exists"}), 400

    for key, value in data.items():
        setattr(brand, key, value)
    db.session.commit()
    return jsonify(brand.to_dict())


@items_bp.route("/brands/<int:brand_id>", methods=["DELETE"])
@require_auth
def delete_brand(brand_id):
    brand = Brand.query.get_or_404(brand_id)
    db.session.delete(brand)
    db.session.commit()
    return jsonify({"message": "Brand deleted successfully"}), 200


# -----------------------------------------------------------------------------
# Units Routes
# -----------------------------------------------------------------------------

@items_bp.route("/units", methods=["GET"])
@require_auth
def list_units():
    units = Unit.query.order_by(Unit.name.asc()).all()
    return jsonify([u.to_dict() for u in units])


@items_bp.route("/units", methods=["POST"])
@require_auth
def create_unit():
    try:
        data = UnitSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if Unit.query.filter_by(name=data.get("name")).first():
        return jsonify({"error": "Unit name already exists"}), 400

    unit = Unit(tenant_id=TenantContext.get(), **data)
    db.session.add(unit)
    db.session.commit()
    return jsonify(unit.to_dict()), 201


@items_bp.route("/units/<int:unit_id>", methods=["PUT"])
@require_auth
def update_unit(unit_id):
    unit = Unit.query.get_or_404(unit_id)
    try:
        data = UnitSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("name") and data.get("name") != unit.name:
        if Unit.query.filter_by(name=data.get("name")).first():
            return jsonify({"error": "Unit name already exists"}), 400

    for key, value in data.items():
        setattr(unit, key, value)
    db.session.commit()
    return jsonify(unit.to_dict())


@items_bp.route("/units/<int:unit_id>", methods=["DELETE"])
@require_auth
def delete_unit(unit_id):
    unit = Unit.query.get_or_404(unit_id)
    db.session.delete(unit)
    db.session.commit()
    return jsonify({"message": "Unit deleted successfully"}), 200


# -----------------------------------------------------------------------------
# Taxes Routes
# -----------------------------------------------------------------------------

@items_bp.route("/taxes", methods=["GET"])
@require_auth
def list_taxes():
    taxes = Tax.query.order_by(Tax.name.asc()).all()
    return jsonify([t.to_dict() for t in taxes])


@items_bp.route("/taxes", methods=["POST"])
@require_auth
def create_tax():
    try:
        data = TaxSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if Tax.query.filter_by(name=data.get("name")).first():
        return jsonify({"error": "Tax name already exists"}), 400

    tax = Tax(tenant_id=TenantContext.get(), **data)
    db.session.add(tax)
    db.session.commit()
    return jsonify(tax.to_dict()), 201


@items_bp.route("/taxes/<int:tax_id>", methods=["PUT"])
@require_auth
def update_tax(tax_id):
    tax = Tax.query.get_or_404(tax_id)
    try:
        data = TaxSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("name") and data.get("name") != tax.name:
        if Tax.query.filter_by(name=data.get("name")).first():
            return jsonify({"error": "Tax name already exists"}), 400

    for key, value in data.items():
        setattr(tax, key, value)
    db.session.commit()
    return jsonify(tax.to_dict())


@items_bp.route("/taxes/<int:tax_id>", methods=["DELETE"])
@require_auth
def delete_tax(tax_id):
    tax = Tax.query.get_or_404(tax_id)
    db.session.delete(tax)
    db.session.commit()
    return jsonify({"message": "Tax deleted successfully"}), 200


# -----------------------------------------------------------------------------
# Item Groups Routes
# -----------------------------------------------------------------------------

@items_bp.route("/item-groups", methods=["GET"])
@require_auth
def list_item_groups():
    item_groups = ItemGroup.query.order_by(ItemGroup.name.asc()).all()
    return jsonify([ig.to_dict() for ig in item_groups])


@items_bp.route("/item-groups", methods=["POST"])
@require_auth
def create_item_group():
    try:
        data = ItemGroupSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if ItemGroup.query.filter_by(name=data.get("name")).first():
        return jsonify({"error": "ItemGroup name already exists"}), 400

    item_group = ItemGroup(tenant_id=TenantContext.get(), **data)
    db.session.add(item_group)
    db.session.commit()
    return jsonify(item_group.to_dict()), 201


@items_bp.route("/item-groups/<int:ig_id>", methods=["PUT"])
@require_auth
def update_item_group(ig_id):
    item_group = ItemGroup.query.get_or_404(ig_id)
    try:
        data = ItemGroupSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("name") and data.get("name") != item_group.name:
        if ItemGroup.query.filter_by(name=data.get("name")).first():
            return jsonify({"error": "ItemGroup name already exists"}), 400

    for key, value in data.items():
        setattr(item_group, key, value)
    db.session.commit()
    return jsonify(item_group.to_dict())


@items_bp.route("/item-groups/<int:ig_id>", methods=["DELETE"])
@require_auth
def delete_item_group(ig_id):
    item_group = ItemGroup.query.get_or_404(ig_id)
    db.session.delete(item_group)
    db.session.commit()
    return jsonify({"message": "ItemGroup deleted successfully"}), 200


# -----------------------------------------------------------------------------
# Variants Routes
# -----------------------------------------------------------------------------

@items_bp.route("/variants", methods=["GET"])
@require_auth
def list_variants():
    variants = Variant.query.order_by(Variant.name.asc()).all()
    return jsonify([v.to_dict() for v in variants])


@items_bp.route("/variants", methods=["POST"])
@require_auth
def create_variant():
    try:
        data = VariantSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if Variant.query.filter_by(name=data.get("name")).first():
        return jsonify({"error": "Variant name already exists"}), 400

    variant = Variant(tenant_id=TenantContext.get(), **data)
    db.session.add(variant)
    db.session.commit()
    return jsonify(variant.to_dict()), 201


@items_bp.route("/variants/<int:variant_id>", methods=["PUT"])
@require_auth
def update_variant(variant_id):
    variant = Variant.query.get_or_404(variant_id)
    try:
        data = VariantSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("name") and data.get("name") != variant.name:
        if Variant.query.filter_by(name=data.get("name")).first():
            return jsonify({"error": "Variant name already exists"}), 400

    for key, value in data.items():
        setattr(variant, key, value)
    db.session.commit()
    return jsonify(variant.to_dict())


@items_bp.route("/variants/<int:variant_id>", methods=["DELETE"])
@require_auth
def delete_variant(variant_id):
    variant = Variant.query.get_or_404(variant_id)
    db.session.delete(variant)
    db.session.commit()
    return jsonify({"message": "Variant deleted successfully"}), 200