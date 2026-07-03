from marshmallow import Schema, fields, validate


class CouponSchema(Schema):
    code = fields.String(validate=validate.Length(min=2, max=50), load_default=None, allow_none=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=150))
    description = fields.String(load_default=None, allow_none=True)
    occasion = fields.String(load_default=None, allow_none=True)
    type = fields.String(
        required=True,
        validate=validate.OneOf(["percentage", "fixed"])
    )
    value = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    expiry_date = fields.Date(load_default=None, allow_none=True)
    is_active = fields.Boolean(load_default=True)
    max_uses = fields.Integer(load_default=0, validate=validate.Range(min=0))
    customer_id = fields.Integer(load_default=None, allow_none=True)
    branch_id = fields.Integer(load_default=None, allow_none=True)


class CouponApplySchema(Schema):
    code = fields.String(required=True)
    customer_id = fields.Integer(required=True)
    subtotal = fields.Decimal(required=True, validate=validate.Range(min=0))