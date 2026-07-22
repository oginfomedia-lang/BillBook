from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
import app.models  # noqa: F401  -- ensures models are registered before shell/migrate use

app = create_app()


@app.shell_context_processor
def make_shell_context():
    from app.models import Tenant, User, Customer, Invoice, InvoiceItem
    from app.models.item import Item

    return {
        "db": db,
        "Tenant": Tenant,
        "User": User,
        "Customer": Customer,
        "Item": Item,
        "Invoice": Invoice,
        "InvoiceItem": InvoiceItem,
    }


if __name__ == "__main__":
    app.run(debug=app.config.get("DEBUG", False), port=5000)
