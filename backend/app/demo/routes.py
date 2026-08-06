"""
Public self-service demo signup.

POST /api/v1/demo/signup provisions a full throwaway tenant (see
provisioning.py) and hands back a `redirect_url` containing a short-lived
(60s), single-purpose "bootstrap" token -- NOT the real access/refresh pair.
The frontend's /auto-login page immediately exchanges that bootstrap token
for a real session via POST /api/v1/auth/demo-login (app/routes/auth.py).

This two-step exchange (rather than putting a long-lived, directly-usable
access token straight in the URL) keeps the bearer-equivalent credential
that ends up in server logs / browser history / Referer headers valid for
only 60 seconds. It is not fully single-use (this codebase has no JWT
blocklist/redis set up to revoke it after first use) -- the short expiry is
the primary mitigation; add a blocklist later if that gap matters for your
threat model.
"""
from datetime import timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token

from app.extensions import limiter
from app.models import User
from app.demo.provisioning import create_demo_tenant, seed_demo_data

demo_bp = Blueprint("demo", __name__, url_prefix="/api/v1/demo")


def verify_captcha(token: str) -> bool:
    """
    Stub -- always passes. Wire this to hCaptcha later:
    POST https://hcaptcha.com/siteverify with {secret, response: token},
    return response.json()["success"].
    """
    return True


@demo_bp.route("/signup", methods=["POST"])
@limiter.limit("5 per hour")
def signup():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    captcha_token = data.get("captcha_token", "")

    if not name or not email:
        return jsonify({"error": "Name and email are required"}), 422

    if not verify_captcha(captcha_token):
        return jsonify({"error": "Captcha verification failed"}), 422

    # Unscoped by design -- mirrors auth.py::signup()'s own duplicate-email
    # check exactly (email is unique per-tenant via a DB constraint, but
    # this check is intentionally global, same as the real signup flow).
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    tenant, branch, warehouse, admin = create_demo_tenant(email, name)
    seed_demo_data(tenant, branch, warehouse, admin)  # commits

    bootstrap_token = create_access_token(
        identity=str(admin.id),
        additional_claims={
            "tenant_id": tenant.id,
            "is_demo": True,
            "purpose": "demo-bootstrap",
        },
        expires_delta=timedelta(seconds=60),
    )

    frontend_origin = current_app.config["FRONTEND_ORIGIN"]
    return jsonify({
        "redirect_url": f"{frontend_origin}/auto-login?token={bootstrap_token}"
    }), 201
