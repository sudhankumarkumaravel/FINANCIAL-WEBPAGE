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

// Utility: Generic API Request Helper
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
        console.warn(`Local API call to ${endpoint} failed, checking cloud/fallback...`, err);
        throw err;
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
