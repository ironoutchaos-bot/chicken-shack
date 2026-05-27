-- ============================================================
-- BLURUFRESH Schema — fresh start, no Supabase auth dependency
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================


-- ── 1. Profiles (independent — no auth.users FK) ─────────────
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  address_json JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- All access goes through service-role API routes — no RLS needed
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS profiles_phone_number_idx ON profiles(phone_number);


-- ── 2. Products ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  name           TEXT          NOT NULL,
  price_per_kg   DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url      TEXT,
  stock_quantity INTEGER       NOT NULL DEFAULT 50,
  category       TEXT          NOT NULL DEFAULT 'chicken',
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE products DISABLE ROW LEVEL SECURITY;

INSERT INTO products (id, name, price_per_kg, stock_quantity, category) VALUES
  ('boneless',  'Boneless',        320, 50, 'chicken'),
  ('curry-cut', 'Curry Cut',       220, 50, 'chicken'),
  ('wings',     'Wings',           240, 30, 'chicken'),
  ('liver',     'Liver and Other', 120, 20, 'offal'),
  ('drumstick', 'Drumstick',       250, 40, 'chicken')
ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  stock_quantity = EXCLUDED.stock_quantity,
  category       = EXCLUDED.category;


-- ── 3. Orders (references profiles.id, not auth.users) ───────
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  items               JSONB         NOT NULL DEFAULT '[]',
  total_amount        DECIMAL(10,2) NOT NULL,
  payment_status      TEXT          NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending','paid','failed','cod')),
  order_status        TEXT          NOT NULL DEFAULT 'placed'
                        CHECK (order_status IN ('placed','packed','on_the_way','delivered','cancelled')),
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  eta_minutes         INTEGER,
  notes               TEXT,
  delivery_address    JSONB,
  driver_id           UUID,
  driver_name         TEXT,
  driver_phone        TEXT,
  customer_phone      TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- All reads/writes go through service-role API routes — no RLS needed
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx  ON orders(order_status);


-- ── 4. Drivers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  user_id    TEXT    NOT NULL UNIQUE,
  password   TEXT    NOT NULL,
  phone      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS drivers_user_id_idx ON drivers(user_id);


-- ── 5. Driver push subscriptions ─────────────────────────────
CREATE TABLE IF NOT EXISTS driver_push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id  UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE driver_push_subscriptions DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS driver_push_subs_driver_id_idx ON driver_push_subscriptions(driver_id);


-- ── 6. Settings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('cod_enabled',      'true'),
  ('cashfree_enabled', 'true'),
  ('store_open',       'true'),
  ('min_order_amount', '0'),
  ('delivery_fee',     '0'),
  ('delivery_hours',   '"8am – 8pm"'),
  ('announcement',     '""')
ON CONFLICT (key) DO NOTHING;


-- ── 7. Auto-assign first active driver on confirmed payment ──
-- Fires on INSERT (COD orders — payment_status = 'cod' at creation time)
-- and on UPDATE when an online payment transitions from 'pending' → 'paid'.
-- Only assigns if no driver is set yet and payment is confirmed.
CREATE OR REPLACE FUNCTION auto_assign_first_driver()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_driver_id    UUID;
  v_driver_name  TEXT;
  v_driver_phone TEXT;
BEGIN
  IF NEW.payment_status IN ('cod', 'paid') AND NEW.driver_id IS NULL THEN
    SELECT id, name, phone
      INTO v_driver_id, v_driver_name, v_driver_phone
    FROM drivers
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;

    IF v_driver_id IS NOT NULL THEN
      NEW.driver_id    := v_driver_id;
      NEW.driver_name  := v_driver_name;
      NEW.driver_phone := v_driver_phone;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- INSERT trigger: catches COD orders
DROP TRIGGER IF EXISTS orders_auto_assign_driver ON orders;
CREATE TRIGGER orders_auto_assign_driver
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE PROCEDURE auto_assign_first_driver();

-- UPDATE trigger: catches online payments going from pending → paid
DROP TRIGGER IF EXISTS orders_auto_assign_driver_on_pay ON orders;
CREATE TRIGGER orders_auto_assign_driver_on_pay
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.payment_status = 'pending' AND NEW.payment_status = 'paid' AND NEW.driver_id IS NULL)
  EXECUTE PROCEDURE auto_assign_first_driver();


-- ── 8. updated_at triggers ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
