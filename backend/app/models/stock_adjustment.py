"""
Stock Adjustment Model
======================
Tracks manual inventory adjustments (additions / subtractions).
"""

import enum
from datetime import datetime, date

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class AdjustmentType(str, enum.Enum):
    ADDITION = "addition"
    SUBTRACTION = "subtraction"


class StockAdjustment(TenantScopedMixin, db.Model):
    __tablename__ = "stock_adjustments"

    id = db.Column(db.Integer, primary_key=True)
    reference_no = db.Column(db.String(100), nullable=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    adjustment_date = db.Column(db.Date, default=date.today, nullable=False)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=True)
    adjustment_type = db.Column(db.String(20), default="addition", nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    warehouse = db.relationship("Warehouse", foreign_keys=[warehouse_id], lazy="joined")
    created_by = db.relationship("User", foreign_keys=[created_by_id], lazy="joined")
    items = db.relationship(
        "StockAdjustmentItem",
        back_populates="adjustment",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def to_dict(self, include_items: bool = False):
        data = {
            "id": self.id,
            "reference_no": self.reference_no,
            "adjustment_date": self.adjustment_date.isoformat() if self.adjustment_date else None,
            "warehouse_id": self.warehouse_id,
            "warehouse": self.warehouse.to_dict() if self.warehouse else None,
            "adjustment_type": self.adjustment_type,
            "notes": self.notes,
            "created_by_id": self.created_by_id,
            "created_by": self.created_by.name if self.created_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "item_count": self.items.count(),
        }
        if include_items:
            data["items"] = [i.to_dict() for i in self.items.all()]
        return data


class StockAdjustmentItem(db.Model):
    __tablename__ = "stock_adjustment_items"

    id = db.Column(db.Integer, primary_key=True)
    adjustment_id = db.Column(
        db.Integer, db.ForeignKey("stock_adjustments.id", ondelete="CASCADE"), nullable=False
    )
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    unit_cost = db.Column(db.Numeric(10, 2), nullable=True)

    # Relationships
    adjustment = db.relationship("StockAdjustment", back_populates="items")
    item = db.relationship("Item", foreign_keys=[item_id], lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "adjustment_id": self.adjustment_id,
            "item_id": self.item_id,
            "item_name": self.item.item_name if self.item else None,
            "item_code": self.item.item_code if self.item else None,
            "quantity": float(self.quantity),
            "unit_cost": float(self.unit_cost) if self.unit_cost else None,
        }
