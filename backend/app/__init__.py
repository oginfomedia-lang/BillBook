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

    # CORS: only the configured frontend origin may call this API, and only
    # with the headers/methods actually needed (no wildcard "*").
    CORS(
        flask_app,
        resources={r"/api/*": {"origins": flask_app.config["FRONTEND_ORIGIN"]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # --- Register the tenant-scoping event hook ---
    # Imported for its side effect: registers the SQLAlchemy event listener.
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

    flask_app.register_blueprint(auth_bp)
    flask_app.register_blueprint(customers_bp)
    flask_app.register_blueprint(suppliers_bp)
    flask_app.register_blueprint(products_bp)
    flask_app.register_blueprint(invoices_bp)
    flask_app.register_blueprint(dashboard_bp)
    flask_app.register_blueprint(roles_bp)
    flask_app.register_blueprint(users_bp)
    flask_app.register_blueprint(advance_payments_bp)
    flask_app.register_blueprint(coupons_bp)
    flask_app.register_blueprint(branches_bp)


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
