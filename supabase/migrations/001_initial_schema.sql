-- =============================================
-- DISME EX - Initial Schema Migration
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- PRODUCTS (Inventory)
-- =============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sku TEXT UNIQUE NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pieza',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  avg_cost NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- SUPPLIERS
-- =============================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- CUSTOMERS
-- =============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INVENTORY TRANSACTIONS (Entries & Exits)
-- =============================================
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  lot_number TEXT DEFAULT '',
  expiration_date DATE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update product stock and avg_cost on transaction
CREATE OR REPLACE FUNCTION handle_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'entry' THEN
    -- Update average cost: weighted average
    UPDATE products
    SET
      current_stock = current_stock + NEW.quantity,
      avg_cost = CASE
        WHEN (current_stock + NEW.quantity) > 0
        THEN ((current_stock * avg_cost) + (NEW.quantity * NEW.unit_cost)) / (current_stock + NEW.quantity)
        ELSE NEW.unit_cost
      END
    WHERE id = NEW.product_id;
  ELSIF NEW.type = 'exit' THEN
    UPDATE products
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_inventory_transaction
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION handle_inventory_transaction();

-- =============================================
-- ORDERS (Customer purchase orders)
-- =============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ORDER ITEMS
-- =============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Auto-update order total
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET total = COALESCE((SELECT SUM(subtotal) FROM order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)), 0)
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_order_item_change
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_order_total();

-- =============================================
-- PURCHASE ORDERS (Orders to suppliers)
-- =============================================
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
  total NUMERIC NOT NULL DEFAULT 0,
  expected_date DATE,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PURCHASE ORDER ITEMS
-- =============================================
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- Auto-update purchase order total
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_orders
  SET total = COALESCE((SELECT SUM(subtotal) FROM purchase_order_items WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)), 0)
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_purchase_order_item_change
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

-- =============================================
-- PAYMENTS
-- =============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'card', 'transfer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ROUTES
-- =============================================
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  driver_name TEXT DEFAULT '',
  vehicle TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_point TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ROUTE STOPS
-- =============================================
CREATE TABLE route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  stop_order INTEGER NOT NULL DEFAULT 0,
  lat NUMERIC NOT NULL DEFAULT 0,
  lng NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'delivered')),
  notes TEXT DEFAULT ''
);

-- =============================================
-- COMMUNICATION TEMPLATES
-- =============================================
CREATE TABLE communication_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase_request', 'order_update', 'payment_reminder')),
  subject TEXT DEFAULT '',
  body TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles: read all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: update own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Products: all authenticated users can CRUD
CREATE POLICY "Products: full access" ON products FOR ALL USING (true);

-- Suppliers: all authenticated users can CRUD
CREATE POLICY "Suppliers: full access" ON suppliers FOR ALL USING (true);

-- Customers: all authenticated users can CRUD
CREATE POLICY "Customers: full access" ON customers FOR ALL USING (true);

-- Inventory transactions: all authenticated users can CRUD
CREATE POLICY "Inventory: full access" ON inventory_transactions FOR ALL USING (true);

-- Orders: all authenticated users can CRUD
CREATE POLICY "Orders: full access" ON orders FOR ALL USING (true);
CREATE POLICY "Order items: full access" ON order_items FOR ALL USING (true);

-- Purchase orders: all authenticated users can CRUD
CREATE POLICY "Purchase orders: full access" ON purchase_orders FOR ALL USING (true);
CREATE POLICY "PO items: full access" ON purchase_order_items FOR ALL USING (true);

-- Payments: all authenticated users can CRUD
CREATE POLICY "Payments: full access" ON payments FOR ALL USING (true);

-- Routes: all authenticated users can CRUD
CREATE POLICY "Routes: full access" ON routes FOR ALL USING (true);
CREATE POLICY "Route stops: full access" ON route_stops FOR ALL USING (true);

-- Templates: all authenticated users can CRUD
CREATE POLICY "Templates: full access" ON communication_templates FOR ALL USING (true);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(type);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_routes_date ON routes(date);
CREATE INDEX idx_route_stops_route ON route_stops(route_id);
