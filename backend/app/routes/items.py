import csv
import io
from decimal import Decimal
from flask import Blueprint, request, jsonify, g, current_app
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db  # ✅ ADD THIS IMPORT
from app.models import Item, Brand, Category, Unit, Tax, ItemGroup, Variant, Warehouse
from app.schemas.item_schemas import (
    ItemSchema, CreateItemSchema, UpdateItemSchema,
    BrandSchema, CategorySchema, UnitSchema, TaxSchema, ItemGroupSchema, VariantSchema
)
from app.branch_scope import BranchContext
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
    item_type = request.args.get("type", "").strip()
    category_id = request.args.get("category_id", type=int)
    brand_id = request.args.get("brand_id", type=int)
    warehouse_id = request.args.get("warehouse_id", type=int)
    branch_id = request.args.get("branch_id", type=int) or BranchContext.get()

    query = Item.query
    if branch_id:
        # Item has no branch_id of its own -- go through its warehouse.
        # Strict match only: an item with no warehouse, or a warehouse in a
        # different branch, does not belong to this branch's view.
        query = query.join(Warehouse, Item.warehouse_id == Warehouse.id).filter(
            Warehouse.branch_id == branch_id
        )

    if search:
        query = query.filter(
            db.or_(  # ✅ db is now imported
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
    item = Item.query.filter_by(id=item_id).first_or_404()
    return jsonify(item.to_dict(include_relations=True))


@items_bp.route("", methods=["POST"])
@require_auth
def create_item():
    try:
        data = CreateItemSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # Force the item into the currently active branch's warehouse -- this is
    # what makes "add item while Baramati is selected" actually count only
    # for Baramati (see app/branch_scope.py BranchContext).
    branch_id = BranchContext.get()
    if branch_id:
        if data.get("warehouse_id"):
            wh = Warehouse.query.filter_by(id=data["warehouse_id"], branch_id=branch_id).first()
            if not wh:
                return jsonify({"error": "Selected warehouse does not belong to the current branch"}), 422
        else:
            wh = Warehouse.query.filter_by(branch_id=branch_id).order_by(Warehouse.id.asc()).first()
            if not wh:
                return jsonify({"error": "This branch has no warehouse set up yet. Create one under Warehouses first."}), 422
            data["warehouse_id"] = wh.id
        data["branch_id"] = branch_id

    # Check unique constraints -- scoped to the active branch so the same
    # item_code/sku/barcode can exist independently in another branch.

    if Item.query.filter_by(item_code=data.get("item_code"), branch_id=branch_id).first():
        return jsonify({"error": "Item code already exists in this branch"}), 400

    if data.get("barcode") and Item.query.filter_by(barcode=data.get("barcode"), branch_id=branch_id).first():
        return jsonify({"error": "Barcode already exists in this branch"}), 400

    if data.get("sku") and Item.query.filter_by(sku=data.get("sku"), branch_id=branch_id).first():
        return jsonify({"error": "SKU already exists in this branch"}), 400

    item = Item(tenant_id=TenantContext.get(), **data)
    
    # Calculate profit margin if prices are provided
    item.calculate_profit_margin()
    
    db.session.add(item)
    db.session.commit()
    return jsonify({"message": "Item created successfully", "item": item.to_dict(include_relations=True)}), 201


@items_bp.route("/<int:item_id>", methods=["PUT"])
@require_auth
def update_item(item_id):
    item = Item.query.filter_by(id=item_id).first_or_404()
    
    try:
        data = request.get_json(force=True) or {}
        # ✅ Use partial=True to allow partial updates
        validated_data = UpdateItemSchema(partial=True).load(data)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # Check uniqueness if code/barcode is being updated -- scoped to this
    # item's own branch, same as create_item().
    if validated_data.get("item_code") and validated_data.get("item_code") != item.item_code:
        if Item.query.filter_by(item_code=validated_data.get("item_code"), branch_id=item.branch_id).first():
            return jsonify({"error": "Item code already exists in this branch"}), 400

    if validated_data.get("barcode") and validated_data.get("barcode") != item.barcode:
        if Item.query.filter_by(barcode=validated_data.get("barcode"), branch_id=item.branch_id).first():
            return jsonify({"error": "Barcode already exists in this branch"}), 400

    if validated_data.get("sku") and validated_data.get("sku") != item.sku:
        if Item.query.filter_by(sku=validated_data.get("sku"), branch_id=item.branch_id).first():
            return jsonify({"error": "SKU already exists in this branch"}), 400

    # ✅ Update only the fields that are sent
    for key, value in validated_data.items():
        setattr(item, key, value)

    # Keep branch_id in sync with warehouse_id -- item.branch_id is what
    # uniqueness checks and branch filtering key off, so it must never drift
    # from whichever warehouse (and therefore branch) the item is actually in.
    if "warehouse_id" in validated_data:
        wh = Warehouse.query.filter_by(id=validated_data["warehouse_id"]).first() if validated_data["warehouse_id"] else None
        item.branch_id = wh.branch_id if wh else None

    # Recalculate profit margin
    item.calculate_profit_margin()

    db.session.commit()
    return jsonify({"message": "Item updated successfully", "item": item.to_dict(include_relations=True)})


@items_bp.route("/<int:item_id>", methods=["DELETE"])
@require_auth
def delete_item(item_id):
    item = Item.query.filter_by(id=item_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item deleted successfully"}), 200


@items_bp.route("/<int:item_id>/barcode", methods=["GET"])
@require_auth
def get_item_barcode(item_id):
    item = Item.query.filter_by(id=item_id).first_or_404()
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
    rows = [
        {key.strip(): (value.strip() if isinstance(value, str) else value) for key, value in row.items()}
        for row in reader
    ]
    if not rows:
        return jsonify({"error": "CSV file has no data rows"}), 400

    tenant_id = TenantContext.get()

      # Fail fast if the active branch has no warehouse at all -- otherwise
    # every single row below would fail identically, one at a time.
    branch_id = BranchContext.get()
    if branch_id and not Warehouse.query.filter_by(branch_id=branch_id).first():
        return jsonify({"error": "This branch has no warehouse set up yet. Create one under Warehouses first."}), 422


    # --- Collect every unique Brand/Category name referenced anywhere in the file ---
    brand_names = {row["brand"] for row in rows if row.get("brand")}
    category_names = {row["category"] for row in rows if row.get("category")}

    # --- Look up the ones that already exist in THIS branch (a brand/category
    # with the same name in a different branch doesn't count -- see items.py
    # create_category/create_brand for the same branch-scoping rule) ---
    brand_map = (
        {b.name: b.id for b in Brand.query.filter(Brand.name.in_(brand_names), Brand.branch_id == branch_id).all()}
        if brand_names else {}
    )
    category_map = (
        {c.name: c.id for c in Category.query.filter(Category.name.in_(category_names), Category.branch_id == branch_id).all()}
        if category_names else {}
    )

    # --- Auto-create whichever names weren't found, so every row can resolve an ID ---
    brands_created = 0
    for name in brand_names - brand_map.keys():
        brand = Brand(tenant_id=tenant_id, branch_id=branch_id, name=name, status="active")
        db.session.add(brand)
        db.session.flush()  # assigns brand.id without committing yet
        brand_map[name] = brand.id
        brands_created += 1

    categories_created = 0
    for name in category_names - category_map.keys():
        category = Category(tenant_id=tenant_id, branch_id=branch_id, name=name, status="active")
        db.session.add(category)
        db.session.flush()
        category_map[name] = category.id
        categories_created += 1

    imported = []
    errors = []
    seen_codes = {}  # item_code -> row_number, catches duplicates within this file (DB check alone misses these since nothing is flushed until commit)
    seen_skus = {}  # sku -> row_number, same reasoning

    for row_number, cleaned in enumerate(rows, start=2):
        # Map the resolved Brand/Category IDs onto this row (existing or just auto-created above),
        # then drop the raw name columns — CreateItemSchema only knows about *_id fields and
        # rejects anything else as an "Unknown field" (marshmallow's default unknown=RAISE).
        category_name = cleaned.pop("category", None)
        if category_name:
            cleaned["category_id"] = category_map.get(category_name)
        brand_name = cleaned.pop("brand", None)
        if brand_name:
            cleaned["brand_id"] = brand_map.get(brand_name)
        unit_name = cleaned.pop("unit", None)
        if unit_name:
            unit = Unit.query.filter(
                db.or_(Unit.name == unit_name, Unit.short_name == unit_name)
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
        item_code = data.get("item_code")
        if item_code in seen_codes:
            errors.append({
                "row": row_number,
                "errors": {"item_code": f"Duplicate item code within this file (already used on row {seen_codes[item_code]})"},
            })
            continue
        if Item.query.filter_by(item_code=item_code, branch_id=branch_id).first():
            errors.append({"row": row_number, "errors": {"item_code": "Item code already exists in this branch"}})
            continue
        seen_codes[item_code] = row_number

        sku = data.get("sku")
        if sku:
            if sku in seen_skus:
                errors.append({
                    "row": row_number,
                    "errors": {"sku": f"Duplicate SKU within this file (already used on row {seen_skus[sku]})"},
                })
                continue
            if Item.query.filter_by(sku=sku, branch_id=branch_id).first():
                errors.append({"row": row_number, "errors": {"sku": "SKU already exists in this branch"}})
                continue
            seen_skus[sku] = row_number

        # Force the item into the active branch's warehouse -- same rule
        # create_item() already applies for the single "Add Item" form.
        if branch_id:
            if data.get("warehouse_id"):
                wh = Warehouse.query.filter_by(id=data["warehouse_id"], branch_id=branch_id).first()
                if not wh:
                    errors.append({"row": row_number, "errors": {"warehouse_id": "Does not belong to the current branch"}})
                    continue
            else:
                wh = Warehouse.query.filter_by(branch_id=branch_id).order_by(Warehouse.id.asc()).first()
                data["warehouse_id"] = wh.id
            data["branch_id"] = branch_id

        item = Item(tenant_id=tenant_id, **data)
        item.calculate_profit_margin()
        imported.append(item)

    if not imported:
        # Nothing to save — roll back so the auto-created Brands/Categories above
        # don't get silently committed behind a response that says "failed".
        db.session.rollback()
        return jsonify({
            "error": "Import failed: no items were created",
            "items_created": 0,
            "items_failed": len(errors),
            "brands_created": 0,
            "categories_created": 0,
            "errors": errors,
        }), 422

    db.session.add_all(imported)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Import failed: one or more item codes, SKUs, or barcodes already exist"}), 422

    return jsonify({
        "message": "Import completed",
        "items_created": len(imported),
        "items_failed": len(errors),
        "brands_created": brands_created,
        "categories_created": categories_created,
        "errors": errors,
    }), 201


@items_bp.route("/export-branch-mapping", methods=["GET"])
@require_auth
def export_branch_mapping():
    """
    CSV of every item with its current warehouse/branch, plus a blank
    target_warehouse_id column -- fill that in and re-upload via
    /import-branch-mapping to bulk-assign items to branches/warehouses.
    Deliberately ignores the active branch header -- this is a tenant-wide
    admin export, not a per-branch list.
    """
    tenant_id = TenantContext.get()
    rows = (
        db.session.query(Item.id, Item.item_code, Item.item_name, Warehouse.name, Warehouse.branch_id)
        .select_from(Item)
        .filter(Item.tenant_id == tenant_id)
        # tenant_id must live in the JOIN's ON clause, not a separate .filter() --
        # the global tenant-scoping hook (app/tenant_scope.py) adds a WHERE
        # clause for every tenant-scoped table it sees, which would silently
        # turn this LEFT JOIN into an INNER JOIN and drop every item with no
        # warehouse. skip_tenant_scope below turns that auto-injection off so
        # only the explicit conditions here apply.
        .outerjoin(Warehouse, (Item.warehouse_id == Warehouse.id) & (Warehouse.tenant_id == tenant_id))
        .order_by(Item.id.asc())
        .execution_options(skip_tenant_scope=True)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        ["item_id", "item_code", "item_name", "current_warehouse", "current_branch_id", "target_warehouse_id"]
    )
    for item_id, item_code, item_name, warehouse_name, branch_id in rows:
        writer.writerow([item_id, item_code, item_name, warehouse_name or "", branch_id or "", ""])

    response = current_app.response_class(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=items_branch_mapping.csv"
    return response


@items_bp.route("/import-branch-mapping", methods=["POST"])
@require_auth
def import_branch_mapping():
    """
    Bulk-assigns items.warehouse_id from a CSV produced (and hand-edited)
    from /export-branch-mapping. Rows with a blank target_warehouse_id are
    left untouched -- only fill in the ones you want to reassign.
    """
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
    rows = [
        {key.strip(): (value.strip() if isinstance(value, str) else value) for key, value in row.items()}
        for row in reader
    ]
    if not rows:
        return jsonify({"error": "CSV file has no data rows"}), 400

    tenant_id = TenantContext.get()
    warehouse_branch_map = {w.id: w.branch_id for w in Warehouse.query.filter_by(tenant_id=tenant_id).all()}

    updated = 0
    skipped = 0
    errors = []

    for row_number, row in enumerate(rows, start=2):
        item_id = row.get("item_id") or ""
        target = row.get("target_warehouse_id") or ""
        if not target or not item_id:
            skipped += 1
            continue

        try:
            item_id_int = int(item_id)
            target_int = int(target)
        except ValueError:
            errors.append({"row": row_number, "error": "item_id/target_warehouse_id must be numbers"})
            continue

        if target_int not in warehouse_branch_map:
            errors.append({"row": row_number, "error": f"warehouse {target_int} does not exist"})
            continue

        count = Item.query.filter_by(id=item_id_int, tenant_id=tenant_id).update({
            "warehouse_id": target_int,
            "branch_id": warehouse_branch_map[target_int],
        })
        if count:
            updated += 1
        else:
            errors.append({"row": row_number, "error": f"item {item_id_int} not found"})

    db.session.commit()
    return jsonify({
        "message": "Import completed",
        "items_updated": updated,
        "rows_skipped": skipped,
        "errors": errors,
    }), 200


# -----------------------------------------------------------------------------
# Categories Routes
# -----------------------------------------------------------------------------

@items_bp.route("/categories", methods=["GET"])
@require_auth
def list_categories():
    branch_id = request.args.get("branch_id", type=int) or BranchContext.get()
    query = Category.query
    if branch_id:
        query = query.filter_by(branch_id=branch_id)
    categories = query.order_by(Category.name.asc()).all()
    return jsonify([c.to_dict() for c in categories])


@items_bp.route("/categories", methods=["POST"])
@require_auth
def create_category():
    try:
        data = CategorySchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    branch_id = BranchContext.get()
    if Category.query.filter_by(name=data.get("name"), branch_id=branch_id).first():
        return jsonify({"error": "Category name already exists in this branch"}), 400

    category = Category(tenant_id=TenantContext.get(), branch_id=branch_id, **data)
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@items_bp.route("/categories/<int:cat_id>", methods=["PUT"])
@require_auth
def update_category(cat_id):
    category = Category.query.filter_by(id=cat_id).first_or_404()
    try:
        data = CategorySchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("name") and data.get("name") != category.name:
        if Category.query.filter_by(name=data.get("name"), branch_id=category.branch_id).first():
            return jsonify({"error": "Category name already exists in this branch"}), 400

    for key, value in data.items():
        setattr(category, key, value)
    db.session.commit()
    return jsonify(category.to_dict())


@items_bp.route("/categories/<int:cat_id>", methods=["DELETE"])
@require_auth
def delete_category(cat_id):
    category = Category.query.filter_by(id=cat_id).first_or_404()
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted successfully"}), 200


# -----------------------------------------------------------------------------
# Brands Routes
# -----------------------------------------------------------------------------

@items_bp.route("/brands", methods=["GET"])
@require_auth
def list_brands():
    branch_id = request.args.get("branch_id", type=int) or BranchContext.get()
    query = Brand.query
    if branch_id:
        query = query.filter_by(branch_id=branch_id)
    brands = query.order_by(Brand.name.asc()).all()
    return jsonify([b.to_dict() for b in brands])


@items_bp.route("/brands", methods=["POST"])
@require_auth
def create_brand():
    try:
        data = BrandSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    branch_id = BranchContext.get()
    if Brand.query.filter_by(name=data.get("name"), branch_id=branch_id).first():
        return jsonify({"error": "Brand name already exists in this branch"}), 400

    brand = Brand(tenant_id=TenantContext.get(), branch_id=branch_id, **data)
    db.session.add(brand)
    db.session.commit()
    return jsonify(brand.to_dict()), 201


@items_bp.route("/brands/<int:brand_id>", methods=["PUT"])
@require_auth
def update_brand(brand_id):
    brand = Brand.query.filter_by(id=brand_id).first_or_404()
    try:
        data = BrandSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("name") and data.get("name") != brand.name:
        if Brand.query.filter_by(name=data.get("name"), branch_id=brand.branch_id).first():
            return jsonify({"error": "Brand name already exists in this branch"}), 400

    for key, value in data.items():
        setattr(brand, key, value)
    db.session.commit()
    return jsonify(brand.to_dict())


@items_bp.route("/brands/<int:brand_id>", methods=["DELETE"])
@require_auth
def delete_brand(brand_id):
    brand = Brand.query.filter_by(id=brand_id).first_or_404()
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
    unit = Unit.query.filter_by(id=unit_id).first_or_404()
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
    unit = Unit.query.filter_by(id=unit_id).first_or_404()
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
    tax = Tax.query.filter_by(id=tax_id).first_or_404()
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
    tax = Tax.query.filter_by(id=tax_id).first_or_404()
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
    item_group = ItemGroup.query.filter_by(id=ig_id).first_or_404()
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
    item_group = ItemGroup.query.filter_by(id=ig_id).first_or_404()
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
    variant = Variant.query.filter_by(id=variant_id).first_or_404()
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
    variant = Variant.query.filter_by(id=variant_id).first_or_404()
    db.session.delete(variant)
    db.session.commit()
    return jsonify({"message": "Variant deleted successfully"}), 200