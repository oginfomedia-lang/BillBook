# app/routes/quotation.py

from datetime import date

from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Customer, Product
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.schemas import QuotationSchema
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth

quotations_bp = Blueprint("quotations", __name__, url_prefix="/api/v1/quotations")


def _generate_quotation_number() -> str:
    last_number = (
        Quotation.query.filter(Quotation.tenant_id == TenantContext.get())
        .order_by(Quotation.id.desc())
        .with_entities(Quotation.quotation_number)
        .limit(1)
        .scalar()
    )
    if last_number and last_number.startswith("QUO-"):
        try:
            seq = int(last_number.split("-", 1)[1])
        except ValueError:
            seq = 0
    else:
        seq = 0
    return f"QUO-{seq + 1:04d}"


@quotations_bp.route("", methods=["GET"])
@require_auth
def list_quotations():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")
    warehouse_id = request.args.get("warehouse_id", type=int)
    search = request.args.get("search", "").strip()

    query = Quotation.query
    query = apply_branch_scope(query, Quotation)
    if status:
        query = query.filter(Quotation.status == status)
    if warehouse_id:
        query = query.filter(Quotation.warehouse_id == warehouse_id)
    if search:
        query = query.join(Quotation.customer).filter(
            db.or_(
                Quotation.quotation_number.ilike(f"%{search}%"),
            )
        )

    pagination = query.order_by(Quotation.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify(
        {
            "items": [quo.to_dict(include_items=False) for quo in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }
    )


@quotations_bp.route("/<int:quotation_id>", methods=["GET"])
@require_auth
def get_quotation(quotation_id):
    quotation = Quotation.query.get_or_404(quotation_id)
    return jsonify(quotation.to_dict())


@quotations_bp.route("", methods=["POST"])
@require_auth
def create_quotation():
    try:
        data = QuotationSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    items_data = data.pop("items")

    quotation = None
    for attempt in range(5):
        quotation_number = _generate_quotation_number()
        quotation = Quotation(
            tenant_id=TenantContext.get(),
            branch_id=BranchContext.get(),
            quotation_number=quotation_number,
            customer_id=data["customer_id"],
            warehouse_id=data.get("warehouse_id"),
            issue_date=data.get("issue_date") or date.today(),
            expiry_date=data.get("expiry_date"),
            discount_type=data.get("discount_type", "flat"),
            discount_value=data.get("discount_value", 0),
            notes=data.get("notes"),
            terms_conditions=data.get("terms_conditions"),  # 🔽 ADD THIS 🔽
            status=QuotationStatus(data.get("status", "draft")),
        )

        for item_data in items_data:
            quotation.items.append(
                QuotationItem(
                    product_id=item_data.get("product_id"),
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    tax_rate=item_data.get("tax_rate", 0),
                )
            )

        quotation.recalculate_totals()
        db.session.add(quotation)
        try:
            db.session.commit()
            return jsonify(quotation.to_dict()), 201
        except IntegrityError:
            db.session.rollback()
            continue

    return jsonify({"error": "Unable to generate a quotation number. Please retry."}), 500


@quotations_bp.route("/<int:quotation_id>", methods=["PUT"])
@require_auth
def update_quotation(quotation_id):
    quotation = Quotation.query.get_or_404(quotation_id)
    try:
        data = QuotationSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    items_data = data.pop("items", None)

    # 🔽 ADD terms_conditions to the update list 🔽
    for key in ("customer_id", "warehouse_id", "issue_date", "expiry_date", 
                "discount_type", "discount_value", "notes", "terms_conditions"):
        if key in data:
            setattr(quotation, key, data[key])
    if "status" in data:
        quotation.status = QuotationStatus(data["status"])

    if items_data is not None:
        quotation.items.clear()
        for item_data in items_data:
            quotation.items.append(
                QuotationItem(
                    product_id=item_data.get("product_id"),
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    tax_rate=item_data.get("tax_rate", 0),
                )
            )

    quotation.recalculate_totals()
    db.session.commit()
    return jsonify(quotation.to_dict())


@quotations_bp.route("/<int:quotation_id>", methods=["DELETE"])
@require_auth
def delete_quotation(quotation_id):
    quotation = Quotation.query.get_or_404(quotation_id)
    db.session.delete(quotation)
    db.session.commit()
    return "", 204


# 🔽 ADD THIS - Get default terms endpoint 🔽
@quotations_bp.route("/default-terms", methods=["GET"])
@require_auth
def get_default_terms():
    """Get default terms and conditions template"""
    from app.services.terms_service import TermsService
    from app.models import Tenant
    
    tenant = Tenant.query.get(TenantContext.get())
    company_name = tenant.company_name if tenant else "Our Company"
    
    terms = TermsService.get_default_terms(company_name)
    return jsonify({
        "terms": terms,
        "company_name": company_name
    })


# 🔽 ADD THIS - Get clothing store terms endpoint 🔽
@quotations_bp.route("/clothing-terms", methods=["GET"])
@require_auth
def get_clothing_terms():
    """Get clothing store specific terms"""
    from app.services.terms_service import TermsService
    from app.models import Tenant
    
    tenant = Tenant.query.get(TenantContext.get())
    company_name = tenant.company_name if tenant else "FashionHub"
    
    terms = TermsService.get_clothing_store_terms(company_name)
    return jsonify({
        "terms": terms,
        "company_name": company_name
    })