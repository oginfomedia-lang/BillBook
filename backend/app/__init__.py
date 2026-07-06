import os

from flask import Flask, jsonify
from flask_cors import CORS

from config import config_by_name
from app.extensions import db, migrate, jwt


def create_app(config_name: str | None = None) -> Flask:
    config_name = config_name or os.environ.get("FLASK_ENV", "development")
    flask_app = Flask(__name__)
    flask_app.config.from_object(config_by_name[config_name])

    # --- Extensions ---
    db.init_app(flask_app)
    migrate.init_app(flask_app, db)
    jwt.init_app(flask_app)

    # ✅ CORS Configuration - Proper Setup (No Conflicts)
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    CORS(
        flask_app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "Accept"],
        expose_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        max_age=86400,
    )

    # --- Register the tenant-scoping event hook ---
    import app.tenant_scope  # noqa: F401

    # --- Models (so Flask-Migrate can detect them) ---
    import app.models  # noqa: F401

    # --- Blueprints ---
    from app.routes.auth import auth_bp
    from app.routes.customers import customers_bp
    from app.routes.suppliers import suppliers_bp
    from app.routes.products import products_bp
    from app.routes.invoices import invoices_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.roles import roles_bp
    from app.routes.users import users_bp
    from app.routes.advance_payments import advance_payments_bp
    from app.routes.coupons import coupons_bp
    from app.routes.branches import branches_bp
    from app.routes.quotations import quotations_bp
    from app.routes.warehouses import warehouses_bp
    from app.routes.purchases import purchases_bp
    from app.routes.purchase_returns import purchase_returns_bp

    # Register with url_prefix to ensure consistency
    flask_app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    flask_app.register_blueprint(customers_bp, url_prefix='/api/v1/customers')
    flask_app.register_blueprint(suppliers_bp, url_prefix='/api/v1/suppliers')
    flask_app.register_blueprint(products_bp, url_prefix='/api/v1/products')
    flask_app.register_blueprint(invoices_bp, url_prefix='/api/v1/invoices')
    flask_app.register_blueprint(dashboard_bp, url_prefix='/api/v1/dashboard')
    flask_app.register_blueprint(roles_bp, url_prefix='/api/v1/roles')
    flask_app.register_blueprint(users_bp, url_prefix='/api/v1/users')
    flask_app.register_blueprint(advance_payments_bp, url_prefix='/api/v1/advance-payments')
    flask_app.register_blueprint(coupons_bp, url_prefix='/api/v1/coupons')
    flask_app.register_blueprint(branches_bp, url_prefix='/api/v1/branches')
    flask_app.register_blueprint(quotations_bp, url_prefix='/api/v1/quotations')
    flask_app.register_blueprint(warehouses_bp, url_prefix='/api/v1/warehouses')
    flask_app.register_blueprint(purchases_bp, url_prefix='/api/v1/purchases')
    flask_app.register_blueprint(purchase_returns_bp, url_prefix='/api/v1/purchase-returns')

    @flask_app.route("/api/v1/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"})

    @flask_app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @flask_app.errorhandler(500)
    def server_error(e):
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

    return flask_app