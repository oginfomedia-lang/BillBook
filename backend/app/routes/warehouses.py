# app/routes/warehouses.py

from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Warehouse
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth, require_permission

warehouses_bp = Blueprint("warehouses", __name__, url_prefix="/api/v1/warehouses")


@warehouses_bp.route("", methods=["GET"])
@require_auth
@require_permission("warehouses.view")
def list_warehouses():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()

    query = Warehouse.query.filter_by(tenant_id=TenantContext.get())
    query = apply_branch_scope(query, Warehouse)
    if search:
        query = query.filter(Warehouse.name.ilike(f"%{search}%"))

    pagination = query.order_by(Warehouse.name.asc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify(
        {
            "items": [warehouse.to_dict() for warehouse in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }
    )


# ✅ ADD THIS - CREATE warehouse (POST)
@warehouses_bp.route("", methods=["POST"])
@require_auth
@require_permission("warehouses.create")
def create_warehouse():
    data = request.get_json(force=True) or {}
    
    if not data.get("name"):
        return jsonify({"error": "Warehouse name is required"}), 400
    
    warehouse = Warehouse(
        tenant_id=TenantContext.get(),
        branch_id=BranchContext.get(),
        name=data["name"],
        location=data.get("location", ""),
    )
    
    db.session.add(warehouse)
    db.session.commit()
    
    return jsonify(warehouse.to_dict()), 201


@warehouses_bp.route("/<int:warehouse_id>", methods=["GET"])
@require_auth
@require_permission("warehouses.view")
def get_warehouse(warehouse_id):
    warehouse = Warehouse.query.filter_by(
        id=warehouse_id,
        tenant_id=TenantContext.get()
    ).first_or_404()
    return jsonify(warehouse.to_dict())


# ✅ ADD THIS - UPDATE warehouse (PUT)
@warehouses_bp.route("/<int:warehouse_id>", methods=["PUT"])
@require_auth
@require_permission("warehouses.edit")
def update_warehouse(warehouse_id):
    warehouse = Warehouse.query.filter_by(
        id=warehouse_id,
        tenant_id=TenantContext.get()
    ).first_or_404()
    
    data = request.get_json(force=True) or {}
    
    if "name" in data:
        warehouse.name = data["name"]
    if "location" in data:
        warehouse.location = data["location"]
    
    db.session.commit()
    return jsonify(warehouse.to_dict())


# ✅ ADD THIS - DELETE warehouse (DELETE)
@warehouses_bp.route("/<int:warehouse_id>", methods=["DELETE"])
@require_auth
@require_permission("warehouses.delete")
def delete_warehouse(warehouse_id):
    warehouse = Warehouse.query.filter_by(
        id=warehouse_id,
        tenant_id=TenantContext.get()
    ).first_or_404()
    
    db.session.delete(warehouse)
    db.session.commit()
    return "", 204