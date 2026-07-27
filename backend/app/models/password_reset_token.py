from datetime import datetime

from app.extensions import db


class PasswordResetToken(db.Model):
    """
    A one-time-use, short-lived token issued for the "forgot password" flow.

    Deliberately NOT TenantScopedMixin: lookups happen before login (no JWT,
    so no TenantContext is set yet) -- the raw token itself is the only thing
    identifying which user it belongs to. Only token_hash is stored (never the
    raw token), same principle as User.password_hash, so a DB leak alone can't
    be used to reset accounts.
    """

    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = db.Column(db.String(255), nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")

    @property
    def is_valid(self) -> bool:
        return self.used_at is None and self.expires_at > datetime.utcnow()
