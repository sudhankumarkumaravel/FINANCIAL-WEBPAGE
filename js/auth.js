// ============================================================
// AUTHENTICATION & ROUTE GUARD CONTROLLER (STRICT SESSION ONLY)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Purge legacy persistent localStorage tokens if present
    localStorage.removeItem('enterprise_token');
    localStorage.removeItem('enterprise_user');

    const isLoginPage = document.getElementById('loginPage');
    const token = sessionStorage.getItem('enterprise_token');

    // If on login page, ALWAYS clear session storage so user MUST enter password!
    if (isLoginPage) {
        sessionStorage.removeItem('enterprise_token');
        sessionStorage.removeItem('enterprise_user');
        return;
    }

    // On protected pages (dashboard, petrol, shop, business, agri, home), redirect to login if no active session
    if (!isLoginPage && !token) {
        window.location.href = 'index.html';
        return;
    }

    // Set current user & date display
    const userDisplay = document.getElementById('currentUserDisplay');
    const dateDisplay = document.getElementById('currentDateNav');

    if (userDisplay) {
        const user = JSON.parse(sessionStorage.getItem('enterprise_user') || '{"username":"sudhankumar"}');
        userDisplay.innerText = `👤 ${user.username}`;
    }

    if (dateDisplay) {
        const now = new Date();
        dateDisplay.innerText = now.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
});

// Strict Login Handler - Password MUST match "sudhan@2008@"
// Tokens are saved ONLY in sessionStorage so closing the tab or browser automatically logs out!
async function performLogin(event) {
    event.preventDefault();
    const usernameInput = (document.getElementById('usernameInput')?.value || 'sudhankumar').trim();
    const passwordInput = document.getElementById('passwordInput')?.value || '';
    const loginError = document.getElementById('loginError');

    if (loginError) loginError.style.display = 'none';

    if (!passwordInput) {
        showLoginError("❌ Please enter your password.");
        return;
    }

    // Strict Password Validation
    if (passwordInput !== 'sudhan@2008@') {
        showLoginError("❌ Incorrect password. Access denied.");
        return;
    }

    try {
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        if (data && data.success) {
            sessionStorage.setItem('enterprise_token', data.token || 'enterprise-session-token-xyz');
            sessionStorage.setItem('enterprise_user', JSON.stringify(data.user || { username: 'sudhankumar', role: 'Administrator' }));
            window.location.href = 'dashboard.html';
        } else {
            showLoginError("❌ Incorrect password. Access denied.");
        }
    } catch (err) {
        console.warn("API Login network exception, checking offline credentials...", err);
        if (passwordInput === 'sudhan@2008@') {
            sessionStorage.setItem('enterprise_token', 'offline-token-12345');
            sessionStorage.setItem('enterprise_user', JSON.stringify({ username: 'sudhankumar', role: 'Administrator' }));
            window.location.href = 'dashboard.html';
        } else {
            showLoginError("❌ Incorrect password. Access denied.");
        }
    }
}

function showLoginError(msg) {
    const loginError = document.getElementById('loginError');
    if (loginError) {
        loginError.innerText = msg;
        loginError.style.display = 'block';
    } else {
        alert(msg);
    }
}

// Logout Handler
function performLogout() {
    if (confirm("Are you sure you want to sign out of EnterpriseOS?")) {
        sessionStorage.removeItem('enterprise_token');
        sessionStorage.removeItem('enterprise_user');
        localStorage.removeItem('enterprise_token');
        localStorage.removeItem('enterprise_user');
        window.location.href = 'index.html';
    }
}
