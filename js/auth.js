// ============================================================
// AUTHENTICATION & ROUTE GUARD MODULE
// ============================================================

const AUTH_KEY = 'enterprise_auth_session';

// Check auth status on protected pages
function checkAuthGuard() {
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    const session = sessionStorage.getItem(AUTH_KEY);

    if (!session && !isLoginPage) {
        // Redirect to login page if unauthenticated
        window.location.href = 'index.html';
    } else if (session && isLoginPage) {
        // Redirect to dashboard if already logged in
        window.location.href = 'dashboard.html';
    }
}

// Perform login
function performLogin(username, password) {
    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (u === 'sudhankumar' && p === 'admin123') {
        const sessionData = {
            username: 'sudhankumar',
            displayName: 'Sudhankumar',
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
        return { success: true };
    }
    return { success: false, message: 'Invalid username or password.' };
}

// Perform logout
function performLogout() {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.href = 'index.html';
}

// Initialize date displays across pages
function initPageHeader() {
    const dateEl = document.getElementById('currentDateNav');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const session = sessionStorage.getItem(AUTH_KEY);
    if (session) {
        const data = JSON.parse(session);
        const userEl = document.getElementById('currentUserDisplay');
        if (userEl) userEl.innerText = `👤 ${data.displayName}`;
    }
}

// Execute guard on script load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthGuard();
    initPageHeader();
});
