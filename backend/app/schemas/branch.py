from marshmallow import Schema, fields, validate

class BranchSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=150))
    code = fields.String(required=True, validate=validate.Length(min=1, max=50))
    address = fields.String(load_default=None, allow_none=True)
    phone = fields.String(load_default=None, allow_none=True)
    email = fields.Email(load_default=None, allow_none=True)
    is_active = fields.Boolean(load_default=True)