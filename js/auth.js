// ============================================================
// AUTHENTICATION & ROUTE GUARD CONTROLLER
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if on protected page
    const isLoginPage = document.getElementById('loginPage');
    const token = localStorage.getItem('enterprise_token');

    if (!isLoginPage && !token) {
        window.location.href = 'index.html';
        return;
    }

    if (isLoginPage && token) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Set current user & date
    const userDisplay = document.getElementById('currentUserDisplay');
    const dateDisplay = document.getElementById('currentDateNav');

    if (userDisplay) {
        const user = JSON.parse(localStorage.getItem('enterprise_user') || '{"username":"admin"}');
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

// Login Handler
async function performLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('usernameInput').value;
    const passwordInput = document.getElementById('passwordInput').value;
    const loginError = document.getElementById('loginError');

    if (loginError) loginError.style.display = 'none';

    try {
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        if (data.success) {
            localStorage.setItem('enterprise_token', data.token);
            localStorage.setItem('enterprise_user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } else {
            showLoginError(data.error || "Invalid username or password");
        }
    } catch (err) {
        console.warn("API Login failed, trying offline auth fallback...", err);
        // Fallback for static GitHub Pages / offline mode (Updated password: sudhan@2008@)
        if (usernameInput === 'admin' && passwordInput === 'sudhan@2008@') {
            localStorage.setItem('enterprise_token', 'offline-token-12345');
            localStorage.setItem('enterprise_user', JSON.stringify({ username: 'admin', role: 'Administrator' }));
            window.location.href = 'dashboard.html';
        } else {
            showLoginError("Invalid credentials. Try: admin / sudhan@2008@");
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
        localStorage.removeItem('enterprise_token');
        localStorage.removeItem('enterprise_user');
        window.location.href = 'index.html';
    }
}
