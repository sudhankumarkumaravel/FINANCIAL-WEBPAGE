-- ============================================================
-- ENTERPRISE MANAGEMENT SYSTEM - DATABASE SCHEMA & SEED DATA
-- Target DB: SQLite persistent engine & Supabase PostgreSQL
-- ============================================================

-- 1. PETROL BUNK CREDIT SLIPS TABLE
CREATE TABLE IF NOT EXISTS petrol_slips (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    fuel_type TEXT NOT NULL DEFAULT 'PETROL',
    qty_liters REAL NOT NULL DEFAULT 0.0,
    rate_per_liter REAL NOT NULL DEFAULT 100.0,
    is_paid INTEGER NOT NULL DEFAULT 0,
    slip_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. PETROL BUNK DAILY SALES & PROFIT TABLE
CREATE TABLE IF NOT EXISTS petrol_daily_sales (
    id TEXT PRIMARY KEY,
    sale_date TEXT NOT NULL,
    state_name TEXT NOT NULL DEFAULT 'Tamil Nadu',
    petrol_price REAL NOT NULL DEFAULT 100.75,
    diesel_price REAL NOT NULL DEFAULT 92.34,
    petrol_cost REAL NOT NULL DEFAULT 97.25,
    diesel_cost REAL NOT NULL DEFAULT 89.14,
    petrol_liters REAL NOT NULL DEFAULT 0.0,
    diesel_liters REAL NOT NULL DEFAULT 0.0,
    total_revenue REAL NOT NULL DEFAULT 0.0,
    total_profit REAL NOT NULL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. SHOP RENT TENANTS TABLE
CREATE TABLE IF NOT EXISTS shop_tenants (
    id TEXT PRIMARY KEY,
    tenant_name TEXT NOT NULL,
    shop_number TEXT NOT NULL,
    aadhaar_number TEXT,
    contact_phone TEXT,
    monthly_rent REAL NOT NULL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. SHOP RENT MONTHLY PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS shop_rent_payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    shop_number TEXT NOT NULL,
    rent_month TEXT NOT NULL, -- YYYY-MM
    payment_date TEXT NOT NULL, -- YYYY-MM-DD
    amount_paid REAL NOT NULL DEFAULT 0.0,
    is_paid INTEGER NOT NULL DEFAULT 1, -- 1 = PAID, 0 = PENDING
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. BUSINESS WEIGHBRIDGE FREIGHT TRADES TABLE
CREATE TABLE IF NOT EXISTS business_transactions (
    id TEXT PRIMARY KEY,
    transaction_date TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    empty_weight_tons REAL NOT NULL DEFAULT 0.0,
    total_weight_tons REAL NOT NULL DEFAULT 0.0,
    net_weight_tons REAL NOT NULL DEFAULT 0.0,
    buy_rate_per_ton REAL NOT NULL DEFAULT 0.0,
    sell_rate_per_ton REAL NOT NULL DEFAULT 0.0,
    supplier_amount REAL NOT NULL DEFAULT 0.0,
    company_amount REAL NOT NULL DEFAULT 0.0,
    net_profit REAL NOT NULL DEFAULT 0.0,
    supplier_paid_status INTEGER NOT NULL DEFAULT 0,
    company_paid_status INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. AGRICULTURE FARM RECORDS TABLE
CREATE TABLE IF NOT EXISTS agriculture_records (
    id TEXT PRIMARY KEY,
    record_date TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    activity_details TEXT NOT NULL,
    record_type TEXT NOT NULL,
    qty_units REAL DEFAULT 0.0,
    amount REAL NOT NULL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. HOME & HOUSEHOLD OPERATIONS TABLE
CREATE TABLE IF NOT EXISTS home_transactions (
    id TEXT PRIMARY KEY,
    transaction_date TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED DATA (INITIAL DEMO DATA)
-- ============================================================
INSERT OR IGNORE INTO petrol_slips (id, customer_name, vehicle_number, fuel_type, qty_liters, rate_per_liter, is_paid, slip_date)
VALUES 
('slip-1', 'Rajesh Kumar', 'TN-38-AB-1234', 'PETROL', 15.5, 100.75, 0, '2026-08-01'),
('slip-2', 'Suresh Transport', 'TN-37-X-9876', 'DIESEL', 80.0, 92.34, 1, '2026-08-02'),
('slip-3', 'Karthik Logistics', 'TN-40-C-5544', 'DIESEL', 120.0, 92.34, 0, '2026-08-03');

INSERT OR IGNORE INTO petrol_daily_sales (id, sale_date, state_name, petrol_price, diesel_price, petrol_cost, diesel_cost, petrol_liters, diesel_liters, total_revenue, total_profit)
VALUES 
('ds-1', '2026-08-03', 'Tamil Nadu', 100.75, 92.34, 97.25, 89.14, 1450.0, 2800.0, 404641.5, 14045.0),
('ds-2', '2026-08-04', 'Tamil Nadu', 100.75, 92.34, 97.25, 89.14, 1620.0, 3100.0, 449479.0, 15590.0);

INSERT OR IGNORE INTO shop_tenants (id, tenant_name, shop_number, aadhaar_number, contact_phone, monthly_rent)
VALUES 
('t-1', 'Venkatesh Stores', 'Shop G-01', '9876-5432-1098', '+91 9842100000', 18500.0),
('t-2', 'Murugan Bakery', 'Shop G-02', '8765-4321-0987', '+91 9443211111', 14000.0),
('t-3', 'Lakshmi Mobile Care', 'Shop F-01', '7654-3210-9876', '+91 9894322222', 12500.0);

INSERT OR IGNORE INTO shop_rent_payments (id, tenant_id, tenant_name, shop_number, rent_month, payment_date, amount_paid, is_paid)
VALUES 
('sp-1', 't-1', 'Venkatesh Stores', 'Shop G-01', '2026-08', '2026-08-01', 18500.0, 1),
('sp-2', 't-2', 'Murugan Bakery', 'Shop G-02', '2026-08', '2026-08-02', 14000.0, 1),
('sp-3', 't-3', 'Lakshmi Mobile Care', 'Shop F-01', '2026-08', '2026-08-05', 12500.0, 0);

INSERT OR IGNORE INTO business_transactions (id, transaction_date, vehicle_number, supplier_name, company_name, empty_weight_tons, total_weight_tons, net_weight_tons, buy_rate_per_ton, sell_rate_per_ton, supplier_amount, company_amount, net_profit, supplier_paid_status, company_paid_status)
VALUES 
('bt-1', '2026-08-03', 'TN-38-AX-9988', 'Sri Ram M-Sand Quarry', 'L&T Infrastructure Corp', 11.20, 35.40, 24.20, 4200.0, 5100.0, 101640.0, 123420.0, 21780.0, 1, 1),
('bt-2', '2026-08-04', 'TN-37-BY-4411', 'Kongu Blue Metal Suppliers', 'Shree Cement Ltd', 10.50, 38.50, 28.00, 3900.0, 4850.0, 109200.0, 135800.0, 26600.0, 0, 1),
('bt-3', '2026-08-05', 'TN-40-CZ-2233', 'Kaveri River Sand Co', 'Sobha Developers Ltd', 12.00, 40.00, 28.00, 4500.0, 5600.0, 126000.0, 156800.0, 30800.0, 0, 0);

INSERT OR IGNORE INTO agriculture_records (id, record_date, crop_type, activity_details, record_type, qty_units, amount)
VALUES 
('ag-1', '2026-08-01', 'COCONUT', 'Harvest Batch #14 - 3,500 Coconuts Sold', 'INCOME', 3500.0, 42000.0),
('ag-2', '2026-08-02', 'PADDY', 'Organic Fertilizer Purchase', 'EXPENSE', 10.0, 8500.0),
('ag-3', '2026-08-03', 'PADDY', 'Paddy Grain Yield Sale (50 Bags)', 'INCOME', 50.0, 75000.0);

INSERT OR IGNORE INTO home_transactions (id, transaction_date, title, category, transaction_type, amount, notes)
VALUES 
('hm-1', '2026-08-01', 'Monthly Salary / Personal Draw', 'Salary & Income', 'INCOME', 85000.0, 'Monthly household allocation'),
('hm-2', '2026-08-02', 'Supermarket Monthly Groceries', 'Groceries & Supplies', 'EXPENSE', 14500.0, 'DMart organic & household items'),
('hm-3', '2026-08-03', 'TNEB Electricity Bill Payment', 'Electricity & Utilities', 'EXPENSE', 3200.0, 'Bi-monthly power bill'),
('hm-4', '2026-08-04', 'Children School Fee Term #2', 'Children Education', 'EXPENSE', 22500.0, 'School tuition installment');
