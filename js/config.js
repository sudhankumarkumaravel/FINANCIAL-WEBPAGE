// ============================================================
// ENTERPRISE API & BACKEND CONFIGURATION
// ============================================================

// Base API endpoint for local Node.js + SQLite backend server
const API_BASE_URL = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:3000';

// Supabase Cloud Backup Credentials (Optional)
const SUPABASE_URL = 'https://aafmhnzyfrlkdhgjxlgx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZDKJaG7z_r0G8J6YvXtjqA_vQHjIyEw';

let supabaseClient = null;

if (typeof supabase !== 'undefined') {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn("Supabase client init skipped.");
    }
}

// Demo Fallback Memory Store for Static Environments (GitHub Pages / Offline)
const MOCK_STORAGE = {
    '/api/dashboard/monthly-summary': {
        currentMonth: new Date().toISOString().slice(0, 7),
        totalGrossIncome: 673441.5,
        totalGrossExpenses: 554316.5,
        overallNetMonthlyProfit: 119125.0,
        modules: {
            petrol: { revenue: 404641.5, expense: 390596.5, profit: 14045.0 },
            shop: { revenue: 32500.0, expense: 0, profit: 32500.0 },
            business: { revenue: 123420.0, expense: 101640.0, profit: 21780.0 },
            agri: { revenue: 42000.0, expense: 8500.0, profit: 33500.0 },
            home: { revenue: 85000.0, expense: 40200.0, profit: 44800.0 }
        }
    },
    '/api/petrol-bunk/slips': [
        { id: 'slip-1', customer_name: 'KSR Transports', vehicle_number: 'TN-38-AX-1020', fuel_type: 'DIESEL', qty_liters: 120.0, rate_per_liter: 92.34, is_paid: 0, slip_date: '2026-08-04' },
        { id: 'slip-2', customer_name: 'Kongu Logistics', vehicle_number: 'TN-37-CB-5544', fuel_type: 'PETROL', qty_liters: 35.0, rate_per_liter: 100.75, is_paid: 1, slip_date: '2026-08-03' }
    ],
    '/api/petrol-bunk/daily-sales': [
        { id: 'ds-1', sale_date: '2026-08-04', state_name: 'Tamil Nadu', petrol_price: 100.75, diesel_price: 92.34, petrol_liters: 1450.0, diesel_liters: 2800.0, total_revenue: 404641.5, total_profit: 14045.0 }
    ],
    '/api/shop-rent/tenants': [
        { id: 't-1', tenant_name: 'Venkatesh Stores', shop_number: 'Shop G-01', aadhaar_number: '9876-5432-1098', contact_phone: '+91 9842100000', monthly_rent: 18500.0 },
        { id: 't-2', tenant_name: 'Murugan Bakery', shop_number: 'Shop G-02', aadhaar_number: '8765-4321-0987', contact_phone: '+91 9443211111', monthly_rent: 14000.0 }
    ],
    '/api/shop-rent/payments': [
        { id: 'sp-1', tenant_id: 't-1', tenant_name: 'Venkatesh Stores', shop_number: 'Shop G-01', rent_month: '2026-08', payment_date: '2026-08-01', amount_paid: 18500.0, is_paid: 1 },
        { id: 'sp-2', tenant_id: 't-2', tenant_name: 'Murugan Bakery', shop_number: 'Shop G-02', rent_month: '2026-08', payment_date: '2026-08-02', amount_paid: 14000.0, is_paid: 1 }
    ],
    '/api/business/transactions': [
        { id: 'bt-1', transaction_date: '2026-08-03', vehicle_number: 'TN-38-AX-9988', supplier_name: 'Sri Ram M-Sand Quarry', company_name: 'L&T Infrastructure Corp', empty_weight_tons: 11.20, total_weight_tons: 35.40, net_weight_tons: 24.20, buy_rate_per_ton: 4200.0, sell_rate_per_ton: 5100.0, supplier_amount: 101640.0, company_amount: 123420.0, net_profit: 21780.0, supplier_paid_status: 1, company_paid_status: 1 }
    ],
    '/api/agriculture/records': [
        { id: 'ag-1', record_date: '2026-08-01', crop_type: 'COCONUT', activity_details: 'Harvest Batch #14 - 3,500 Coconuts Sold', record_type: 'INCOME', qty_units: 3500.0, amount: 42000.0 },
        { id: 'ag-2', record_date: '2026-08-02', crop_type: 'PADDY', activity_details: 'Organic Fertilizer Purchase', record_type: 'EXPENSE', qty_units: 10.0, amount: 8500.0 }
    ],
    '/api/home/transactions': [
        { id: 'hm-1', transaction_date: '2026-08-01', title: 'Monthly Salary / Personal Draw', category: 'Salary & Income', transaction_type: 'INCOME', amount: 85000.0, notes: 'Monthly household allocation' },
        { id: 'hm-2', transaction_date: '2026-08-02', title: 'Supermarket Monthly Groceries', category: 'Groceries & Supplies', transaction_type: 'EXPENSE', amount: 14500.0, notes: 'DMart organic items' }
    ]
};

// Utility: Generic API Request Helper with Fallback
async function apiFetch(endpoint, options = {}) {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const config = {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.warn(`API call to ${endpoint} using static fallback data...`, err);
        const cleanEp = endpoint.split('?')[0].replace(/\/$/, '');
        
        if (options.method === 'DELETE') {
            const id = cleanEp.split('/').pop();
            Object.keys(MOCK_STORAGE).forEach(key => {
                if (Array.isArray(MOCK_STORAGE[key])) {
                    MOCK_STORAGE[key] = MOCK_STORAGE[key].filter(item => item.id !== id && item.tenant_id !== id);
                }
            });
            return { success: true, id };
        }

        if (options.method === 'PUT') {
            const parts = cleanEp.split('/');
            const id = parts[4] || parts[3];
            Object.keys(MOCK_STORAGE).forEach(key => {
                if (Array.isArray(MOCK_STORAGE[key])) {
                    MOCK_STORAGE[key].forEach(item => {
                        if (item.id === id) {
                            if (cleanEp.includes('toggle-paid') || cleanEp.includes('toggle-company-paid')) {
                                item.is_paid = item.is_paid ? 0 : 1;
                                item.company_paid_status = item.company_paid_status ? 0 : 1;
                            }
                            if (cleanEp.includes('toggle-supplier-paid')) {
                                item.supplier_paid_status = item.supplier_paid_status ? 0 : 1;
                            }
                        }
                    });
                }
            });
            return { success: true, id };
        }

        if (MOCK_STORAGE[cleanEp]) {
            return MOCK_STORAGE[cleanEp];
        }
        return { success: true };
    }
}

// Utility: Number formatting (Indian format)
const formatCurrency = (num) => {
    const val = parseFloat(num) || 0;
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Utility: Date formatting
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
};
