from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()
# In-memory storage by default -- fine for a single dev/small-deployment
# process. A multi-worker production deployment (gunicorn -w N) needs a
# shared backend (e.g. Redis: storage_uri="redis://...") since in-memory
# counters aren't shared across worker processes.
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per minute"])
