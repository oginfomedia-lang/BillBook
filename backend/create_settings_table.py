import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.extensions import db
import app.models

app = create_app()
with app.app_context():
    print("Ensuring all tables exist, including new tenant_settings...")
    db.create_all()
    print("Done!")
