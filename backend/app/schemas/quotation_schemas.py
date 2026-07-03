# app/schemas/quotation_schemas.py

from marshmallow import Schema, fields, validate


class QuotationItemSchema(Schema):
    product_id = fields.Integer(load_default=None, allow_none=True)
    description = fields.String(required=True, validate=validate.Length(min=1, max=255))
    quantity = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    unit_price = fields.Decimal(required=True, validate=validate.Range(min=0))
    tax_rate = fields.Decimal(load_default=0, validate=validate.Range(min=0, max=100))


class QuotationSchema(Schema):
    customer_id = fields.Integer(required=True)
    warehouse_id = fields.Integer(load_default=None, allow_none=True)
    issue_date = fields.Date(load_default=None)
    expiry_date = fields.Date(load_default=None, allow_none=True)
    discount_type = fields.String(load_default="flat", validate=validate.OneOf(["flat", "percent"]))
    discount_value = fields.Decimal(load_default=0, validate=validate.Range(min=0))
    notes = fields.String(load_default=None, allow_none=True)
    
    # 🔽 ADD THIS - Terms & Conditions field 🔽
    terms_conditions = fields.String(load_default=None, allow_none=True)
    
    status = fields.String(
        load_default="draft",
        validate=validate.OneOf(["draft", "sent", "accepted", "declined"]),
    )
    items = fields.List(fields.Nested(QuotationItemSchema), required=True, validate=validate.Length(min=1))