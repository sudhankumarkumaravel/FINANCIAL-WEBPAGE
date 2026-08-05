// ============================================================
// BUSINESS LEDGER MODULE - WEIGHBRIDGE FREIGHT & PROFIT RECOGNITION LOGIC
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('businessPage')) {
        initBusinessPage();
    }
});

function initBusinessPage() {
    const today = new Date().toISOString().split('T')[0];
    const txDateEl = document.getElementById('txDateInput');
    if (txDateEl) txDateEl.value = today;

    loadBusinessTransactions();
}

// 1. Live Weighbridge Math Calculator
function calculateLiveFreight() {
    const emptyWeight = parseFloat(document.getElementById('emptyWeightInput').value) || 0;
    const totalWeight = parseFloat(document.getElementById('totalWeightInput').value) || 0;
    const buyRate = parseFloat(document.getElementById('buyRateInput').value) || 0;
    const sellRate = parseFloat(document.getElementById('sellRateInput').value) || 0;

    const netWeight = Math.max(0, totalWeight - emptyWeight);
    const supplierAmt = netWeight * buyRate;
    const companyAmt = netWeight * sellRate;
    const profit = companyAmt - supplierAmt;

    const netWeightEl = document.getElementById('netWeightDisplay');
    const supplierAmtEl = document.getElementById('previewSupplierAmt');
    const companyAmtEl = document.getElementById('previewCompanyAmt');
    const profitEl = document.getElementById('previewProfitAmt');

    if (netWeightEl) netWeightEl.value = `${netWeight.toFixed(2)} Tons`;
    if (supplierAmtEl) supplierAmtEl.innerText = "₹ " + formatCurrency(supplierAmt);
    if (companyAmtEl) companyAmtEl.innerText = "₹ " + formatCurrency(companyAmt);
    if (profitEl) {
        profitEl.innerText = "₹ " + formatCurrency(profit);
        profitEl.style.color = profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)';
    }
}

// 2. Submit Weighbridge Transaction Form
async function handleBusinessSubmit(event) {
    event.preventDefault();

    const emptyWeight = parseFloat(document.getElementById('emptyWeightInput').value) || 0;
    const totalWeight = parseFloat(document.getElementById('totalWeightInput').value) || 0;

    if (totalWeight < emptyWeight) {
        alert("⚠️ Total Gross Weight must be greater than Empty Truck Weight!");
        return;
    }

    const payload = {
        transaction_date: document.getElementById('txDateInput').value,
        vehicle_number: document.getElementById('vehicleNoInput').value,
        supplier_name: document.getElementById('supplierNameInput').value,
        company_name: document.getElementById('companyNameInput').value,
        empty_weight_tons: emptyWeight,
        total_weight_tons: totalWeight,
        buy_rate_per_ton: parseFloat(document.getElementById('buyRateInput').value) || 0,
        sell_rate_per_ton: parseFloat(document.getElementById('sellRateInput').value) || 0,
        supplier_paid_status: document.getElementById('supplierPaidSelect').value === "1",
        company_paid_status: document.getElementById('companyPaidSelect').value === "1"
    };

    try {
        await apiFetch('/api/business/transactions', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        alert("✅ Weighbridge Freight Trade Entry Saved!");
        document.getElementById('businessForm').reset();
        initBusinessPage();
    } catch (e) {
        alert("Failed to save entry: " + e.message);
    }
}

// 3. Load Business Transactions & Compute Profit Recognition Math
async function loadBusinessTransactions() {
    const tbody = document.getElementById('businessTableBody');
    if (!tbody) return;

    try {
        const txs = await apiFetch('/api/business/transactions');
        tbody.innerHTML = '';

        if (!txs || txs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center" style="padding: 24px; color: #94a3b8;">No weighbridge freight entries recorded. Log a transaction above.</td></tr>';
            return;
        }

        let realizedNetProfit = 0;
        let pendingCompanyProfit = 0;
        let totalSupplierPayable = 0;
        let totalCompanyReceivable = 0;

        txs.forEach(t => {
            const supplierAmt = parseFloat(t.supplier_amount) || 0;
            const companyAmt = parseFloat(t.company_amount) || 0;
            const profit = parseFloat(t.net_profit) || 0;

            // REALIZED PROFIT CONDITION: ONLY COUNT PROFIT IF COMPANY HAS PAID!
            if (t.company_paid_status === 1) {
                realizedNetProfit += profit;
            } else {
                pendingCompanyProfit += profit;
            }

            if (t.supplier_paid_status === 0) {
                totalSupplierPayable += supplierAmt;
            }

            if (t.company_paid_status === 0) {
                totalCompanyReceivable += companyAmt;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${t.transaction_date}</td>
                <td><strong class="uppercase-input">${t.vehicle_number}</strong></td>
                <td>${t.supplier_name}</td>
                <td>${t.company_name}</td>
                <td style="font-weight: 700;">${(parseFloat(t.net_weight_tons) || 0).toFixed(2)} T</td>
                <td>₹ ${formatCurrency(supplierAmt)}</td>
                <td>₹ ${formatCurrency(companyAmt)}</td>
                <td style="font-weight: 800;">
                    ${t.company_paid_status === 1 
                        ? `<span style="color: var(--status-success);">+ ₹ ${formatCurrency(profit)}</span>` 
                        : `<span style="color: var(--mod-petrol); font-size: 12px;">⏳ Pending (₹ ${formatCurrency(profit)})</span>`}
                </td>
                <td>
                    <button class="pill ${t.supplier_paid_status ? 'pill-paid' : 'pill-pending'}" onclick="toggleSupplierPaid('${t.id}')">
                        ${t.supplier_paid_status ? '✓ PAID' : '⏳ PENDING'}
                    </button>
                </td>
                <td>
                    <button class="pill ${t.company_paid_status ? 'pill-paid' : 'pill-pending'}" onclick="toggleCompanyPaid('${t.id}')">
                        ${t.company_paid_status ? '✓ RECEIVED' : '⏳ PENDING'}
                    </button>
                </td>
                <td class="text-center">
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteBusinessTx('${t.id}')">🗑️ Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update KPIs
        const kpiNetProfit = document.getElementById('kpiNetTradeProfit');
        const kpiNetProfitSub = document.getElementById('kpiNetTradeProfitSub');
        const kpiSupplierPayable = document.getElementById('kpiSupplierPayable');
        const kpiCompanyReceivable = document.getElementById('kpiCompanyReceivable');
        const kpiTotalTrips = document.getElementById('kpiTotalTrips');

        if (kpiNetProfit) {
            kpiNetProfit.innerText = "₹ " + formatCurrency(realizedNetProfit);
            kpiNetProfit.style.color = realizedNetProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)';
        }
        if (kpiNetProfitSub) {
            kpiNetProfitSub.innerText = pendingCompanyProfit > 0 
                ? `Pending Co. Profit: ₹ ${formatCurrency(pendingCompanyProfit)}` 
                : `100% Recognized (${txs.length} Trips)`;
        }
        if (kpiSupplierPayable) kpiSupplierPayable.innerText = "₹ " + formatCurrency(totalSupplierPayable);
        if (kpiCompanyReceivable) kpiCompanyReceivable.innerText = "₹ " + formatCurrency(totalCompanyReceivable);
        if (kpiTotalTrips) kpiTotalTrips.innerText = `${txs.length} Trips Logged`;

    } catch (e) {
        console.error("Error loading business transactions", e);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="color: var(--status-danger);">Failed to load business transactions. ${e.message}</td></tr>`;
    }
}

// Toggle Supplier Payment Status
async function toggleSupplierPaid(id) {
    try {
        await apiFetch(`/api/business/transactions/${id}/toggle-supplier-paid`, { method: 'PUT' });
        loadBusinessTransactions();
    } catch (e) {
        alert("Failed to toggle supplier status: " + e.message);
    }
}

// Toggle Company Receipt Status
async function toggleCompanyPaid(id) {
    try {
        await apiFetch(`/api/business/transactions/${id}/toggle-company-paid`, { method: 'PUT' });
        loadBusinessTransactions();
    } catch (e) {
        alert("Failed to toggle company status: " + e.message);
    }
}

// Delete Transaction Record
async function deleteBusinessTx(id) {
    if (!confirm("Are you sure you want to delete this freight transaction?")) return;
    try {
        await apiFetch(`/api/business/transactions/${id}`, { method: 'DELETE' });
        loadBusinessTransactions();
    } catch (e) {
        alert("Failed to delete entry: " + e.message);
    }
}
