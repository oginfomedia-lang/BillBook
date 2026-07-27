import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))

# Fallback values used only for local development convenience. If either of
# these is still active when DEBUG is off, create_app() refuses to start —
# see assert_production_secrets_configured() below.
INSECURE_DEFAULT_SECRET_KEY = "dev-secret-change-me"
INSECURE_DEFAULT_JWT_SECRET_KEY = "dev-jwt-secret-change-me-please-32chars"


class Config:
    """
    Base configuration. Values are pulled from environment variables so the
    same code runs in dev / staging / prod with just a different .env file.
    """

    # --- Core Flask ---
    SECRET_KEY = os.environ.get("SECRET_KEY", INSECURE_DEFAULT_SECRET_KEY)

    # --- Database (MySQL via PyMySQL driver) ---
    DB_USER = os.environ.get("DB_USER", "billbook")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "billbook")
    DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
    DB_PORT = os.environ.get("DB_PORT", "3306")
    DB_NAME = os.environ.get("DB_NAME", "billbook")

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,  # avoids "MySQL server has gone away" on idle connections
        "pool_recycle": 280,
    }

    # --- JWT ---
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", INSECURE_DEFAULT_JWT_SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ["headers"]  # frontend sends Authorization: Bearer <token>

    # --- CORS ---
    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

    # --- Mail (used for forgot-password reset links) ---
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USE_SSL = os.environ.get("MAIL_USE_SSL", "false").lower() == "true"
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER", MAIL_USERNAME)

    # How long a password reset link stays valid.
    PASSWORD_RESET_TOKEN_EXPIRES_MINUTES = int(
        os.environ.get("PASSWORD_RESET_TOKEN_EXPIRES_MINUTES", "30")
    )


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def assert_production_secrets_configured(flask_config):
    """
    Refuses to run with the known, publicly-visible (committed to source
    control) dev secrets whenever DEBUG is off. Without this, anyone who
    reads this file can forge a valid JWT for any tenant (including
    is_super_admin) against a real deployment that forgot to set
    SECRET_KEY / JWT_SECRET_KEY.
    """
    if flask_config.get("DEBUG"):
        return
    insecure = []
    if flask_config.get("SECRET_KEY") == INSECURE_DEFAULT_SECRET_KEY:
        insecure.append("SECRET_KEY")
    if flask_config.get("JWT_SECRET_KEY") == INSECURE_DEFAULT_JWT_SECRET_KEY:
        insecure.append("JWT_SECRET_KEY")
    if insecure:
        raise RuntimeError(
            "Refusing to start: "
            + " and ".join(insecure)
            + " must be set via environment variable(s) to a real secret before running with DEBUG off. "
            "The default value(s) are public (committed in config.py) and allow forging valid auth tokens."
        )
