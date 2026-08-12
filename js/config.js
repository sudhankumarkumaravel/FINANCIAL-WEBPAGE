// ============================================================
// ENTERPRISE API & BACKEND CONFIGURATION (PERFECT PERSISTENCE & MATH)
// ============================================================

// Detect environment: Local Node server vs Static GitHub Pages
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal ? (window.location.origin.includes('http') ? window.location.origin : 'http://localhost:3000') : '';

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

// Initial Seed Data for Static / Offline / GitHub Pages Deployment
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
            amount: 13550,
            notes: 'Field fertilizer treatment'
        },
        {
            id: 'ag-seed-2',
            record_date: '2026-06-02',
            crop_type: 'coconut',
            activity_details: 'thenamaram pathi',
            record_type: 'EXPENSE',
            qty_units: 0,
            amount: 6000,
            notes: 'Irrigation path preparation'
        },
        {
            id: 'ag-seed-3',
            record_date: '2026-05-28',
            crop_type: 'Kambu',
            activity_details: 'tractor',
            record_type: 'EXPENSE',
            qty_units: 0,
            amount: 13260,
            notes: 'Field tilling tractor labor'
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

// Helper: Get storage object directly from localStorage
function getStaticStorage() {
    const raw = localStorage.getItem('ENTERPRISE_STATIC_DB_V3');
    if (!raw) {
        localStorage.setItem('ENTERPRISE_STATIC_DB_V3', JSON.stringify(DEFAULT_SEED_DATA));
        return JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
    }
    try {
        return JSON.parse(raw);
    } catch(e) {
        return JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
    }
}

// Helper: Save storage object directly to localStorage
function saveStaticStorage(dataObj) {
    try {
        localStorage.setItem('ENTERPRISE_STATIC_DB_V3', JSON.stringify(dataObj));
    } catch(e) {
        console.warn("Unable to save static storage to localStorage", e);
    }
}

// Helper: Compute dynamic master financial summary (Cumulative All-Time)
function getDynamicMockMonthlySummary() {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const store = getStaticStorage();

    // 1. Petrol Bunk
    let petrolRevenue = 0, petrolProfit = 0;
    (store['/api/petrol-bunk/daily-sales'] || []).forEach(s => {
        petrolRevenue += (parseFloat(s.total_revenue) || 0);
        petrolProfit += (parseFloat(s.total_profit) || 0);
    });
    const petrolExpenses = petrolRevenue - petrolProfit;

    // 2. Shop Rent
    let shopRentIncome = 0;
    (store['/api/shop-rent/payments'] || []).forEach(sp => {
        if (sp.is_paid) {
            shopRentIncome += (parseFloat(sp.amount_paid) || 0);
        }
    });

    // 3. Freight Business (Recognized when company_paid_status === 1)
    let bizRevenue = 0, bizExpenses = 0, bizProfit = 0;
    (store['/api/business/transactions'] || []).forEach(t => {
        if (t.company_paid_status === 1 || t.company_paid_status === true) {
            bizRevenue += (parseFloat(t.company_amount) || 0);
            bizExpenses += (parseFloat(t.supplier_amount) || 0);
            bizProfit += (parseFloat(t.net_profit) || 0);
        }
    });

    // 4. Agriculture
    let agriRevenue = 0, agriExpenses = 0;
    (store['/api/agriculture/records'] || []).forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        if (r.record_type === 'INCOME') agriRevenue += amt;
        else agriExpenses += amt;
    });
    const agriProfit = agriRevenue - agriExpenses;

    // 5. Home Household
    let homeIncome = 0, homeExpenses = 0;
    (store['/api/home/transactions'] || []).forEach(h => {
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

// Universal API Fetch Function (Handles Local SQLite REST Server & Static Fallback)
async function apiFetch(endpoint, options = {}) {
    const cleanEp = endpoint.split('?')[0].replace(/\/$/, '');

    // If running on static host (GitHub Pages) or API_BASE_URL is empty, process directly via LocalStorage
    if (!API_BASE_URL) {
        return handleStaticFallback(cleanEp, options);
    }

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
        console.warn(`Local API server offline, serving ${endpoint} via LocalStorage fallback...`);
        return handleStaticFallback(cleanEp, options);
    }
}

// LocalStorage Fallback Handler
function handleStaticFallback(cleanEp, options) {
    const method = (options.method || 'GET').toUpperCase();
    const store = getStaticStorage();

    // STRICT PASSWORD CHECK FOR AUTH LOGIN
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

    if (method === 'GET') {
        return store[cleanEp] || [];
    }

    if (method === 'POST') {
        let bodyObj = {};
        try {
            bodyObj = JSON.parse(options.body || '{}');
        } catch(e) {}

        bodyObj.id = bodyObj.id || 'id-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        // Mathematical calculations for Petrol Daily Sales
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

        // Mathematical calculations for Freight Business
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

        if (!store[cleanEp]) store[cleanEp] = [];
        store[cleanEp].unshift(bodyObj);
        saveStaticStorage(store);

        return { success: true, id: bodyObj.id, ...bodyObj };
    }

    if (method === 'DELETE') {
        const id = cleanEp.split('/').pop();
        Object.keys(store).forEach(key => {
            if (Array.isArray(store[key])) {
                store[key] = store[key].filter(item => item.id !== id && item.tenant_id !== id);
            }
        });
        saveStaticStorage(store);
        return { success: true, id };
    }

    if (method === 'PUT') {
        const parts = cleanEp.split('/');
        const id = parts[4] || parts[3];
        Object.keys(store).forEach(key => {
            if (Array.isArray(store[key])) {
                store[key].forEach(item => {
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
        saveStaticStorage(store);
        return { success: true, id };
    }

    return { success: true };
}

// ============================================================
// CROSS-DEVICE DATA SYNC CONTROLLER
// ============================================================

function openCloudSyncModal() {
    let modal = document.getElementById('cloudSyncModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cloudSyncModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 520px;">
                <div class="modal-header">
                    <h3>☁️ Cross-Device Data Sync</h3>
                    <button class="modal-close" onclick="closeCloudSyncModal()">&times;</button>
                </div>
                <div style="font-size: 14px; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
                    Transfer and sync your financial entries instantly between mobile phones, laptops, and tablets.
                </div>

                <!-- Export / Copy Section -->
                <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                    <div style="font-weight: 700; color: #fff; margin-bottom: 8px;">1. Share Data from this Device</div>
                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Copy your sync code to send to your friend or your other phone via WhatsApp/SMS.</div>
                    <button class="btn btn-accent btn-block" onclick="copySyncCode()">📋 Copy 1-Click Sync Code</button>
                </div>

                <!-- Import Section -->
                <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: 12px; padding: 16px;">
                    <div style="font-weight: 700; color: #fff; margin-bottom: 8px;">2. Load / Merge Data on this Device</div>
                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 10px;">Paste the code received from your friend or other device below:</div>
                    <textarea id="importSyncCodeInput" class="form-control" rows="3" placeholder="Paste 1-Click Sync Code here..." style="font-size: 12px; margin-bottom: 10px; font-family: monospace;"></textarea>
                    <button class="btn btn-secondary btn-block" onclick="importSyncCode()">📥 Import & Merge Data</button>
                </div>

                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn btn-secondary" onclick="closeCloudSyncModal()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

function closeCloudSyncModal() {
    const modal = document.getElementById('cloudSyncModal');
    if (modal) modal.style.display = 'none';
}

function copySyncCode() {
    const store = getStaticStorage();
    const jsonStr = JSON.stringify(store);
    const encoded = btoa(encodeURIComponent(jsonStr));

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(encoded).then(() => {
            alert("✅ 1-Click Sync Code copied to clipboard!\n\nYou can now paste and send this code to your friend via WhatsApp, Email, or SMS.");
        }).catch(() => {
            prompt("Copy this 1-Click Sync Code and send it to your friend:", encoded);
        });
    } else {
        prompt("Copy this 1-Click Sync Code and send it to your friend:", encoded);
    }
}

function importSyncCode() {
    const inputEl = document.getElementById('importSyncCodeInput');
    const rawVal = (inputEl ? inputEl.value : '').trim();

    if (!rawVal) {
        alert("❌ Please paste a valid 1-Click Sync Code in the box above.");
        return;
    }

    try {
        const decodedJsonStr = decodeURIComponent(atob(rawVal));
        const importedData = JSON.parse(decodedJsonStr);

        const currentStore = getStaticStorage();

        // Merge records across all endpoints without losing existing entries
        Object.keys(importedData).forEach(endpoint => {
            if (Array.isArray(importedData[endpoint])) {
                if (!currentStore[endpoint]) currentStore[endpoint] = [];
                
                importedData[endpoint].forEach(newItem => {
                    const exists = currentStore[endpoint].some(existing => existing.id === newItem.id);
                    if (!exists) {
                        currentStore[endpoint].unshift(newItem);
                    }
                });
            }
        });

        saveStaticStorage(currentStore);
        alert("🎉 Data imported successfully! All records from your friend's device are now synchronized on your phone/laptop.");
        closeCloudSyncModal();
        window.location.reload();
    } catch(e) {
        alert("❌ Invalid Sync Code. Please make sure you copied the entire code string.");
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
