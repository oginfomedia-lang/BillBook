from marshmallow import Schema, fields, validate


class SignupSchema(Schema):
    """Tenant onboarding: creates a new Tenant + its first Tenant Admin user."""

    company_name = fields.String(required=True, validate=validate.Length(min=2, max=150))
    admin_name = fields.String(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    phone = fields.String(load_default=None)


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)


class RoleSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=2, max=80))
    description = fields.String(load_default=None, allow_none=True)
    permissions = fields.List(fields.String(), load_default=list)


class UserCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    role_id = fields.Integer(required=True)


class UserUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=2, max=120))
    role_id = fields.Integer(allow_none=True)
    is_active = fields.Boolean()


class CustomerSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=150))
    email = fields.Email(load_default=None, allow_none=True)
    phone = fields.String(load_default=None, allow_none=True)
    billing_address = fields.String(load_default=None, allow_none=True)
    gstin = fields.String(load_default=None, allow_none=True)
    branch_id = fields.Integer(load_default=None, allow_none=True)


class SupplierSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=150))
    mobile = fields.String(load_default=None, allow_none=True)
    email = fields.Email(load_default=None, allow_none=True)
    phone = fields.String(load_default=None, allow_none=True)
    gst_number = fields.String(load_default=None, allow_none=True)
    tax_number = fields.String(load_default=None, allow_none=True)
    opening_balance = fields.Decimal(load_default=0, validate=validate.Range(min=0))
    country = fields.String(load_default=None, allow_none=True)
    state = fields.String(load_default=None, allow_none=True)
    city = fields.String(load_default=None, allow_none=True)
    postcode = fields.String(load_default=None, allow_none=True)
    address = fields.String(load_default=None, allow_none=True)
    branch_id = fields.Integer(load_default=None, allow_none=True)


class ProductSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=150))
    sku = fields.String(load_default=None, allow_none=True)
    description = fields.String(load_default=None, allow_none=True)
    unit_price = fields.Decimal(required=True, validate=validate.Range(min=0))
    tax_rate = fields.Decimal(load_default=0, validate=validate.Range(min=0, max=100))
    stock_quantity = fields.Integer(load_default=0, validate=validate.Range(min=0))
    unit = fields.String(load_default="pcs")
    branch_id = fields.Integer(load_default=None, allow_none=True)


class InvoiceItemSchema(Schema):
    product_id = fields.Integer(load_default=None, allow_none=True)
    description = fields.String(required=True, validate=validate.Length(min=1, max=255))
    quantity = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    unit_price = fields.Decimal(required=True, validate=validate.Range(min=0))
    tax_rate = fields.Decimal(load_default=0, validate=validate.Range(min=0, max=100))


class InvoiceSchema(Schema):
    customer_id = fields.Integer(required=True)
    issue_date = fields.Date(load_default=None)
    due_date = fields.Date(load_default=None, allow_none=True)
    discount_type = fields.String(load_default="flat", validate=validate.OneOf(["flat", "percent"]))
    discount_value = fields.Decimal(load_default=0, validate=validate.Range(min=0))
    notes = fields.String(load_default=None, allow_none=True)
    status = fields.String(
        load_default="draft",
        validate=validate.OneOf(["draft", "pending", "paid", "overdue", "cancelled"]),
    )
    items = fields.List(fields.Nested(InvoiceItemSchema), required=True, validate=validate.Length(min=1))
    coupon_code = fields.String(load_default=None, allow_none=True)          # new
    coupon_discount = fields.Decimal(load_default=0, validate=validate.Range(min=0))  # new
    branch_id = fields.Integer(load_default=None, allow_none=True)          # new


# Quotation schemas are kept separate for clarity and reuse.
from app.schemas.quotation_schemas import QuotationSchema  # noqa: F401
