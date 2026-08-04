from datetime import datetime
from decimal import Decimal
from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class Item(TenantScopedMixin, db.Model):
    """Item/Product Model for BillBook"""
    __tablename__ = 'items'
    __table_args__ = (
        # Scoped per-branch (not just per-tenant) so the same item_code/sku/
        # barcode can exist independently in two branches -- each branch's
        # product catalog and stock are meant to be fully separate. NULL
        # branch_id (legacy/unassigned items) is not compared for equality
        # by MySQL's unique constraints, so those rows aren't cross-checked
        # against each other here.
        db.UniqueConstraint("tenant_id", "branch_id", "item_code", name="uq_item_tenant_branch_item_code"),
        db.UniqueConstraint("tenant_id", "branch_id", "sku", name="uq_item_tenant_branch_sku"),
        db.UniqueConstraint("tenant_id", "branch_id", "barcode", name="uq_item_tenant_branch_barcode"),
    )

    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    item_code = db.Column(db.String(50), nullable=False, index=True)
    item_name = db.Column(db.String(255), nullable=False, index=True)
    item_group_id = db.Column(db.Integer, db.ForeignKey('item_groups.id'), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brands.id'), nullable=True)
    unit_id = db.Column(db.Integer, db.ForeignKey('units.id'), nullable=True)
    type = db.Column(db.String(20), default='item')  # 'item' or 'service'
    
    # Codes and Identifiers
    sku = db.Column(db.String(100), nullable=True, index=True)
    hsn = db.Column(db.String(50), nullable=True)  # Harmonized System of Nomenclature
    sac = db.Column(db.String(50), nullable=True)  # Service Accounting Code
    barcode = db.Column(db.String(255), nullable=True)
    
    # Description and Image
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    
    # Pricing and Tax
    price_expenses = db.Column(db.Numeric(12, 2), default=0)  # Cost Price
    purchase_price = db.Column(db.Numeric(12, 2), default=0)
    sales_price = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    mrp = db.Column(db.Numeric(12, 2), nullable=True)  # Maximum Retail Price
    
    # Discount
    discount_type = db.Column(db.String(20), default='percentage')  # 'percentage', 'fixed'
    discount_value = db.Column(db.Numeric(10, 2), default=0)
    
    # Tax
    tax_id = db.Column(db.Integer, db.ForeignKey('taxes.id'), nullable=True)
    tax_type = db.Column(db.String(20), default='inclusive')  # 'inclusive', 'exclusive'
    
    # Stock and Warehouse
    warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=True)
    opening_stock = db.Column(db.Integer, default=0)
    alert_quantity = db.Column(db.Integer, default=0)
    
    # Additional Fields
    profit_margin = db.Column(db.Numeric(5, 2), nullable=True)  # Percentage
    seller_points = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='active')  # 'active', 'inactive', 'discontinued'
    
    # Relationships
    item_group = db.relationship('ItemGroup', backref='items', lazy='select')
    category = db.relationship('Category', backref='items', lazy='select')
    brand = db.relationship('Brand', backref='items', lazy='select')
    unit = db.relationship('Unit', backref='items', lazy='select')
    tax = db.relationship('Tax', backref='items', lazy='select')
    warehouse = db.relationship('Warehouse', backref='items', lazy='select')
    
    # Timestamps and Tenant
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def name(self):
        return self.item_name

    @name.setter
    def name(self, value):
        self.item_name = value

    @property
    def unit_price(self):
        return self.sales_price

    @unit_price.setter
    def unit_price(self, value):
        self.sales_price = value

    @property
    def stock_quantity(self):
        return self.opening_stock

    @stock_quantity.setter
    def stock_quantity(self, value):
        self.opening_stock = value

    def __repr__(self):
        return f'<Item {self.item_code}: {self.item_name}>'

    def calculate_profit_margin(self):
        """Calculate profit margin percentage"""
        if self.purchase_price and self.purchase_price > 0:
            margin = ((self.sales_price - self.purchase_price) / self.purchase_price) * 100
            self.profit_margin = Decimal(str(round(margin, 2)))
        return self.profit_margin

    def calculate_tax_amount(self, amount):
        """Calculate tax amount for given amount"""
        if not self.tax or not self.tax.tax_value:
            return Decimal('0')
        
        tax_percent = Decimal(str(self.tax.tax_value)) / 100
        if self.tax_type == 'inclusive':
            return (amount * tax_percent) / (1 + tax_percent)
        else:
            return amount * tax_percent

    def get_final_price(self):
        """Get final price after discount"""
        price = Decimal(str(self.sales_price))
        
        if self.discount_value > 0:
            if self.discount_type == 'percentage':
                discount_amount = (price * Decimal(str(self.discount_value))) / 100
            else:
                discount_amount = Decimal(str(self.discount_value))
            price = price - discount_amount
        
        return max(price, Decimal('0'))

    def to_dict(self, include_relations=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'branch_id': self.branch_id,
            'item_code': self.item_code,
            'item_name': self.item_name,
            'name': self.item_name,  # Product compatibility
            'sku': self.sku,
            'hsn': self.hsn,
            'sac': self.sac,
            'barcode': self.barcode,
            'description': self.description,
            'image_url': self.image_url,
            'price_expenses': float(self.price_expenses),
            'purchase_price': float(self.purchase_price),
            'sales_price': float(self.sales_price),
            'unit_price': float(self.sales_price),  # Product compatibility
            'mrp': float(self.mrp) if self.mrp else None,
            'discount_type': self.discount_type,
            'discount_value': float(self.discount_value),
            'tax_type': self.tax_type,
            'opening_stock': self.opening_stock,
            'stock_quantity': self.opening_stock,  # Product compatibility
            'alert_quantity': self.alert_quantity,
            'profit_margin': float(self.profit_margin) if self.profit_margin else None,
            'seller_points': self.seller_points,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'category_id': self.category_id,
            'brand_id': self.brand_id,
            'unit_id': self.unit_id,
            'tax_id': self.tax_id,
            'warehouse_id': self.warehouse_id,
            'item_group_id': self.item_group_id,
            'type': self.type,
        }
        
        if include_relations:
            data.update({
                'category': self.category.to_dict() if self.category else None,
                'brand': self.brand.to_dict() if self.brand else None,
                'unit': self.unit.to_dict() if self.unit else None,
                'tax': self.tax.to_dict() if self.tax else None,
                'warehouse': self.warehouse.to_dict() if self.warehouse else None,
                'item_group': self.item_group.to_dict() if self.item_group else None,
            })
        
        return data

