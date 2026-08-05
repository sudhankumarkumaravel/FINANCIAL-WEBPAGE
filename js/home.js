// ============================================================
// HOME & HOUSEHOLD MODULE - EXPENSES, BUDGET & SURPLUS LOGIC
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('homePage')) {
        initHomePage();
    }
});

function initHomePage() {
    const today = new Date().toISOString().split('T')[0];
    const homeDateEl = document.getElementById('homeDateInput');
    if (homeDateEl) homeDateEl.value = today;

    loadHomeLedger();
}

// 1. Submit Household Transaction Form
async function handleHomeSubmit(event) {
    event.preventDefault();

    const payload = {
        transaction_date: document.getElementById('homeDateInput').value,
        title: document.getElementById('homeTitleInput').value,
        category: document.getElementById('homeCategorySelect').value,
        transaction_type: document.getElementById('homeTypeSelect').value,
        amount: parseFloat(document.getElementById('homeAmountInput').value) || 0,
        notes: document.getElementById('homeNotesInput').value
    };

    try {
        await apiFetch('/api/home/transactions', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        alert("✅ Household transaction saved successfully!");
        document.getElementById('homeTitleInput').value = '';
        document.getElementById('homeAmountInput').value = '';
        document.getElementById('homeNotesInput').value = '';
        loadHomeLedger();
    } catch (e) {
        alert("Failed to save household entry: " + e.message);
    }
}

// 2. Load Household Ledger & Compute Budget Analytics
async function loadHomeLedger() {
    const tbody = document.getElementById('homeTableBody');
    if (!tbody) return;

    try {
        const items = await apiFetch('/api/home/transactions');
        tbody.innerHTML = '';

        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">No household records found. Add an item above.</td></tr>';
            return;
        }

        const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
        let monthlyIncome = 0, monthlyExpenses = 0, expCount = 0;

        items.forEach(item => {
            const amt = parseFloat(item.amount) || 0;
            const itemMonth = (item.transaction_date || '').slice(0, 7);

            if (itemMonth === currentMonthStr) {
                if (item.transaction_type === 'INCOME') {
                    monthlyIncome += amt;
                } else {
                    monthlyExpenses += amt;
                    expCount++;
                }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.transaction_date}</td>
                <td><strong>${item.title}</strong></td>
                <td><span class="pill pill-paid">${item.category}</span></td>
                <td><span class="pill ${item.transaction_type === 'INCOME' ? 'pill-income' : 'pill-expense'}">${item.transaction_type}</span></td>
                <td style="font-weight: 700; color: ${item.transaction_type === 'INCOME' ? 'var(--status-success)' : 'var(--status-danger)'};">
                    ${item.transaction_type === 'INCOME' ? '+' : '-'} ₹ ${formatCurrency(amt)}
                </td>
                <td style="color: #94a3b8; font-size: 13px;">${item.notes || '-'}</td>
                <td class="text-center">
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteHomeRecord('${item.id}')">🗑️ Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Compute Household Savings & Budget Metrics
        const netSavings = monthlyIncome - monthlyExpenses;
        const targetBudget = 50000;
        const budgetUsedPct = Math.min(100, Math.round((monthlyExpenses / targetBudget) * 100));
        const savingsRate = monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;

        const kpiHomeIncome = document.getElementById('kpiHomeIncome');
        const kpiHomeExpenses = document.getElementById('kpiHomeExpenses');
        const kpiHomeExpensesCount = document.getElementById('kpiHomeExpensesCount');
        const kpiHomeSavings = document.getElementById('kpiHomeSavings');
        const kpiHomeSavingsRate = document.getElementById('kpiHomeSavingsRate');
        const kpiHomeBudgetUsed = document.getElementById('kpiHomeBudgetUsed');
        const kpiHomeBudgetMeter = document.getElementById('kpiHomeBudgetMeter');

        if (kpiHomeIncome) kpiHomeIncome.innerText = "₹ " + formatCurrency(monthlyIncome);
        if (kpiHomeExpenses) kpiHomeExpenses.innerText = "₹ " + formatCurrency(monthlyExpenses);
        if (kpiHomeExpensesCount) kpiHomeExpensesCount.innerText = `${expCount} Living Items Logged`;
        if (kpiHomeSavings) {
            kpiHomeSavings.innerText = "₹ " + formatCurrency(netSavings);
            kpiHomeSavings.style.color = netSavings >= 0 ? 'var(--mod-home)' : 'var(--status-danger)';
        }
        if (kpiHomeSavingsRate) kpiHomeSavingsRate.innerText = `Surplus Margin: ${savingsRate}%`;
        if (kpiHomeBudgetUsed) kpiHomeBudgetUsed.innerText = `${budgetUsedPct}% of ₹50k Budget Used`;
        if (kpiHomeBudgetMeter) kpiHomeBudgetMeter.style.width = `${budgetUsedPct}%`;

    } catch (e) {
        console.error("Error loading household ledger", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--status-danger);">Failed to load household ledger. ${e.message}</td></tr>`;
    }
}

// Delete Household Record
async function deleteHomeRecord(id) {
    if (!confirm("Are you sure you want to delete this household entry?")) return;
    try {
        await apiFetch(`/api/home/transactions/${id}`, { method: 'DELETE' });
        loadHomeLedger();
    } catch (e) {
        alert("Failed to delete entry: " + e.message);
    }
}
