from marshmallow import Schema, fields, validate


class AdvancePaymentSchema(Schema):
    customer_id = fields.Integer(required=True)
    amount = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    payment_date = fields.Date(load_default=None)
    payment_type = fields.String(
        required=True,
        validate=validate.OneOf(["cash", "bank", "cheque", "online"])
    )
    reference = fields.String(load_default=None, allow_none=True)
    notes = fields.String(load_default=None, allow_none=True)
    status = fields.String(
        load_default="pending",
        validate=validate.OneOf(["pending", "applied", "cancelled"])
    )
    branch_id = fields.Integer(load_default=None, allow_none=True)