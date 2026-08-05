// ============================================================
// AGRICULTURE MODULE LOGIC (LIVE BACKEND CONNECTED)
// ============================================================

let agriRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('agriculturePage')) {
        fetchAgriRecords();
    }
});

// Fetch Agriculture Records from Live Backend API / Supabase
async function fetchAgriRecords() {
    try {
        const data = await apiFetch('/api/agriculture/records');
        if (data && data.length > 0) {
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
    const historyHtml = [];

    agriRecords.forEach(item => {
        const amt = parseFloat(item.amount) || 0;
        const qty = parseFloat(item.yield_quantity) || 0;

        if (item.record_type === 'INCOME') {
            totalHarvestRevenue += amt;
            totalYieldCount += qty;
        } else {
            totalFarmExpense += amt;
        }

        const isIncome = item.record_type === 'INCOME';
        const badgeClass = isIncome ? 'pill-income' : 'pill-expense';
        const colorStyle = isIncome ? 'color: var(--success);' : 'color: var(--danger);';

        historyHtml.push(`
            <tr>
                <td style="white-space:nowrap;">${formatDate(item.activity_date)}</td>
                <td><b>${item.crop_name}</b></td>
                <td><span class="pill pill-paid" style="background: var(--accent-soft); color: var(--accent);">${item.activity_type}</span></td>
                <td><span class="pill ${badgeClass}">${item.record_type}</span></td>
                <td>${qty > 0 ? `${qty} ${item.yield_unit || 'Units'}` : '-'}</td>
                <td class="text-right" style="font-weight:700; ${colorStyle}">
                    ₹ ${formatCurrency(amt)}
                </td>
                <td>${item.notes || '-'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteAgriRecord('${item.id}')">🗑️</button>
                </td>
            </tr>
        `);
    });

    const netFarmYield = totalHarvestRevenue - totalFarmExpense;

    const kpiRevenueEl = document.getElementById('kpiAgriRevenue');
    const kpiExpenseEl = document.getElementById('kpiAgriExpense');
    const kpiNetEl = document.getElementById('kpiAgriNet');

    if (kpiRevenueEl) kpiRevenueEl.innerText = "₹ " + formatCurrency(totalHarvestRevenue);
    if (kpiExpenseEl) kpiExpenseEl.innerText = "₹ " + formatCurrency(totalFarmExpense);
    if (kpiNetEl) {
        kpiNetEl.innerText = "₹ " + formatCurrency(netFarmYield);
        kpiNetEl.style.color = netFarmYield >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    const tableEl = document.getElementById('agriLogTable');
    if (tableEl) {
        tableEl.innerHTML = historyHtml.length > 0 ? historyHtml.join('') : '<tr><td colspan="8" class="text-center" style="color: var(--text-muted);">No agriculture logs recorded yet.</td></tr>';
    }
}

function openAddAgriModal() {
    const modal = document.getElementById('agriModal');
    if (modal) modal.style.display = 'flex';
}

function closeAddAgriModal() {
    const modal = document.getElementById('agriModal');
    if (modal) modal.style.display = 'none';
}

// Save Agriculture Log to Server
async function saveAgriRecord(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('saveAgriBtn');
    if (saveBtn) saveBtn.disabled = true;

    const date = document.getElementById('agriDate').value || new Date().toISOString().split('T')[0];
    const crop = document.getElementById('agriCrop').value.trim();
    const activity = document.getElementById('agriActivity').value.trim();
    const type = document.getElementById('agriRecordType').value;
    const amount = parseFloat(document.getElementById('agriAmount').value) || 0;
    const qty = parseFloat(document.getElementById('agriYieldQty').value) || 0;
    const unit = document.getElementById('agriYieldUnit').value.trim();
    const notes = document.getElementById('agriNotes').value.trim();

    if (!crop || !activity || amount <= 0) {
        alert("Please fill in Crop Name, Activity Type, and Amount.");
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    const newRecord = {
        activity_date: date,
        crop_name: crop,
        activity_type: activity,
        record_type: type,
        amount: amount,
        yield_quantity: qty,
        yield_unit: unit || 'Kg',
        notes: notes
    };

    try {
        await apiFetch('/api/agriculture/records', {
            method: 'POST',
            body: JSON.stringify(newRecord)
        });

        closeAddAgriModal();
        document.getElementById('agriForm').reset();
        await fetchAgriRecords();
    } catch (err) {
        console.error("Failed to save agriculture record to server:", err);
        newRecord.id = 'temp-' + Date.now();
        agriRecords.unshift(newRecord);
        closeAddAgriModal();
        renderAgriDashboard();
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

// Delete Agriculture Record from Database
async function deleteAgriRecord(id) {
    if (!confirm("Are you sure you want to delete this farm record?")) return;
    try {
        await apiFetch(`/api/agriculture/records/${id}`, { method: 'DELETE' });
        await fetchAgriRecords();
    } catch (err) {
        console.error("Failed to delete agriculture record:", err);
        agriRecords = agriRecords.filter(a => a.id !== id);
        renderAgriDashboard();
    }
}
