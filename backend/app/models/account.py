"""
Accounts Module Models
======================
Implements Chart of Accounts with parent-child hierarchy,
Money Transfers between accounts, and Deposits.

Tables:
  accounts          – account headers (parent-child tree)
  money_transfers   – transfer entries (debit one account, credit another)
  deposits          – deposit entries (add money to accounts)
"""

from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


def _money(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ---------------------------------------------------------------------------
# Account
# ---------------------------------------------------------------------------

class Account(TenantScopedMixin, db.Model):
    __tablename__ = "accounts"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "account_code", name="uq_account_tenant_code"),
    )

    id = db.Column(db.Integer, primary_key=True)
    account_code = db.Column(db.String(20), nullable=False)          # e.g. AC0001
    account_name = db.Column(db.String(255), nullable=False)
    parent_id = db.Column(
        db.Integer, db.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    opening_balance = db.Column(db.Numeric(14, 2), default=0)
    current_balance = db.Column(db.Numeric(14, 2), default=0)
    note = db.Column(db.Text, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Self-referential relationship
    parent = db.relationship("Account", remote_side=[id], backref=db.backref("children", lazy="dynamic"))
    creator = db.relationship("User", foreign_keys=[created_by])

    # Transfers (debit = money goes out, credit = money comes in)
    debit_transfers = db.relationship(
        "MoneyTransfer", foreign_keys="MoneyTransfer.debit_account_id",
        backref=db.backref("debit_account", lazy="select"), lazy="dynamic"
    )
    credit_transfers = db.relationship(
        "MoneyTransfer", foreign_keys="MoneyTransfer.credit_account_id",
        backref=db.backref("credit_account", lazy="select"), lazy="dynamic"
    )

    # Deposits
    debit_deposits = db.relationship(
        "Deposit", foreign_keys="Deposit.debit_account_id",
        backref=db.backref("debit_account", lazy="select"), lazy="dynamic"
    )
    credit_deposits = db.relationship(
        "Deposit", foreign_keys="Deposit.credit_account_id",
        backref=db.backref("credit_account", lazy="select"), lazy="dynamic"
    )

    def to_dict(self, include_children: bool = False):
        data = {
            "id": self.id,
            "account_code": self.account_code,
            "account_name": self.account_name,
            "parent_id": self.parent_id,
            "parent_account_name": self.parent.account_name if self.parent else None,
            "opening_balance": float(self.opening_balance or 0),
            "current_balance": float(self.current_balance or 0),
            "note": self.note,
            "created_by": self.created_by,
            "creator_name": self.creator.name if self.creator else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_children:
            data["children"] = [c.to_dict() for c in self.children]
        return data


# ---------------------------------------------------------------------------
# MoneyTransfer
# ---------------------------------------------------------------------------

class MoneyTransfer(TenantScopedMixin, db.Model):
    __tablename__ = "money_transfers"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "transfer_code", name="uq_transfer_tenant_code"),
    )

    id = db.Column(db.Integer, primary_key=True)
    transfer_code = db.Column(db.String(20), nullable=False)      # e.g. TR-0001

    debit_account_id = db.Column(
        db.Integer, db.ForeignKey("accounts.id"), nullable=False
    )
    credit_account_id = db.Column(
        db.Integer, db.ForeignKey("accounts.id"), nullable=False
    )

    transfer_date = db.Column(db.Date, default=date.today)
    reference_no = db.Column(db.String(100), nullable=True)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    note = db.Column(db.Text, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship("User", foreign_keys=[created_by])

    def to_dict(self):
        return {
            "id": self.id,
            "transfer_code": self.transfer_code,
            "debit_account_id": self.debit_account_id,
            "debit_account_name": self.debit_account.account_name if self.debit_account else None,
            "credit_account_id": self.credit_account_id,
            "credit_account_name": self.credit_account.account_name if self.credit_account else None,
            "transfer_date": self.transfer_date.isoformat() if self.transfer_date else None,
            "reference_no": self.reference_no,
            "amount": float(self.amount or 0),
            "note": self.note,
            "created_by": self.created_by,
            "creator_name": self.creator.name if self.creator else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# Deposit
# ---------------------------------------------------------------------------

class Deposit(TenantScopedMixin, db.Model):
    __tablename__ = "deposits"

    id = db.Column(db.Integer, primary_key=True)

    debit_account_id = db.Column(
        db.Integer, db.ForeignKey("accounts.id"), nullable=True
    )
    credit_account_id = db.Column(
        db.Integer, db.ForeignKey("accounts.id"), nullable=True
    )

    deposit_date = db.Column(db.Date, default=date.today)
    reference_no = db.Column(db.String(100), nullable=True)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    note = db.Column(db.Text, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship("User", foreign_keys=[created_by])

    def to_dict(self):
        return {
            "id": self.id,
            "debit_account_id": self.debit_account_id,
            "debit_account_name": self.debit_account.account_name if self.debit_account else None,
            "credit_account_id": self.credit_account_id,
            "credit_account_name": self.credit_account.account_name if self.credit_account else None,
            "deposit_date": self.deposit_date.isoformat() if self.deposit_date else None,
            "reference_no": self.reference_no,
            "amount": float(self.amount or 0),
            "note": self.note,
            "created_by": self.created_by,
            "creator_name": self.creator.name if self.creator else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
