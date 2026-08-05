// ============================================================
// AGRICULTURE MODULE LOGIC (LIVE BACKEND CONNECTED)
// ============================================================

let agriRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('agriculturePage')) {
        initAgriPage();
    }
});

function initAgriPage() {
    const today = new Date().toISOString().split('T')[0];
    const agriDateEl = document.getElementById('agriDate');
    if (agriDateEl) agriDateEl.value = today;

    fetchAgriRecords();
}

// Fetch Agriculture Records from Live Backend API / Supabase
async function fetchAgriRecords() {
    try {
        const data = await apiFetch('/api/agriculture/records');
        if (data && Array.isArray(data)) {
            agriRecords = data;
            renderAgriDashboard();
            return;
        }
    } catch (err) {
        console.warn("Backend API call failed, checking Supabase...", err);
    }

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('agriculture_records')
                .select('*')
                .order('activity_date', { ascending: false });

            if (!error && data && data.length > 0) {
                agriRecords = data;
                renderAgriDashboard();
                return;
            }
        } catch (sbErr) {
            console.error("Supabase fetch failed:", sbErr);
        }
    }

    renderAgriDashboard();
}

// Render Agriculture Dashboard KPIs & Log Table
function renderAgriDashboard() {
    let totalHarvestRevenue = 0;
    let totalFarmExpense = 0;
    let totalYieldCount = 0;
    const tbody = document.getElementById('agriLogTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!agriRecords || agriRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 24px; color: #94a3b8;">No agricultural logs recorded yet. Add a record above.</td></tr>';
        updateAgriKPIs(0, 0, 0);
        return;
    }

    agriRecords.forEach(item => {
        const amt = parseFloat(item.amount) || 0;
        const qty = parseFloat(item.qty_units || item.yield_quantity) || 0;

        if (item.record_type === 'INCOME') {
            totalHarvestRevenue += amt;
            totalYieldCount += qty;
        } else {
            totalFarmExpense += amt;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.record_date || item.activity_date || '-'}</td>
            <td><strong>${item.crop_type || item.crop_name}</strong></td>
            <td>${item.activity_details || item.activity_type}</td>
            <td>
                <span class="pill ${item.record_type === 'INCOME' ? 'pill-income' : 'pill-expense'}">
                    ${item.record_type === 'INCOME' ? '🌾 HARVEST INFLOW' : '🚜 FARM EXPENSE'}
                </span>
            </td>
            <td>${qty > 0 ? qty.toFixed(2) : '-'}</td>
            <td class="text-right" style="font-weight: 800; color: ${item.record_type === 'INCOME' ? 'var(--status-success)' : 'var(--status-danger)'};">
                ${item.record_type === 'INCOME' ? '+' : '-'} ₹ ${formatCurrency(amt)}
            </td>
            <td>${item.notes || '-'}</td>
            <td class="text-center">
                <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteAgriRecord('${item.id}')">🗑️ Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateAgriKPIs(totalHarvestRevenue, totalFarmExpense, totalYieldCount);
}

function updateAgriKPIs(revenue, expense, yieldCount) {
    const kpiRev = document.getElementById('agriTotalRevenue');
    const kpiExp = document.getElementById('agriTotalExpense');
    const kpiNet = document.getElementById('agriNetProfit');
    const kpiYield = document.getElementById('agriTotalYield');

    const netProfit = revenue - expense;

    if (kpiRev) kpiRev.innerText = "₹ " + formatCurrency(revenue);
    if (kpiExp) kpiExp.innerText = "₹ " + formatCurrency(expense);
    if (kpiNet) {
        kpiNet.innerText = "₹ " + formatCurrency(netProfit);
        kpiNet.style.color = netProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)';
    }
    if (kpiYield) kpiYield.innerText = `${yieldCount.toFixed(0)} Units`;
}

// Modal Control
function openAddAgriModal() {
    const modal = document.getElementById('agriModal');
    if (modal) {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('agriDate');
        if (dateInput && !dateInput.value) dateInput.value = today;
        modal.style.display = 'flex';
    }
}

function closeAddAgriModal() {
    const modal = document.getElementById('agriModal');
    if (modal) modal.style.display = 'none';
}

// Submit Agriculture Form
async function saveAgriRecord(event) {
    event.preventDefault();

    const payload = {
        record_date: document.getElementById('agriDate').value,
        crop_type: document.getElementById('agriCrop').value,
        activity_details: document.getElementById('agriActivity').value,
        record_type: document.getElementById('agriRecordType').value,
        qty_units: parseFloat(document.getElementById('agriYieldQty').value) || 0,
        amount: parseFloat(document.getElementById('agriAmount').value) || 0
    };

    try {
        await apiFetch('/api/agriculture/records', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        alert("✅ Agricultural record saved successfully!");
        closeAddAgriModal();
        document.getElementById('agriForm').reset();
        initAgriPage();
    } catch (e) {
        alert("Failed to save farm record: " + e.message);
    }
}

// Delete Agriculture Record
async function deleteAgriRecord(id) {
    if (!confirm("Are you sure you want to delete this agriculture entry?")) return;
    try {
        await apiFetch(`/api/agriculture/records/${id}`, { method: 'DELETE' });
        fetchAgriRecords();
    } catch (e) {
        alert("Failed to delete entry: " + e.message);
    }
}
