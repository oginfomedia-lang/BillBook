from datetime import datetime, date
from decimal import Decimal
from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class ExpenseCategory(TenantScopedMixin, db.Model):
    __tablename__ = "expense_categories"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "name", name="uq_expense_category_tenant_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="active", nullable=False)  # 'active', 'inactive'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    expenses = db.relationship("Expense", back_populates="category", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Expense(TenantScopedMixin, db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    expense_date = db.Column(db.Date, default=date.today, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("expense_categories.id"), nullable=False)
    reference_no = db.Column(db.String(100), nullable=True)
    expense_for = db.Column(db.String(255), nullable=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    category = db.relationship("ExpenseCategory", back_populates="expenses", lazy="joined")
    account = db.relationship("Account", lazy="joined")
    created_by = db.relationship("User", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "expense_date": self.expense_date.isoformat() if self.expense_date else None,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "reference_no": self.reference_no,
            "expense_for": self.expense_for,
            "amount": float(self.amount),
            "account_id": self.account_id,
            "account_name": self.account.account_name if self.account else None,
            "notes": self.notes,
            "created_by_id": self.created_by_id,
            "created_by": self.created_by.name if self.created_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
