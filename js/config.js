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
    '/api/petrol-bunk/slips': [],
    '/api/petrol-bunk/daily-sales': [],
    '/api/shop-rent/tenants': [],
    '/api/shop-rent/payments': [],
    '/api/business/transactions': [],
    '/api/agriculture/records': [],
    '/api/home/transactions': []
};

// Helper: Compute dynamic monthly summary from MOCK_STORAGE memory store
function getDynamicMockMonthlySummary() {
    const currentMonthStr = new Date().toISOString().slice(0, 7);

    // 1. Petrol
    let petrolRevenue = 0, petrolProfit = 0;
    (MOCK_STORAGE['/api/petrol-bunk/daily-sales'] || []).forEach(s => {
        if ((s.sale_date || '').startsWith(currentMonthStr)) {
            petrolRevenue += (parseFloat(s.total_revenue) || 0);
            petrolProfit += (parseFloat(s.total_profit) || 0);
        }
    });
    const petrolExpenses = petrolRevenue - petrolProfit;

    // 2. Shop Rent
    let shopRentIncome = 0;
    (MOCK_STORAGE['/api/shop-rent/payments'] || []).forEach(sp => {
        if (sp.rent_month === currentMonthStr && sp.is_paid) {
            shopRentIncome += (parseFloat(sp.amount_paid) || 0);
        }
    });

    // 3. Freight Business
    let bizRevenue = 0, bizExpenses = 0, bizProfit = 0;
    (MOCK_STORAGE['/api/business/transactions'] || []).forEach(t => {
        if ((t.transaction_date || '').startsWith(currentMonthStr)) {
            if (t.company_paid_status === 1 || t.company_paid_status === true) {
                bizRevenue += (parseFloat(t.company_amount) || 0);
                bizExpenses += (parseFloat(t.supplier_amount) || 0);
                bizProfit += (parseFloat(t.net_profit) || 0);
            }
        }
    });

    // 4. Agriculture
    let agriRevenue = 0, agriExpenses = 0;
    (MOCK_STORAGE['/api/agriculture/records'] || []).forEach(r => {
        if ((r.record_date || '').startsWith(currentMonthStr)) {
            const amt = parseFloat(r.amount) || 0;
            if (r.record_type === 'INCOME') agriRevenue += amt;
            else agriExpenses += amt;
        }
    });
    const agriProfit = agriRevenue - agriExpenses;

    // 5. Home Household
    let homeIncome = 0, homeExpenses = 0;
    (MOCK_STORAGE['/api/home/transactions'] || []).forEach(h => {
        if ((h.transaction_date || '').startsWith(currentMonthStr)) {
            const amt = parseFloat(h.amount) || 0;
            if (h.transaction_type === 'INCOME') homeIncome += amt;
            else homeExpenses += amt;
        }
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

        if (cleanEp === '/api/dashboard/monthly-summary') {
            return getDynamicMockMonthlySummary();
        }
        
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
