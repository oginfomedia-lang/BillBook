# pyrefly: ignore [missing-import]
from marshmallow import Schema, fields, validate, ValidationError, post_load


class BrandSchema(Schema):
    """Brand model schema"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(allow_none=True)
    status = fields.String(validate=validate.OneOf(['active', 'inactive']), allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class VariantSchema(Schema):
    """Variant model schema"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(allow_none=True)
    status = fields.String(validate=validate.OneOf(['active', 'inactive']), allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class CategorySchema(Schema):
    """Category model schema"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(allow_none=True)
    status = fields.String(validate=validate.OneOf(['active', 'inactive']), allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class UnitSchema(Schema):
    """Unit model schema"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    short_name = fields.String(allow_none=True, validate=validate.Length(max=20))
    status = fields.String(validate=validate.OneOf(['active', 'inactive']), allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class ItemGroupSchema(Schema):
    """ItemGroup model schema"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    status = fields.String(validate=validate.OneOf(['active', 'inactive']), allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class TaxSchema(Schema):
    """Tax model schema"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    tax_value = fields.Decimal(places=2, required=True)
    status = fields.String(validate=validate.OneOf(['active', 'inactive']), allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class WarehouseSchema(Schema):
    """Warehouse model schema"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    location = fields.String(allow_none=True)


class ItemSchema(Schema):
    """Item model schema"""
    id = fields.Integer(dump_only=True)
    item_code = fields.String(required=True, validate=validate.Length(min=1, max=50))
    item_name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    item_group_id = fields.Integer(allow_none=True)
    category_id = fields.Integer(allow_none=True)
    brand_id = fields.Integer(allow_none=True)
    unit_id = fields.Integer(allow_none=True)
    type = fields.String(validate=validate.OneOf(['item', 'service']), allow_none=True)
    sku = fields.String(allow_none=True, validate=validate.Length(max=100))
    hsn = fields.String(allow_none=True, validate=validate.Length(max=50))
    sac = fields.String(allow_none=True, validate=validate.Length(max=50))
    barcode = fields.String(allow_none=True, validate=validate.Length(max=255))
    description = fields.String(allow_none=True)
    image_url = fields.String(allow_none=True, validate=validate.Length(max=500))
    price_expenses = fields.Decimal(places=2, allow_none=True)
    purchase_price = fields.Decimal(places=2, allow_none=True)
    sales_price = fields.Decimal(places=2, required=True)
    mrp = fields.Decimal(places=2, allow_none=True)
    discount_type = fields.String(
        validate=validate.OneOf(['percentage', 'fixed']),
        allow_none=True
    )
    discount_value = fields.Decimal(places=2, allow_none=True)
    tax_id = fields.Integer(allow_none=True)
    tax_type = fields.String(
        validate=validate.OneOf(['inclusive', 'exclusive']),
        allow_none=True
    )
    opening_stock = fields.Integer(allow_none=True)
    alert_quantity = fields.Integer(allow_none=True)
    warehouse_id = fields.Integer(allow_none=True)
    profit_margin = fields.Decimal(places=2, dump_only=True)
    seller_points = fields.Integer(allow_none=True)
    status = fields.String(
        validate=validate.OneOf(['active', 'inactive', 'discontinued']),
        allow_none=True
    )
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    tenant_id = fields.Integer(dump_only=True)
    
    # Relations
    category = fields.Nested('CategorySchema', dump_only=True)
    brand = fields.Nested('BrandSchema', dump_only=True)
    unit = fields.Nested('UnitSchema', dump_only=True)
    tax = fields.Nested('TaxSchema', dump_only=True)
    warehouse = fields.Nested('WarehouseSchema', dump_only=True)
    item_group = fields.Nested('ItemGroupSchema', dump_only=True)


class CreateItemSchema(Schema):
    """Schema for creating item"""
    item_code = fields.String(required=True, validate=validate.Length(min=1, max=50))
    item_name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    item_group_id = fields.Integer(allow_none=True)
    category_id = fields.Integer(allow_none=True)
    brand_id = fields.Integer(allow_none=True)
    unit_id = fields.Integer(allow_none=True)
    type = fields.String(allow_none=True)
    sku = fields.String(allow_none=True)
    hsn = fields.String(allow_none=True)
    sac = fields.String(allow_none=True)
    barcode = fields.String(allow_none=True)
    description = fields.String(allow_none=True)
    image_url = fields.String(allow_none=True)
    price_expenses = fields.Decimal(places=2, allow_none=True)
    purchase_price = fields.Decimal(places=2, allow_none=True)
    sales_price = fields.Decimal(places=2, required=True)
    mrp = fields.Decimal(places=2, allow_none=True)
    discount_type = fields.String(allow_none=True)
    discount_value = fields.Decimal(places=2, allow_none=True)
    tax_id = fields.Integer(allow_none=True)
    tax_type = fields.String(allow_none=True)
    opening_stock = fields.Integer(allow_none=True)
    alert_quantity = fields.Integer(allow_none=True)
    warehouse_id = fields.Integer(allow_none=True)
    seller_points = fields.Integer(allow_none=True)
    status = fields.String(allow_none=True)


class UpdateItemSchema(Schema):
    """Schema for updating item"""
    item_name = fields.String(allow_none=True)
    item_group_id = fields.Integer(allow_none=True)
    category_id = fields.Integer(allow_none=True)
    brand_id = fields.Integer(allow_none=True)
    unit_id = fields.Integer(allow_none=True)
    type = fields.String(allow_none=True)
    sku = fields.String(allow_none=True)
    hsn = fields.String(allow_none=True)
    sac = fields.String(allow_none=True)
    barcode = fields.String(allow_none=True)
    description = fields.String(allow_none=True)
    image_url = fields.String(allow_none=True)
    price_expenses = fields.Decimal(places=2, allow_none=True)
    purchase_price = fields.Decimal(places=2, allow_none=True)
    sales_price = fields.Decimal(places=2, allow_none=True)
    mrp = fields.Decimal(places=2, allow_none=True)
    discount_type = fields.String(allow_none=True)
    discount_value = fields.Decimal(places=2, allow_none=True)
    tax_id = fields.Integer(allow_none=True)
    tax_type = fields.String(allow_none=True)
    opening_stock = fields.Integer(allow_none=True)
    alert_quantity = fields.Integer(allow_none=True)
    warehouse_id = fields.Integer(allow_none=True)
    seller_points = fields.Integer(allow_none=True)
    status = fields.String(allow_none=True)


class BulkImportItemSchema(Schema):
    """Schema for bulk importing items"""
    file = fields.Raw(required=True)


class ItemListSchema(Schema):
    """Schema for item list response"""
    items = fields.List(fields.Nested(ItemSchema))
    total = fields.Integer()
    pages = fields.Integer()
    page = fields.Integer()
    per_page = fields.Integer()
