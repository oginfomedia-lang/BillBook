"""
Seeds the plans catalog (Starter / Professional / Enterprise). Idempotent --
safe to run multiple times.

Run with:  python seed_plans.py
"""
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
from app.models import Plan

flask_app = create_app()

PLAN_ROWS = [
    dict(name="Starter", price=7999, amc_price=3999, max_branches=1, max_users=3),
    dict(name="Professional", price=14999, amc_price=5999, max_branches=3, max_users=10),
    # Nullable = unlimited (matches Enterprise's open-ended "₹24,999+" pricing).
    dict(name="Enterprise", price=24999, amc_price=7999, max_branches=None, max_users=None),
]

with flask_app.app_context():
    db.create_all()

    for row in PLAN_ROWS:
        if Plan.query.filter_by(name=row["name"]).first():
            print(f"Plan '{row['name']}' already exists, skipping.")
            continue
        db.session.add(Plan(**row))
        print(f"Created plan '{row['name']}'.")

    db.session.commit()
    print("Plan catalog seeded.")