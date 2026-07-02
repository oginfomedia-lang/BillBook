"""
Marshmallow schemas for the Purchase module.
"""

from marshmallow import Schema, fields, validate


class PurchaseItemSchema(Schema):
    id = fields.Integer(load_default=None, allow_none=True)
    product_id = fields.Integer(load_default=None, allow_none=True)
    description = fields.String(required=True, validate=validate.Length(min=1, max=255))
    quantity = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    purchase_price = fields.Decimal(required=True, validate=validate.Range(min=0))
    discount = fields.Decimal(load_default=0, validate=validate.Range(min=0))
    tax_amount = fields.Decimal(load_default=0, validate=validate.Range(min=0))


class PurchasePaymentSchema(Schema):
    amount = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    payment_type = fields.String(
        load_default="cash",
        validate=validate.OneOf(["cash", "bank", "upi", "cheque", "card", "other"]),
    )
    account = fields.String(load_default=None, allow_none=True)
    payment_note = fields.String(load_default=None, allow_none=True)
    payment_date = fields.Date(load_default=None, allow_none=True)


class PurchaseSchema(Schema):
    supplier_id = fields.Integer(required=True)
    warehouse_id = fields.Integer(load_default=None, allow_none=True)
    purchase_date = fields.Date(load_default=None, allow_none=True)
    reference_no = fields.String(load_default=None, allow_none=True)

    other_charges = fields.Decimal(load_default=0, validate=validate.Range(min=0))
    other_charges_type = fields.String(load_default=None, allow_none=True)

    discount_on_all = fields.Decimal(load_default=0, validate=validate.Range(min=0))
    discount_type = fields.String(
        load_default="flat", validate=validate.OneOf(["flat", "percent"])
    )

    note = fields.String(load_default=None, allow_none=True)

    status = fields.String(
        load_default="received",
        validate=validate.OneOf(["draft", "ordered", "received", "partial", "cancelled"]),
    )

    items = fields.List(
        fields.Nested(PurchaseItemSchema), required=True, validate=validate.Length(min=1)
    )

    # Optional inline payment on create
    payment = fields.Nested(PurchasePaymentSchema, load_default=None, allow_none=True)


class PurchaseReturnItemSchema(Schema):
    product_id = fields.Integer(load_default=None, allow_none=True)
    description = fields.String(required=True, validate=validate.Length(min=1, max=255))
    quantity = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    purchase_price = fields.Decimal(required=True, validate=validate.Range(min=0))
    tax_amount = fields.Decimal(load_default=0, validate=validate.Range(min=0))


class PurchaseReturnSchema(Schema):
    purchase_id = fields.Integer(required=True)
    supplier_id = fields.Integer(load_default=None, allow_none=True)
    warehouse_id = fields.Integer(load_default=None, allow_none=True)
    return_date = fields.Date(load_default=None, allow_none=True)
    reference_no = fields.String(load_default=None, allow_none=True)
    note = fields.String(load_default=None, allow_none=True)
    status = fields.String(
        load_default="completed",
        validate=validate.OneOf(["pending", "approved", "completed", "cancelled"]),
    )
    items = fields.List(
        fields.Nested(PurchaseReturnItemSchema), required=True, validate=validate.Length(min=1)
    )
