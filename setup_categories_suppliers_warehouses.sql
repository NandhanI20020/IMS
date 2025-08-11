-- Categories, Suppliers, and Warehouses Setup Script
-- This script creates tables (if not exist) and inserts sample data
--
-- IMPORTANT: This script will:
-- 1. Clear all existing categories, suppliers, and warehouses
-- 2. Update related tables to remove foreign key references
-- 3. Handle NOT NULL constraints by deleting records that can't be updated
-- 4. Insert fresh sample data
--
-- TABLES THAT WILL BE AFFECTED:
-- - products: category_id and supplier_id will be set to NULL
-- - inventory: records with warehouse_id will be deleted
-- - purchase_orders: records with supplier_id or warehouse_id will be deleted (if NOT NULL constraints exist)
-- - stock_movements: records with warehouse_id will be deleted (if NOT NULL constraints exist)
-- - user_profiles: warehouse_id will be set to NULL
-- - stock_alerts: records with warehouse_id will be deleted (if NOT NULL constraints exist)
-- - Any other tables with warehouse_id, supplier_id, or category_id references will be handled automatically
--
-- If you want to preserve existing data, comment out the DELETE statements
-- and the foreign key handling section below, then uncomment the alternative approach.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sequences if they don't exist
CREATE SEQUENCE IF NOT EXISTS categories_id_seq;
CREATE SEQUENCE IF NOT EXISTS suppliers_id_seq;
CREATE SEQUENCE IF NOT EXISTS warehouses_id_seq;

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id integer NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  name text NOT NULL,
  description text,
  parent_id integer,
  code text NOT NULL UNIQUE,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id integer NOT NULL DEFAULT nextval('suppliers_id_seq'::regclass),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  contact_person text,
  email text CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text),
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'USA'::text,
  tax_id text,
  credit_limit numeric,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  payment_terms integer DEFAULT 30,
  notes text,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- Warehouses Table
CREATE TABLE IF NOT EXISTS public.warehouses (
  id integer NOT NULL DEFAULT nextval('warehouses_id_seq'::regclass),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'USA'::text,
  phone text,
  email text CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text),
  manager_id uuid,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT warehouses_pkey PRIMARY KEY (id),
  CONSTRAINT warehouses_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.user_profiles(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_code ON public.categories(code);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON public.suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);

CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON public.warehouses(name);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON public.warehouses(is_active);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.categories;
CREATE POLICY "Allow all operations for authenticated users" ON public.categories
  FOR ALL USING (true);

-- Create RLS policies for suppliers  
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.suppliers;
CREATE POLICY "Allow all operations for authenticated users" ON public.suppliers
  FOR ALL USING (true);

-- Create RLS policies for warehouses
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.warehouses;
CREATE POLICY "Allow all operations for authenticated users" ON public.warehouses
  FOR ALL USING (true);

-- Handle existing foreign key relationships before clearing data
-- First, update products to remove category references
DO $$
DECLARE
    column_info RECORD;
BEGIN
    -- Check if products table exists and has category_id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
            -- Update products to set category_id to NULL
            UPDATE public.products SET category_id = NULL WHERE category_id IS NOT NULL;
            RAISE NOTICE 'Updated products to remove category references';
        END IF;
    END IF;
    
    -- Check if products table exists and has supplier_id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplier_id') THEN
            -- Update products to set supplier_id to NULL
            UPDATE public.products SET supplier_id = NULL WHERE supplier_id IS NOT NULL;
            RAISE NOTICE 'Updated products to remove supplier references';
        END IF;
    END IF;
    
    -- Check if inventory table exists and has warehouse_id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'warehouse_id') THEN
            -- Update inventory to set warehouse_id to NULL or delete records
            DELETE FROM public.inventory WHERE warehouse_id IS NOT NULL;
            RAISE NOTICE 'Cleared inventory records with warehouse references';
        END IF;
    END IF;
    
    -- Handle purchase_orders table - check for NOT NULL constraints
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
        -- Handle supplier_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'supplier_id') THEN
            SELECT is_nullable INTO column_info 
            FROM information_schema.columns 
            WHERE table_name = 'purchase_orders' AND column_name = 'supplier_id';
            
            IF column_info.is_nullable = 'NO' THEN
                -- NOT NULL constraint exists, delete records
                DELETE FROM public.purchase_orders WHERE supplier_id IS NOT NULL;
                RAISE NOTICE 'Deleted purchase orders with supplier references (due to NOT NULL constraint)';
            ELSE
                -- Nullable, set to NULL
                UPDATE public.purchase_orders SET supplier_id = NULL WHERE supplier_id IS NOT NULL;
                RAISE NOTICE 'Updated purchase orders to remove supplier references';
            END IF;
        END IF;
        
        -- Handle warehouse_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'warehouse_id') THEN
            SELECT is_nullable INTO column_info 
            FROM information_schema.columns 
            WHERE table_name = 'purchase_orders' AND column_name = 'warehouse_id';
            
            IF column_info.is_nullable = 'NO' THEN
                -- NOT NULL constraint exists, delete records
                DELETE FROM public.purchase_orders WHERE warehouse_id IS NOT NULL;
                RAISE NOTICE 'Deleted purchase orders with warehouse references (due to NOT NULL constraint)';
            ELSE
                -- Nullable, set to NULL
                UPDATE public.purchase_orders SET warehouse_id = NULL WHERE warehouse_id IS NOT NULL;
                RAISE NOTICE 'Updated purchase orders to remove warehouse references';
            END IF;
        END IF;
    END IF;
    
    -- Handle stock_movements table - check for NOT NULL constraints
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'warehouse_id') THEN
            SELECT is_nullable INTO column_info 
            FROM information_schema.columns 
            WHERE table_name = 'stock_movements' AND column_name = 'warehouse_id';
            
            IF column_info.is_nullable = 'NO' THEN
                -- NOT NULL constraint exists, delete records
                DELETE FROM public.stock_movements WHERE warehouse_id IS NOT NULL;
                RAISE NOTICE 'Deleted stock movements with warehouse references (due to NOT NULL constraint)';
            ELSE
                -- Nullable, set to NULL
                UPDATE public.stock_movements SET warehouse_id = NULL WHERE warehouse_id IS NOT NULL;
                RAISE NOTICE 'Updated stock movements to remove warehouse references';
            END IF;
        END IF;
    END IF;
    
    -- Check if user_profiles table exists and has warehouse_id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'warehouse_id') THEN
            -- Update user profiles to set warehouse_id to NULL
            UPDATE public.user_profiles SET warehouse_id = NULL WHERE warehouse_id IS NOT NULL;
            RAISE NOTICE 'Updated user profiles to remove warehouse references';
        END IF;
    END IF;
    
    -- Handle stock_alerts table - check for NOT NULL constraints
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_alerts') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'warehouse_id') THEN
            SELECT is_nullable INTO column_info 
            FROM information_schema.columns 
            WHERE table_name = 'stock_alerts' AND column_name = 'warehouse_id';
            
            IF column_info.is_nullable = 'NO' THEN
                -- NOT NULL constraint exists, delete records
                DELETE FROM public.stock_alerts WHERE warehouse_id IS NOT NULL;
                RAISE NOTICE 'Deleted stock alerts with warehouse references (due to NOT NULL constraint)';
            ELSE
                -- Nullable, set to NULL
                UPDATE public.stock_alerts SET warehouse_id = NULL WHERE warehouse_id IS NOT NULL;
                RAISE NOTICE 'Updated stock alerts to remove warehouse references';
            END IF;
        END IF;
    END IF;
    
    -- Handle any other tables that might reference warehouses, suppliers, or categories
    -- This is a catch-all for any other foreign key relationships we might have missed
    
    -- Check for any tables with warehouse_id foreign keys
    FOR column_info IN 
        SELECT table_name, column_name, is_nullable 
        FROM information_schema.columns 
        WHERE column_name IN ('warehouse_id', 'supplier_id', 'category_id') 
        AND table_schema = 'public' 
        AND table_name NOT IN ('warehouses', 'suppliers', 'categories', 'products', 'inventory', 'purchase_orders', 'stock_movements', 'user_profiles', 'stock_alerts')
    LOOP
        IF column_info.column_name = 'warehouse_id' THEN
            IF column_info.is_nullable = 'NO' THEN
                EXECUTE format('DELETE FROM public.%I WHERE warehouse_id IS NOT NULL', column_info.table_name);
                RAISE NOTICE 'Deleted records from % with warehouse references (due to NOT NULL constraint)', column_info.table_name;
            ELSE
                EXECUTE format('UPDATE public.%I SET warehouse_id = NULL WHERE warehouse_id IS NOT NULL', column_info.table_name);
                RAISE NOTICE 'Updated % to remove warehouse references', column_info.table_name;
            END IF;
        ELSIF column_info.column_name = 'supplier_id' THEN
            IF column_info.is_nullable = 'NO' THEN
                EXECUTE format('DELETE FROM public.%I WHERE supplier_id IS NOT NULL', column_info.table_name);
                RAISE NOTICE 'Deleted records from % with supplier references (due to NOT NULL constraint)', column_info.table_name;
            ELSE
                EXECUTE format('UPDATE public.%I SET supplier_id = NULL WHERE supplier_id IS NOT NULL', column_info.table_name);
                RAISE NOTICE 'Updated % to remove supplier references', column_info.table_name;
            END IF;
        ELSIF column_info.column_name = 'category_id' THEN
            IF column_info.is_nullable = 'NO' THEN
                EXECUTE format('DELETE FROM public.%I WHERE category_id IS NOT NULL', column_info.table_name);
                RAISE NOTICE 'Deleted records from % with category references (due to NOT NULL constraint)', column_info.table_name;
            ELSE
                EXECUTE format('UPDATE public.%I SET category_id = NULL WHERE category_id IS NOT NULL', column_info.table_name);
                RAISE NOTICE 'Updated % to remove category references', column_info.table_name;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Clear existing data for clean setup
DELETE FROM public.categories;
DELETE FROM public.suppliers;  
DELETE FROM public.warehouses;

-- ALTERNATIVE APPROACH: If you want to preserve existing data, comment out the DELETE statements
-- and uncomment the following section to only add missing records:
/*
-- Only insert if categories don't exist
INSERT INTO public.categories (name, description, code, sort_order, is_active)
SELECT * FROM (VALUES
  ('Electronics', 'Electronic devices and accessories', 'ELEC', 1, true),
  ('Computers', 'Desktop computers, laptops, and accessories', 'COMP', 2, true),
  ('Mobile Devices', 'Smartphones, tablets, and mobile accessories', 'MOB', 3, true),
  ('Audio', 'Headphones, speakers, and audio equipment', 'AUD', 4, true),
  ('Gaming', 'Gaming consoles, accessories, and games', 'GAM', 5, true),
  ('Home & Garden', 'Home appliances and garden equipment', 'HOME', 6, true),
  ('Kitchen Appliances', 'Kitchen equipment and tools', 'KITCH', 7, true),
  ('Furniture', 'Office and home furniture', 'FURN', 8, true),
  ('Office Supplies', 'Stationery, office equipment, and supplies', 'OFF', 9, true),
  ('Sports & Outdoors', 'Sports equipment and outdoor gear', 'SPORT', 10, true)
) AS v(name, description, code, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE categories.code = v.code);

-- Only insert if suppliers don't exist
INSERT INTO public.suppliers (name, code, contact_person, email, phone, address, city, state, postal_code, country, tax_id, credit_limit, rating, payment_terms, notes, is_active)
SELECT * FROM (VALUES
  ('TechCorp Solutions Inc.', 'TECH001', 'John Smith', 'john.smith@techcorp.com', '+1-555-0101', '123 Technology Blvd', 'San Francisco', 'CA', '94105', 'USA', 'TAX123456', 50000.00, 5, 30, 'Primary electronics supplier with excellent service', true),
  ('Global Electronics Ltd.', 'GLOB001', 'Sarah Johnson', 'sarah.j@globalelec.com', '+1-555-0102', '456 Innovation Drive', 'Austin', 'TX', '73301', 'USA', 'TAX789012', 75000.00, 4, 45, 'Specializes in mobile devices and accessories', true)
) AS v(name, code, contact_person, email, phone, address, city, state, postal_code, country, tax_id, credit_limit, rating, payment_terms, notes, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.code = v.code);

-- Only insert if warehouses don't exist
INSERT INTO public.warehouses (name, code, address, city, state, postal_code, country, phone, email, is_active)
SELECT * FROM (VALUES
  ('Main Warehouse', 'WH001', '1000 Storage Drive', 'Los Angeles', 'CA', '90001', 'USA', '+1-555-1001', 'main@warehouse.com', true),
  ('West Coast Distribution', 'WH002', '2500 Pacific Highway', 'Seattle', 'WA', '98001', 'USA', '+1-555-1002', 'west@warehouse.com', true)
) AS v(name, code, address, city, state, postal_code, country, phone, email, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses WHERE warehouses.code = v.code);
*/

-- Reset sequences
ALTER SEQUENCE categories_id_seq RESTART WITH 1;
ALTER SEQUENCE suppliers_id_seq RESTART WITH 1;
ALTER SEQUENCE warehouses_id_seq RESTART WITH 1;

-- Sample Categories Data
INSERT INTO public.categories (name, description, code, sort_order, is_active) VALUES
('Electronics', 'Electronic devices and accessories', 'ELEC', 1, true),
('Computers', 'Desktop computers, laptops, and accessories', 'COMP', 2, true),
('Mobile Devices', 'Smartphones, tablets, and mobile accessories', 'MOB', 3, true),
('Audio', 'Headphones, speakers, and audio equipment', 'AUD', 4, true),
('Gaming', 'Gaming consoles, accessories, and games', 'GAM', 5, true),
('Home & Garden', 'Home appliances and garden equipment', 'HOME', 6, true),
('Kitchen Appliances', 'Kitchen equipment and tools', 'KITCH', 7, true),
('Furniture', 'Office and home furniture', 'FURN', 8, true),
('Office Supplies', 'Stationery, office equipment, and supplies', 'OFF', 9, true),
('Sports & Outdoors', 'Sports equipment and outdoor gear', 'SPORT', 10, true);

-- Insert child categories (subcategories)
INSERT INTO public.categories (name, description, code, parent_id, sort_order, is_active) VALUES
('Laptops', 'Portable computers and notebooks', 'COMP-LAP', (SELECT id FROM categories WHERE code = 'COMP'), 1, true),
('Desktops', 'Desktop computers and workstations', 'COMP-DESK', (SELECT id FROM categories WHERE code = 'COMP'), 2, true),
('Smartphones', 'Mobile phones and smartphones', 'MOB-PHONE', (SELECT id FROM categories WHERE code = 'MOB'), 1, true),
('Tablets', 'Tablet computers and e-readers', 'MOB-TAB', (SELECT id FROM categories WHERE code = 'MOB'), 2, true),
('Headphones', 'Wired and wireless headphones', 'AUD-HEAD', (SELECT id FROM categories WHERE code = 'AUD'), 1, true),
('Speakers', 'Bluetooth and wired speakers', 'AUD-SPEAK', (SELECT id FROM categories WHERE code = 'AUD'), 2, true);

-- Sample Suppliers Data
INSERT INTO public.suppliers (name, code, contact_person, email, phone, address, city, state, postal_code, country, tax_id, credit_limit, rating, payment_terms, notes, is_active) VALUES
('TechCorp Solutions Inc.', 'TECH001', 'John Smith', 'john.smith@techcorp.com', '+1-555-0101', '123 Technology Blvd', 'San Francisco', 'CA', '94105', 'USA', 'TAX123456', 50000.00, 5, 30, 'Primary electronics supplier with excellent service', true),
('Global Electronics Ltd.', 'GLOB001', 'Sarah Johnson', 'sarah.j@globalelec.com', '+1-555-0102', '456 Innovation Drive', 'Austin', 'TX', '73301', 'USA', 'TAX789012', 75000.00, 4, 45, 'Specializes in mobile devices and accessories', true),
('Office Solutions Pro', 'OFF001', 'Mike Wilson', 'mike.wilson@officesol.com', '+1-555-0103', '789 Business Park Way', 'Chicago', 'IL', '60601', 'USA', 'TAX345678', 25000.00, 4, 15, 'Office supplies and furniture supplier', true),
('Home Comfort Systems', 'HOME001', 'Lisa Brown', 'lisa.brown@homecomfort.com', '+1-555-0104', '321 Residential Lane', 'Denver', 'CO', '80202', 'USA', 'TAX901234', 40000.00, 3, 30, 'Kitchen appliances and home equipment', true),
('Sports & Outdoor Gear Co.', 'SPORT001', 'David Lee', 'david.lee@sportsgear.com', '+1-555-0105', '654 Adventure Avenue', 'Seattle', 'WA', '98101', 'USA', 'TAX567890', 35000.00, 4, 30, 'Sports equipment and outdoor gear specialist', true),
('Premium Audio Systems', 'PREM001', 'Jennifer Davis', 'jennifer.davis@premiumaudio.com', '+1-555-0106', '987 Sound Street', 'Nashville', 'TN', '37201', 'USA', 'TAX234567', 60000.00, 5, 60, 'High-end audio equipment and professional sound systems', true),
('Gaming World Distributors', 'GAME001', 'Robert Chen', 'robert.chen@gamingworld.com', '+1-555-0107', '147 Gamer Boulevard', 'Los Angeles', 'CA', '90210', 'USA', 'TAX890123', 80000.00, 4, 30, 'Gaming consoles, accessories, and entertainment products', true),
('Furniture Express Inc.', 'FURN001', 'Amanda White', 'amanda.white@furnitureexp.com', '+1-555-0108', '258 Design District', 'New York', 'NY', '10001', 'USA', 'TAX456789', 45000.00, 3, 45, 'Office and home furniture manufacturer and distributor', true);

-- Sample Warehouses Data
INSERT INTO public.warehouses (name, code, address, city, state, postal_code, country, phone, email, is_active) VALUES
('Main Warehouse', 'WH001', '1000 Storage Drive', 'Los Angeles', 'CA', '90001', 'USA', '+1-555-1001', 'main@warehouse.com', true),
('West Coast Distribution', 'WH002', '2500 Pacific Highway', 'Seattle', 'WA', '98001', 'USA', '+1-555-1002', 'west@warehouse.com', true),
('East Coast Hub', 'WH003', '3750 Atlantic Avenue', 'New York', 'NY', '10001', 'USA', '+1-555-1003', 'east@warehouse.com', true),
('Central Distribution Center', 'WH004', '4200 Midwest Boulevard', 'Chicago', 'IL', '60601', 'USA', '+1-555-1004', 'central@warehouse.com', true),
('South Regional Warehouse', 'WH005', '5100 Southern Way', 'Atlanta', 'GA', '30301', 'USA', '+1-555-1005', 'south@warehouse.com', true),
('North Distribution', 'WH006', '6800 Northern Route', 'Minneapolis', 'MN', '55401', 'USA', '+1-555-1006', 'north@warehouse.com', true),
('West Storage', 'WH007', '7500 Mountain View Drive', 'Denver', 'CO', '80201', 'USA', '+1-555-1007', 'mountain@warehouse.com', true),
('South Distribution', 'WH008', '8200 Gulf Coast Road', 'Houston', 'TX', '77001', 'USA', '+1-555-1008', 'gulf@warehouse.com', true);

-- Update the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warehouses_updated_at ON public.warehouses;
CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON public.warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify data insertion
SELECT 'Categories' as table_name, COUNT(*) as record_count FROM public.categories
UNION ALL
SELECT 'Suppliers' as table_name, COUNT(*) as record_count FROM public.suppliers  
UNION ALL
SELECT 'Warehouses' as table_name, COUNT(*) as record_count FROM public.warehouses;

-- Show sample data
SELECT 'Categories with hierarchy:' as info;
SELECT 
  c.id,
  c.name,
  c.code,
  CASE 
    WHEN c.parent_id IS NULL THEN 'Root Category'
    ELSE CONCAT('Child of: ', p.name)
  END as hierarchy,
  c.sort_order
FROM public.categories c
LEFT JOIN public.categories p ON c.parent_id = p.id
ORDER BY COALESCE(c.parent_id, c.id), c.sort_order;

SELECT 'Suppliers summary:' as info;
SELECT id, name, code, city, state, rating, is_active FROM public.suppliers ORDER BY name;

SELECT 'Warehouses summary:' as info;
SELECT id, name, code, city, state, is_active FROM public.warehouses ORDER BY name;