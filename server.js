/**
 * ENTERPRISE MANAGEMENT SYSTEM - REST API SERVER & DATABASE CONTROLLER
 * Zero-dependency Node.js HTTP server + Node 22+ built-in `node:sqlite` database layer.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(os.homedir(), '.enterprise_management_system.sqlite');

console.log(`Initializing SQLite database schema at: ${DB_PATH}`);
const db = new DatabaseSync(DB_PATH);

// Helper: Migration check for table columns
function migrateTables() {
    db.exec(`
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
    `);

    // Migrate shop_tenants if legacy layout
    try {
        const infoShop = db.prepare(`PRAGMA table_info(shop_tenants)`).all();
        const hasShopNo = infoShop.some(col => col.name === 'shop_number');
        if (infoShop.length > 0 && !hasShopNo) {
            console.log('Migrating legacy shop_tenants table...');
            db.exec(`DROP TABLE shop_tenants;`);
        }
    } catch (e) {
        console.log('Creating fresh shop_tenants table...');
    }

    db.exec(`
        CREATE TABLE IF NOT EXISTS shop_tenants (
            id TEXT PRIMARY KEY,
            tenant_name TEXT NOT NULL,
            shop_number TEXT NOT NULL,
            aadhaar_number TEXT,
            contact_phone TEXT,
            monthly_rent REAL NOT NULL DEFAULT 0.0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS shop_rent_payments (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            tenant_name TEXT NOT NULL,
            shop_number TEXT NOT NULL,
            rent_month TEXT NOT NULL,
            payment_date TEXT NOT NULL,
            amount_paid REAL NOT NULL DEFAULT 0.0,
            is_paid INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Migrate business_transactions if legacy layout
    try {
        const info = db.prepare(`PRAGMA table_info(business_transactions)`).all();
        const hasVehicle = info.some(col => col.name === 'vehicle_number');
        if (info.length > 0 && !hasVehicle) {
            console.log('Migrating legacy business_transactions table...');
            db.exec(`DROP TABLE business_transactions;`);
        }
    } catch (e) {
        console.log('Creating fresh business_transactions table...');
    }

    db.exec(`
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
    `);

    // Migrate agriculture_records if legacy layout
    try {
        const infoAgri = db.prepare(`PRAGMA table_info(agriculture_records)`).all();
        const hasRecordDate = infoAgri.some(col => col.name === 'record_date');
        if (infoAgri.length > 0 && !hasRecordDate) {
            console.log('Migrating legacy agriculture_records table...');
            db.exec(`DROP TABLE agriculture_records;`);
        }
    } catch (e) {
        console.log('Creating fresh agriculture_records table...');
    }

    db.exec(`
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
    `);
}

migrateTables();

// Seed Initial Demo Data if empty
const countTenants = db.prepare(`SELECT COUNT(*) as count FROM shop_tenants`).get().count;
if (countTenants === 0) {
    db.exec(`
        INSERT INTO shop_tenants (id, tenant_name, shop_number, aadhaar_number, contact_phone, monthly_rent) VALUES
        ('t-1', 'Venkatesh Stores', 'Shop G-01', '9876-5432-1098', '+91 9842100000', 18500.0),
        ('t-2', 'Murugan Bakery', 'Shop G-02', '8765-4321-0987', '+91 9443211111', 14000.0),
        ('t-3', 'Lakshmi Mobile Care', 'Shop F-01', '7654-3210-9876', '+91 9894322222', 12500.0);
    `);
}

const countRentPayments = db.prepare(`SELECT COUNT(*) as count FROM shop_rent_payments`).get().count;
if (countRentPayments === 0) {
    db.exec(`
        INSERT INTO shop_rent_payments (id, tenant_id, tenant_name, shop_number, rent_month, payment_date, amount_paid, is_paid) VALUES
        ('sp-1', 't-1', 'Venkatesh Stores', 'Shop G-01', '2026-08', '2026-08-01', 18500.0, 1),
        ('sp-2', 't-2', 'Murugan Bakery', 'Shop G-02', '2026-08', '2026-08-02', 14000.0, 1),
        ('sp-3', 't-3', 'Lakshmi Mobile Care', 'Shop F-01', '2026-08', '2026-08-05', 12500.0, 0);
    `);
}

const countDailySales = db.prepare(`SELECT COUNT(*) as count FROM petrol_daily_sales`).get().count;
if (countDailySales === 0) {
    db.exec(`
        INSERT INTO petrol_daily_sales (id, sale_date, state_name, petrol_price, diesel_price, petrol_cost, diesel_cost, petrol_liters, diesel_liters, total_revenue, total_profit) VALUES
        ('ds-1', '2026-08-03', 'Tamil Nadu', 100.75, 92.34, 97.25, 89.14, 1450.0, 2800.0, 404641.5, 14045.0),
        ('ds-2', '2026-08-04', 'Tamil Nadu', 100.75, 92.34, 97.25, 89.14, 1620.0, 3100.0, 449479.0, 15590.0);
    `);
}

const countTransactions = db.prepare(`SELECT COUNT(*) as count FROM business_transactions`).get().count;
if (countTransactions === 0) {
    db.exec(`
        INSERT INTO business_transactions (id, transaction_date, vehicle_number, supplier_name, company_name, empty_weight_tons, total_weight_tons, net_weight_tons, buy_rate_per_ton, sell_rate_per_ton, supplier_amount, company_amount, net_profit, supplier_paid_status, company_paid_status) VALUES
        ('bt-1', '2026-08-03', 'TN-38-AX-9988', 'Sri Ram M-Sand Quarry', 'L&T Infrastructure Corp', 11.20, 35.40, 24.20, 4200.0, 5100.0, 101640.0, 123420.0, 21780.0, 1, 1),
        ('bt-2', '2026-08-04', 'TN-37-BY-4411', 'Kongu Blue Metal Suppliers', 'Shree Cement Ltd', 10.50, 38.50, 28.00, 3900.0, 4850.0, 109200.0, 135800.0, 26600.0, 0, 1),
        ('bt-3', '2026-08-05', 'TN-40-CZ-2233', 'Kaveri River Sand Co', 'Sobha Developers Ltd', 12.00, 40.00, 28.00, 4500.0, 5600.0, 126000.0, 156800.0, 30800.0, 0, 0);
    `);
}

const countAgri = db.prepare(`SELECT COUNT(*) as count FROM agriculture_records`).get().count;
if (countAgri === 0) {
    db.exec(`
        INSERT INTO agriculture_records (id, record_date, crop_type, activity_details, record_type, qty_units, amount) VALUES
        ('ag-1', '2026-08-01', 'COCONUT', 'Harvest Batch #14 - 3,500 Coconuts Sold', 'INCOME', 3500.0, 42000.0),
        ('ag-2', '2026-08-02', 'PADDY', 'Organic Fertilizer Purchase', 'EXPENSE', 10.0, 8500.0),
        ('ag-3', '2026-08-03', 'PADDY', 'Paddy Grain Yield Sale (50 Bags)', 'INCOME', 50.0, 75000.0);
    `);
}

const countHome = db.prepare(`SELECT COUNT(*) as count FROM home_transactions`).get().count;
if (countHome === 0) {
    db.exec(`
        INSERT INTO home_transactions (id, transaction_date, title, category, transaction_type, amount, notes) VALUES
        ('hm-1', '2026-08-01', 'Monthly Salary / Personal Draw', 'Salary & Income', 'INCOME', 85000.0, 'Monthly household allocation'),
        ('hm-2', '2026-08-02', 'Supermarket Monthly Groceries', 'Groceries & Supplies', 'EXPENSE', 14500.0, 'DMart organic & household items'),
        ('hm-3', '2026-08-03', 'TNEB Electricity Bill Payment', 'Electricity & Utilities', 'EXPENSE', 3200.0, 'Bi-monthly power bill'),
        ('hm-4', '2026-08-04', 'Children School Fee Term #2', 'Children Education', 'EXPENSE', 22500.0, 'School tuition installment');
    `);
}

// Indian State Fuel Price Directory
const STATE_FUEL_PRICES = {
    "Tamil Nadu": { petrol: 100.75, diesel: 92.34, petrolCost: 97.25, dieselCost: 89.14 },
    "Karnataka": { petrol: 102.86, diesel: 88.94, petrolCost: 99.30, dieselCost: 85.74 },
    "Maharashtra": { petrol: 104.21, diesel: 90.75, petrolCost: 100.70, dieselCost: 87.55 },
    "Delhi": { petrol: 94.72, diesel: 87.62, petrolCost: 91.22, dieselCost: 84.42 },
    "Kerala": { petrol: 107.56, diesel: 96.43, petrolCost: 104.00, dieselCost: 93.10 },
    "Telangana": { petrol: 107.41, diesel: 95.65, petrolCost: 103.90, dieselCost: 92.35 },
    "Andhra Pradesh": { petrol: 109.50, diesel: 97.30, petrolCost: 106.00, dieselCost: 94.00 },
    "West Bengal": { petrol: 104.95, diesel: 91.76, petrolCost: 101.40, dieselCost: 88.50 },
    "Gujarat": { petrol: 94.44, diesel: 90.11, petrolCost: 90.94, dieselCost: 86.91 }
};

function sendJson(res, data, statusCode = 200) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
    });
}

// HTTP Server Router
const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    console.log(`[${req.method}] ${pathname}`);

    try {
        // --- AUTH API ---
        if (pathname === '/api/auth/login' && req.method === 'POST') {
            const body = await parseBody(req);
            if (body.username === 'admin' && body.password === 'admin123') {
                return sendJson(res, { success: true, user: { username: 'admin', role: 'Administrator' }, token: 'enterprise-session-token-xyz' });
            } else {
                return sendJson(res, { success: false, error: 'Invalid credentials. Use admin / admin123' }, 401);
            }
        }

        // --- CONSOLIDATED MASTER MONTHLY SUMMARY API ---
        if (pathname === '/api/dashboard/monthly-summary' && req.method === 'GET') {
            const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

            // 1. Petrol Bunk
            const petrolSales = db.prepare(`SELECT * FROM petrol_daily_sales`).all();
            let petrolRevenue = 0, petrolProfit = 0;
            petrolSales.forEach(s => {
                if ((s.sale_date || '').startsWith(currentMonthStr)) {
                    petrolRevenue += (parseFloat(s.total_revenue) || 0);
                    petrolProfit += (parseFloat(s.total_profit) || 0);
                }
            });
            const petrolExpenses = petrolRevenue - petrolProfit;

            // 2. Shop Rent (Sum paid rent payments for current month)
            const rentPayments = db.prepare(`SELECT * FROM shop_rent_payments`).all();
            let shopRentIncome = 0;
            rentPayments.forEach(sp => {
                if (sp.rent_month === currentMonthStr && sp.is_paid === 1) {
                    shopRentIncome += (parseFloat(sp.amount_paid) || 0);
                }
            });

            // 3. Business Weighbridge (PROFIT RECOGNIZED ONLY IF COMPANY HAS PAID!)
            const trades = db.prepare(`SELECT * FROM business_transactions`).all();
            let bizRevenue = 0, bizExpenses = 0, bizProfit = 0;
            trades.forEach(t => {
                if ((t.transaction_date || '').startsWith(currentMonthStr)) {
                    if (t.company_paid_status === 1) {
                        bizRevenue += (parseFloat(t.company_amount) || 0);
                        bizExpenses += (parseFloat(t.supplier_amount) || 0);
                        bizProfit += (parseFloat(t.net_profit) || 0);
                    }
                }
            });

            // 4. Agriculture
            const agriRecords = db.prepare(`SELECT * FROM agriculture_records`).all();
            let agriRevenue = 0, agriExpenses = 0;
            agriRecords.forEach(r => {
                if ((r.record_date || '').startsWith(currentMonthStr)) {
                    const amt = parseFloat(r.amount) || 0;
                    if (r.record_type === 'INCOME') agriRevenue += amt;
                    else agriExpenses += amt;
                }
            });
            const agriProfit = agriRevenue - agriExpenses;

            // 5. Home Household
            const homeTx = db.prepare(`SELECT * FROM home_transactions`).all();
            let homeIncome = 0, homeExpenses = 0;
            homeTx.forEach(h => {
                if ((h.transaction_date || '').startsWith(currentMonthStr)) {
                    const amt = parseFloat(h.amount) || 0;
                    if (h.transaction_type === 'INCOME') homeIncome += amt;
                    else homeExpenses += amt;
                }
            });
            const homeSurplus = homeIncome - homeExpenses;

            // Overall Totals
            const totalGrossIncome = petrolRevenue + shopRentIncome + bizRevenue + agriRevenue + homeIncome;
            const totalGrossExpenses = petrolExpenses + bizExpenses + agriExpenses + homeExpenses;
            const overallNetMonthlyProfit = totalGrossIncome - totalGrossExpenses;

            return sendJson(res, {
                currentMonth: currentMonthStr,
                totalGrossIncome,
                totalGrossExpenses,
                overallNetMonthlyProfit,
                modules: {
                    petrol: { revenue: petrolRevenue, expense: petrolExpenses, profit: petrolProfit },
                    shop: { revenue: shopRentIncome, expense: 0, profit: shopRentIncome },
                    business: { revenue: bizRevenue, expense: bizExpenses, profit: bizProfit },
                    agriculture: { revenue: agriRevenue, expense: agriExpenses, profit: agriProfit },
                    home: { revenue: homeIncome, expense: homeExpenses, profit: homeSurplus }
                }
            });
        }

        // --- STATE FUEL PRICES API ---
        if (pathname === '/api/petrol-bunk/state-prices' && req.method === 'GET') {
            return sendJson(res, STATE_FUEL_PRICES);
        }

        // --- PETROL BUNK DAILY SALES API ---
        if (pathname === '/api/petrol-bunk/daily-sales' && req.method === 'GET') {
            const sales = db.prepare(`SELECT * FROM petrol_daily_sales ORDER BY sale_date DESC`).all();
            return sendJson(res, sales);
        }

        if (pathname === '/api/petrol-bunk/daily-sales' && req.method === 'POST') {
            const body = await parseBody(req);
            const id = 'ds-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            const saleDate = body.sale_date || new Date().toISOString().split('T')[0];
            const stateName = body.state_name || 'Tamil Nadu';
            const pPrice = parseFloat(body.petrol_price) || 100.75;
            const dPrice = parseFloat(body.diesel_price) || 92.34;
            const pCost = parseFloat(body.petrol_cost) || (pPrice - 3.50);
            const dCost = parseFloat(body.diesel_cost) || (dPrice - 3.20);
            const pLiters = parseFloat(body.petrol_liters) || 0.0;
            const dLiters = parseFloat(body.diesel_liters) || 0.0;

            const revenue = (pLiters * pPrice) + (dLiters * dPrice);
            const profit = (pLiters * (pPrice - pCost)) + (dLiters * (dPrice - dCost));

            db.prepare(`
                INSERT INTO petrol_daily_sales (id, sale_date, state_name, petrol_price, diesel_price, petrol_cost, diesel_cost, petrol_liters, diesel_liters, total_revenue, total_profit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, saleDate, stateName, pPrice, dPrice, pCost, dCost, pLiters, dLiters, revenue, profit);

            return sendJson(res, { success: true, id, revenue, profit });
        }

        if (pathname.startsWith('/api/petrol-bunk/daily-sales/') && req.method === 'DELETE') {
            const id = pathname.split('/').pop();
            db.prepare(`DELETE FROM petrol_daily_sales WHERE id = ?`).run(id);
            return sendJson(res, { success: true, id });
        }

        // --- PETROL BUNK SLIPS API ---
        if (pathname === '/api/petrol-bunk/slips' && req.method === 'GET') {
            const slips = db.prepare(`SELECT * FROM petrol_slips ORDER BY created_at DESC`).all();
            return sendJson(res, slips);
        }

        if (pathname === '/api/petrol-bunk/slips' && req.method === 'POST') {
            const body = await parseBody(req);
            const id = 'slip-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            const slipDate = body.slip_date || new Date().toISOString().split('T')[0];
            const fuelType = (body.fuel_type || 'PETROL').toUpperCase();
            const qty = parseFloat(body.qty_liters) || 0.0;
            const rate = parseFloat(body.rate_per_liter) || (fuelType === 'DIESEL' ? 92.34 : 100.75);

            db.prepare(`
                INSERT INTO petrol_slips (id, customer_name, vehicle_number, fuel_type, qty_liters, rate_per_liter, is_paid, slip_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, body.customer_name, body.vehicle_number, fuelType, qty, rate, 0, slipDate);

            return sendJson(res, { success: true, id });
        }

        if (pathname.startsWith('/api/petrol-bunk/slips/') && pathname.endsWith('/toggle-paid') && req.method === 'PUT') {
            const parts = pathname.split('/');
            const id = parts[4];
            const slip = db.prepare(`SELECT is_paid FROM petrol_slips WHERE id = ?`).get(id);
            if (!slip) return sendJson(res, { error: 'Slip not found' }, 404);

            const newStatus = slip.is_paid ? 0 : 1;
            db.prepare(`UPDATE petrol_slips SET is_paid = ? WHERE id = ?`).run(newStatus, id);
            return sendJson(res, { success: true, id, is_paid: newStatus });
        }

        if (pathname.startsWith('/api/petrol-bunk/slips/') && req.method === 'DELETE') {
            const id = pathname.split('/').pop();
            db.prepare(`DELETE FROM petrol_slips WHERE id = ?`).run(id);
            return sendJson(res, { success: true, id });
        }

        // --- SHOP RENT TENANTS & MONTHLY PAYMENTS API ---
        if (pathname === '/api/shop-rent/tenants' && req.method === 'GET') {
            const tenants = db.prepare(`SELECT * FROM shop_tenants ORDER BY created_at DESC`).all();
            return sendJson(res, tenants);
        }

        if (pathname === '/api/shop-rent/tenants' && req.method === 'POST') {
            const body = await parseBody(req);
            const id = 't-' + Date.now();
            const rent = parseFloat(body.monthly_rent) || 0.0;

            db.prepare(`
                INSERT INTO shop_tenants (id, tenant_name, shop_number, aadhaar_number, contact_phone, monthly_rent)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(id, body.tenant_name, body.shop_number, body.aadhaar_number || '', body.contact_phone || '', rent);

            return sendJson(res, { success: true, id });
        }

        if (pathname.startsWith('/api/shop-rent/tenants/') && req.method === 'DELETE') {
            const id = pathname.split('/').pop();
            db.prepare(`DELETE FROM shop_tenants WHERE id = ?`).run(id);
            return sendJson(res, { success: true, id });
        }

        if (pathname === '/api/shop-rent/payments' && req.method === 'GET') {
            const payments = db.prepare(`SELECT * FROM shop_rent_payments ORDER BY payment_date DESC`).all();
            return sendJson(res, payments);
        }

        if (pathname === '/api/shop-rent/payments' && req.method === 'POST') {
            const body = await parseBody(req);
            const id = 'sp-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            const paymentDate = body.payment_date || new Date().toISOString().split('T')[0];
            const rentMonth = body.rent_month || paymentDate.slice(0, 7);
            const isPaid = body.is_paid !== undefined ? (body.is_paid ? 1 : 0) : 1;

            db.prepare(`
                INSERT INTO shop_rent_payments (id, tenant_id, tenant_name, shop_number, rent_month, payment_date, amount_paid, is_paid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, body.tenant_id, body.tenant_name, body.shop_number, rentMonth, paymentDate, parseFloat(body.amount_paid) || 0.0, isPaid);

            return sendJson(res, { success: true, id });
        }

        if (pathname.startsWith('/api/shop-rent/payments/') && pathname.endsWith('/toggle-paid') && req.method === 'PUT') {
            const parts = pathname.split('/');
            const id = parts[4];
            const pay = db.prepare(`SELECT is_paid FROM shop_rent_payments WHERE id = ?`).get(id);
            if (!pay) return sendJson(res, { error: 'Payment record not found' }, 404);

            const newStatus = pay.is_paid ? 0 : 1;
            db.prepare(`UPDATE shop_rent_payments SET is_paid = ? WHERE id = ?`).run(newStatus, id);
            return sendJson(res, { success: true, id, is_paid: newStatus });
        }

        if (pathname.startsWith('/api/shop-rent/payments/') && req.method === 'DELETE') {
            const id = pathname.split('/').pop();
            db.prepare(`DELETE FROM shop_rent_payments WHERE id = ?`).run(id);
            return sendJson(res, { success: true, id });
        }

        // --- BUSINESS WEIGHBRIDGE FREIGHT API ---
        if (pathname === '/api/business/transactions' && req.method === 'GET') {
            const txs = db.prepare(`SELECT * FROM business_transactions ORDER BY transaction_date DESC`).all();
            return sendJson(res, txs);
        }

        if (pathname === '/api/business/transactions' && req.method === 'POST') {
            const body = await parseBody(req);
            const id = 'bt-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            const txDate = body.transaction_date || new Date().toISOString().split('T')[0];
            const vehicleNumber = (body.vehicle_number || '').toUpperCase();
            const supplierName = body.supplier_name || 'Generic Supplier';
            const companyName = body.company_name || 'Generic Company';

            const emptyWeight = parseFloat(body.empty_weight_tons) || 0.0;
            const totalWeight = parseFloat(body.total_weight_tons) || 0.0;
            const netWeight = Math.max(0, totalWeight - emptyWeight);

            const buyRate = parseFloat(body.buy_rate_per_ton) || 0.0;
            const sellRate = parseFloat(body.sell_rate_per_ton) || 0.0;

            const supplierAmt = netWeight * buyRate;
            const companyAmt = netWeight * sellRate;
            const profit = companyAmt - supplierAmt;

            const supplierPaid = body.supplier_paid_status ? 1 : 0;
            const companyPaid = body.company_paid_status ? 1 : 0;

            db.prepare(`
                INSERT INTO business_transactions (
                    id, transaction_date, vehicle_number, supplier_name, company_name,
                    empty_weight_tons, total_weight_tons, net_weight_tons,
                    buy_rate_per_ton, sell_rate_per_ton, supplier_amount, company_amount,
                    net_profit, supplier_paid_status, company_paid_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id, txDate, vehicleNumber, supplierName, companyName,
                emptyWeight, totalWeight, netWeight,
                buyRate, sellRate, supplierAmt, companyAmt,
                profit, supplierPaid, companyPaid
            );

            return sendJson(res, { success: true, id, netWeight, supplierAmt, companyAmt, profit });
        }

        if (pathname.startsWith('/api/business/transactions/') && pathname.endsWith('/toggle-supplier-paid') && req.method === 'PUT') {
            const parts = pathname.split('/');
            const id = parts[4];
            const tx = db.prepare(`SELECT supplier_paid_status FROM business_transactions WHERE id = ?`).get(id);
            if (!tx) return sendJson(res, { error: 'Trade entry not found' }, 404);

            const newStatus = tx.supplier_paid_status ? 0 : 1;
            db.prepare(`UPDATE business_transactions SET supplier_paid_status = ? WHERE id = ?`).run(newStatus, id);
            return sendJson(res, { success: true, id, supplier_paid_status: newStatus });
        }

        if (pathname.startsWith('/api/business/transactions/') && pathname.endsWith('/toggle-company-paid') && req.method === 'PUT') {
            const parts = pathname.split('/');
            const id = parts[4];
            const tx = db.prepare(`SELECT company_paid_status FROM business_transactions WHERE id = ?`).get(id);
            if (!tx) return sendJson(res, { error: 'Trade entry not found' }, 404);

            const newStatus = tx.company_paid_status ? 0 : 1;
            db.prepare(`UPDATE business_transactions SET company_paid_status = ? WHERE id = ?`).run(newStatus, id);
            return sendJson(res, { success: true, id, company_paid_status: newStatus });
        }

        if (pathname.startsWith('/api/business/transactions/') && req.method === 'DELETE') {
            const id = pathname.split('/').pop();
            db.prepare(`DELETE FROM business_transactions WHERE id = ?`).run(id);
            return sendJson(res, { success: true, id });
        }

        // --- AGRICULTURE API ---
        if (pathname === '/api/agriculture/records' && req.method === 'GET') {
            const records = db.prepare(`SELECT * FROM agriculture_records ORDER BY record_date DESC`).all();
            return sendJson(res, records);
        }

        if (pathname === '/api/agriculture/records' && req.method === 'POST') {
            const body = await parseBody(req);
            const id = 'ag-' + Date.now();
            const recDate = body.record_date || new Date().toISOString().split('T')[0];
            const amount = parseFloat(body.amount) || 0.0;
            const qty = parseFloat(body.qty_units) || 0.0;
            const recType = (body.record_type || 'INCOME').toUpperCase();

            db.prepare(`
                INSERT INTO agriculture_records (id, record_date, crop_type, activity_details, record_type, qty_units, amount)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(id, recDate, body.crop_type, body.activity_details, recType, qty, amount);

            return sendJson(res, { success: true, id });
        }

        if (pathname.startsWith('/api/agriculture/records/') && req.method === 'DELETE') {
            const id = pathname.split('/').pop();
            db.prepare(`DELETE FROM agriculture_records WHERE id = ?`).run(id);
            return sendJson(res, { success: true, id });
        }

        // --- HOME HOUSEHOLD API ---
        if (pathname === '/api/home/transactions' && req.method === 'GET') {
            const items = db.prepare(`SELECT * FROM home_transactions ORDER BY transaction_date DESC`).all();
            return sendJson(res, items);
        }

        if (pathname === '/api/home/transactions' && req.method === 'POST') {
            const body = await parseBody(req);
            const id = 'hm-' + Date.now();
            const txDate = body.transaction_date || new Date().toISOString().split('T')[0];
            const amount = parseFloat(body.amount) || 0.0;
            const txType = (body.transaction_type || 'EXPENSE').toUpperCase();

            db.prepare(`
                INSERT INTO home_transactions (id, transaction_date, title, category, transaction_type, amount, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(id, txDate, body.title, body.category, txType, amount, body.notes || '');

            return sendJson(res, { success: true, id });
        }

        if (pathname.startsWith('/api/home/transactions/') && req.method === 'DELETE') {
            const id = pathname.split('/').pop();
            db.prepare(`DELETE FROM home_transactions WHERE id = ?`).run(id);
            return sendJson(res, { success: true, id });
        }

        // --- STATIC FILE SERVER ---
        let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const mimeTypes = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'text/javascript',
                '.json': 'application/json',
                '.jpg': 'image/jpeg',
                '.png': 'image/png',
                '.ico': 'image/x-icon'
            };
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint or File Not Found' }));
        }

    } catch (error) {
        console.error('Server error:', error);
        sendJson(res, { error: 'Internal Server Error', details: error.message }, 500);
    }
});

function startServer(port) {
    server.listen(port, () => {
        console.log(`====================================================`);
        console.log(`🚀 ENTERPRISE BACKEND SERVER RUNNING AT:`);
        console.log(`   http://localhost:${port}`);
        console.log(`====================================================`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} in use, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Failed to start server:', err);
        }
    });
}

startServer(PORT);
