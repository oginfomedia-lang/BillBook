"""
Stock Transfer Model
====================
Tracks stock movements between warehouses.
"""

from datetime import datetime, date

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class StockTransfer(TenantScopedMixin, db.Model):
    __tablename__ = "stock_transfers"

    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    transfer_date = db.Column(db.Date, default=date.today, nullable=False)
    from_warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=False)
    to_warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    from_warehouse = db.relationship("Warehouse", foreign_keys=[from_warehouse_id], lazy="joined")
    to_warehouse = db.relationship("Warehouse", foreign_keys=[to_warehouse_id], lazy="joined")
    created_by = db.relationship("User", foreign_keys=[created_by_id], lazy="joined")
    items = db.relationship(
        "StockTransferItem",
        back_populates="transfer",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def to_dict(self, include_items: bool = False):
        item_list = self.items.all()
        total_qty = sum(float(i.quantity) for i in item_list)
        data = {
            "id": self.id,
            "transfer_date": self.transfer_date.isoformat() if self.transfer_date else None,
            "from_warehouse_id": self.from_warehouse_id,
            "from_warehouse": self.from_warehouse.name if self.from_warehouse else None,
            "to_warehouse_id": self.to_warehouse_id,
            "to_warehouse": self.to_warehouse.name if self.to_warehouse else None,
            "notes": self.notes,
            "created_by_id": self.created_by_id,
            "created_by": self.created_by.name if self.created_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "item_count": len(item_list),
            "total_quantity": total_qty,
        }
        if include_items:
            data["items"] = [i.to_dict() for i in item_list]
        return data


class StockTransferItem(db.Model):
    __tablename__ = "stock_transfer_items"

    id = db.Column(db.Integer, primary_key=True)
    transfer_id = db.Column(
        db.Integer, db.ForeignKey("stock_transfers.id", ondelete="CASCADE"), nullable=False
    )
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=0)

    # Relationships
    transfer = db.relationship("StockTransfer", back_populates="items")
    item = db.relationship("Item", foreign_keys=[item_id], lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "transfer_id": self.transfer_id,
            "item_id": self.item_id,
            "item_name": self.item.item_name if self.item else None,
            "item_code": self.item.item_code if self.item else None,
            "quantity": float(self.quantity),
        }
