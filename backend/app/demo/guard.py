"""
Global request guard for demo tenants.

IMPORTANT: this runs as a Flask `before_request` hook (registered in
app/__init__.py), which fires BEFORE the matched view function -- and
therefore BEFORE @require_auth (app/utils/decorators.py) has run. That means
g.current_user_id / TenantContext / BranchContext are NOT set yet when this
function runs. This hook independently decodes the JWT itself and never
relies on tenant_scope.py's auto-filter (which also no-ops until
TenantContext is set) -- every query here filters by tenant_id explicitly.

Expiry is enforced live: only the raw demo_expires_at timestamp travels in
the JWT claims (set in app/routes/auth.py::_issue_tokens()), never a cached
"is expired" boolean. This function recomputes the comparison against
datetime.utcnow() on every single request, so a demo tenant is locked out
the instant the 48 hours elapse -- independent of access-token TTL, refresh
tokens, or whether the `flask sweep-demo` cron has run yet (see sweep.py;
the sweep only handles cleanup, never enforcement).
"""
from datetime import datetime

from flask import abort, request
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from app.models import Invoice, Customer, Item, Purchase

# Blueprints never gated -- signing up / logging in must always work, even
# for an already-expired demo user hitting the app one more time.
PUBLIC_BLUEPRINTS = {"auth", "demo"}

# Entire blueprints a demo tenant can never touch, regardless of method.
# "settings" covers /settings/backup + /settings/restore too, since those
# routes live inside that same blueprint (see app/routes/settings.py).
DEMO_BLOCKED_BLUEPRINTS = {"settings", "users", "roles", "billing"}

# Scattered bulk-export endpoints don't share one blueprint (items.py's
# branch-mapping export, reports.py, etc.) -- caught by path instead.
# Extend this list if new export routes are added elsewhere.
DEMO_BLOCKED_PATH_SUBSTRINGS = ["/export"]

# Keyed by Flask endpoint name ("<blueprint_name>.<view_function_name>"),
# checked only on POST (the "create a new one" request for that resource).
DEMO_QUOTAS = {
    "invoices.create_invoice": (Invoice, 25),
    "customers.create_customer": (Customer, 30),
    "items.create_item": (Item, 50),
    "purchases.create_purchase": (Purchase, 25),
}


def demo_guard():
    if request.method == "OPTIONS":
        return  # CORS preflight -- never gated
    if request.blueprint in PUBLIC_BLUEPRINTS:
        return

    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return  # malformed/expired token -- let @require_auth on the view produce the real 401

    claims = get_jwt() or {}
    if not claims.get("is_demo"):
        return  # not a demo tenant's request -- no-op, real tenants are never touched

    tenant_id = claims.get("tenant_id")

    expires_at_raw = claims.get("demo_expires_at")
    if expires_at_raw:
        expires_at = datetime.fromisoformat(expires_at_raw)
        if expires_at < datetime.utcnow():
            abort(403, description="This demo has expired. Please sign up for a full account.")

    if request.method == "DELETE":
        abort(403, description="Deleting is disabled in demo mode. Sign up for a full account to unlock it.")

    if request.blueprint in DEMO_BLOCKED_BLUEPRINTS or any(
        s in request.path for s in DEMO_BLOCKED_PATH_SUBSTRINGS
    ):
        abort(403, description="This section is disabled in demo mode. Sign up for a full account to unlock it.")

    if request.method == "POST" and request.endpoint in DEMO_QUOTAS:
        model, limit = DEMO_QUOTAS[request.endpoint]
        count = model.query.filter_by(tenant_id=tenant_id).count()
        if count >= limit:
            resource = model.__tablename__
            abort(
                429,
                description=f"Demo limit reached ({limit} {resource}). Sign up for a full account for unlimited use.",
            )
