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

// Initial Seed Data for Static / GitHub Pages Deployment
const DEFAULT_SEED_DATA = {
    '/api/petrol-bunk/slips': [],
    '/api/petrol-bunk/daily-sales': [],
    '/api/shop-rent/tenants': [],
    '/api/shop-rent/payments': [],
    '/api/business/transactions': [
        {
            id: 'bt-seed-1',
            transaction_date: '2026-08-05',
            vehicle_number: 'TN 37 AB 1234',
            supplier_name: 'Coimbatore Traders',
            company_name: 'Jindal Steel',
            empty_weight_tons: 10.0,
            total_weight_tons: 35.0,
            net_weight_tons: 25.0,
            buy_rate_per_ton: 4000.00,
            sell_rate_per_ton: 5436.86,
            supplier_amount: 100000.00,
            company_amount: 135921.50,
            net_profit: 35921.50,
            supplier_paid_status: 1,
            company_paid_status: 1
        }
    ],
    '/api/agriculture/records': [
        {
            id: 'ag-seed-1',
            record_date: '2026-07-23',
            crop_type: 'coconut',
            activity_details: 'fertilizer',
            record_type: 'EXPENSE',
            qty_units: 0,
            amount: 13550
        },
        {
            id: 'ag-seed-2',
            record_date: '2026-06-02',
            crop_type: 'coconut',
            activity_details: 'thenamaram pathi',
            record_type: 'EXPENSE',
            qty_units: 0,
            amount: 6000
        },
        {
            id: 'ag-seed-3',
            record_date: '2026-05-28',
            crop_type: 'Kambu',
            activity_details: 'tractor',
            record_type: 'EXPENSE',
            qty_units: 0,
            amount: 13260
        }
    ],
    '/api/home/transactions': [
        {
            id: 'hm-seed-1',
            transaction_date: '2026-08-05',
            title: 'Monthly Living & Groceries',
            category: 'Groceries',
            transaction_type: 'EXPENSE',
            amount: 3000,
            notes: 'Household Expense'
        }
    ]
};

// Load or Initialize Persistent Mock Database
function initMockStorage() {
    const raw = localStorage.getItem('ENTERPRISE_STATIC_DB_V2');
    if (!raw) {
        localStorage.setItem('ENTERPRISE_STATIC_DB_V2', JSON.stringify(DEFAULT_SEED_DATA));
        return JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
    }
    try {
        const parsed = JSON.parse(raw);
        // If agriculture records are empty in old cache, merge default seed records
        if (!parsed['/api/agriculture/records'] || parsed['/api/agriculture/records'].length === 0) {
            parsed['/api/agriculture/records'] = DEFAULT_SEED_DATA['/api/agriculture/records'];
        }
        if (!parsed['/api/business/transactions'] || parsed['/api/business/transactions'].length === 0) {
            parsed['/api/business/transactions'] = DEFAULT_SEED_DATA['/api/business/transactions'];
        }
        if (!parsed['/api/home/transactions'] || parsed['/api/home/transactions'].length === 0) {
            parsed['/api/home/transactions'] = DEFAULT_SEED_DATA['/api/home/transactions'];
        }
        return parsed;
    } catch(e) {
        return JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
    }
}

const MOCK_STORAGE = initMockStorage();

function persistStaticDb() {
    try {
        localStorage.setItem('ENTERPRISE_STATIC_DB_V2', JSON.stringify(MOCK_STORAGE));
    } catch(e) {
        console.warn("Unable to persist static DB to localStorage", e);
    }
}

// Helper: Compute dynamic master financial summary from MOCK_STORAGE memory store (Cumulative All-Time)
function getDynamicMockMonthlySummary() {
    const currentMonthStr = new Date().toISOString().slice(0, 7);

    // 1. Petrol Bunk
    let petrolRevenue = 0, petrolProfit = 0;
    (MOCK_STORAGE['/api/petrol-bunk/daily-sales'] || []).forEach(s => {
        petrolRevenue += (parseFloat(s.total_revenue) || 0);
        petrolProfit += (parseFloat(s.total_profit) || 0);
    });
    const petrolExpenses = petrolRevenue - petrolProfit;

    // 2. Shop Rent
    let shopRentIncome = 0;
    (MOCK_STORAGE['/api/shop-rent/payments'] || []).forEach(sp => {
        if (sp.is_paid) {
            shopRentIncome += (parseFloat(sp.amount_paid) || 0);
        }
    });

    // 3. Freight Business
    let bizRevenue = 0, bizExpenses = 0, bizProfit = 0;
    (MOCK_STORAGE['/api/business/transactions'] || []).forEach(t => {
        if (t.company_paid_status === 1 || t.company_paid_status === true) {
            bizRevenue += (parseFloat(t.company_amount) || 0);
            bizExpenses += (parseFloat(t.supplier_amount) || 0);
            bizProfit += (parseFloat(t.net_profit) || 0);
        }
    });

    // 4. Agriculture
    let agriRevenue = 0, agriExpenses = 0;
    (MOCK_STORAGE['/api/agriculture/records'] || []).forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        if (r.record_type === 'INCOME') agriRevenue += amt;
        else agriExpenses += amt;
    });
    const agriProfit = agriRevenue - agriExpenses;

    // 5. Home Household
    let homeIncome = 0, homeExpenses = 0;
    (MOCK_STORAGE['/api/home/transactions'] || []).forEach(h => {
        const amt = parseFloat(h.amount) || 0;
        if (h.transaction_type === 'INCOME') homeIncome += amt;
        else homeExpenses += amt;
    });
    const homeSurplus = homeIncome - homeExpenses;

    const totalGrossIncome = petrolRevenue + shopRentIncome + bizRevenue + agriRevenue + homeIncome;
    const totalGrossExpenses = petrolExpenses + bizExpenses + agriExpenses + homeExpenses;
    const overallNetMonthlyProfit = totalGrossIncome - totalGrossExpenses;

    return {
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
    };
}

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
        console.warn(`API call to ${endpoint} using dynamic fallback data...`, err);
        const cleanEp = endpoint.split('?')[0].replace(/\/$/, '');

        // STRICT PASSWORD CHECK FOR AUTH LOGIN ENDPOINT
        if (cleanEp === '/api/auth/login') {
            let bodyObj = {};
            try {
                bodyObj = JSON.parse(options.body || '{}');
            } catch(e) {}

            if (bodyObj.password === 'sudhan@2008@') {
                return { success: true, user: { username: 'sudhankumar', role: 'Administrator' }, token: 'enterprise-session-token-xyz' };
            } else {
                return { success: false, error: 'Incorrect password. Access denied.' };
            }
        }

        if (cleanEp === '/api/dashboard/monthly-summary') {
            return getDynamicMockMonthlySummary();
        }

        // POST HANDLER FOR OFFLINE / GITHUB PAGES PERSISTENCE
        if (options.method === 'POST') {
            let bodyObj = {};
            try {
                bodyObj = JSON.parse(options.body || '{}');
            } catch(e) {}

            bodyObj.id = bodyObj.id || 'id-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            
            // Auto calculate fields for petrol daily sales if needed
            if (cleanEp === '/api/petrol-bunk/daily-sales') {
                const pPrice = parseFloat(bodyObj.petrol_price) || 100.75;
                const dPrice = parseFloat(bodyObj.diesel_price) || 92.34;
                const pCost = parseFloat(bodyObj.petrol_cost) || (pPrice - 3.50);
                const dCost = parseFloat(bodyObj.diesel_cost) || (dPrice - 3.20);
                const pLiters = parseFloat(bodyObj.petrol_liters) || 0;
                const dLiters = parseFloat(bodyObj.diesel_liters) || 0;

                bodyObj.total_revenue = (pLiters * pPrice) + (dLiters * dPrice);
                bodyObj.total_profit = (pLiters * (pPrice - pCost)) + (dLiters * (dPrice - dCost));
            }

            // Auto calculate fields for business transactions
            if (cleanEp === '/api/business/transactions') {
                const emptyWeight = parseFloat(bodyObj.empty_weight_tons) || 0;
                const totalWeight = parseFloat(bodyObj.total_weight_tons) || 0;
                const netWeight = Math.max(0, totalWeight - emptyWeight);
                const buyRate = parseFloat(bodyObj.buy_rate_per_ton) || 0;
                const sellRate = parseFloat(bodyObj.sell_rate_per_ton) || 0;

                bodyObj.net_weight_tons = netWeight;
                bodyObj.supplier_amount = netWeight * buyRate;
                bodyObj.company_amount = netWeight * sellRate;
                bodyObj.net_profit = bodyObj.company_amount - bodyObj.supplier_amount;
                bodyObj.supplier_paid_status = bodyObj.supplier_paid_status ? 1 : 0;
                bodyObj.company_paid_status = bodyObj.company_paid_status ? 1 : 0;
            }

            if (!MOCK_STORAGE[cleanEp]) {
                MOCK_STORAGE[cleanEp] = [];
            }
            MOCK_STORAGE[cleanEp].unshift(bodyObj);
            persistStaticDb();

            return { success: true, id: bodyObj.id, ...bodyObj };
        }
        
        if (options.method === 'DELETE') {
            const id = cleanEp.split('/').pop();
            Object.keys(MOCK_STORAGE).forEach(key => {
                if (Array.isArray(MOCK_STORAGE[key])) {
                    MOCK_STORAGE[key] = MOCK_STORAGE[key].filter(item => item.id !== id && item.tenant_id !== id);
                }
            });
            persistStaticDb();
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
            persistStaticDb();
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
