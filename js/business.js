// ============================================================
// BUSINESS LEDGER MODULE - WEIGHBRIDGE FREIGHT & PDF REPORT GENERATOR
// ============================================================

let cachedBusinessTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('businessPage')) {
        initBusinessPage();
    }
});

function initBusinessPage() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    const txDateEl = document.getElementById('txDateInput');
    const pdfMonthEl = document.getElementById('pdfMonthInput');

    if (txDateEl) txDateEl.value = today;
    if (pdfMonthEl) pdfMonthEl.value = currentMonth;

    loadBusinessTradesLedger();
}

// 1. Live Weighbridge Math Calculator
function calculateLiveTrade() {
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
    const profitEl = document.getElementById('previewProfit');

    if (netWeightEl) netWeightEl.value = `${netWeight.toFixed(2)} Tons`;
    if (supplierAmtEl) supplierAmtEl.innerText = "₹ " + formatCurrency(supplierAmt);
    if (companyAmtEl) companyAmtEl.innerText = "₹ " + formatCurrency(companyAmt);
    if (profitEl) {
        profitEl.innerText = "₹ " + formatCurrency(profit);
        profitEl.style.color = profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)';
    }
}

// 2. Submit Weighbridge Transaction Form
async function handleTradeSubmit(event) {
    event.preventDefault();

    const emptyWeight = parseFloat(document.getElementById('emptyWeightInput').value) || 0;
    const totalWeight = parseFloat(document.getElementById('totalWeightInput').value) || 0;

    if (totalWeight < emptyWeight) {
        alert("⚠️ Total Gross Weight must be greater than Empty Truck Weight!");
        return;
    }

    const payload = {
        transaction_date: document.getElementById('txDateInput').value,
        vehicle_number: document.getElementById('vehicleNumberInput').value,
        supplier_name: document.getElementById('supplierNameInput').value,
        company_name: document.getElementById('companyNameInput').value,
        empty_weight_tons: emptyWeight,
        total_weight_tons: totalWeight,
        buy_rate_per_ton: parseFloat(document.getElementById('buyRateInput').value) || 0,
        sell_rate_per_ton: parseFloat(document.getElementById('sellRateInput').value) || 0,
        supplier_paid_status: document.getElementById('supplierPaidCheckbox').checked,
        company_paid_status: document.getElementById('companyPaidCheckbox').checked
    };

    try {
        await apiFetch('/api/business/transactions', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        alert("✅ Weighbridge Freight Trade Entry Saved!");
        document.getElementById('businessTradeForm').reset();
        initBusinessPage();
    } catch (e) {
        alert("Failed to save entry: " + e.message);
    }
}

// 3. Load Business Transactions & Compute Profit Recognition Math
async function loadBusinessTradesLedger() {
    const tbody = document.getElementById('businessTradesTableBody');
    if (!tbody) return;

    const currentMonthStr = new Date().toISOString().slice(0, 7);

    try {
        cachedBusinessTransactions = await apiFetch('/api/business/transactions');
        tbody.innerHTML = '';

        if (!cachedBusinessTransactions || !Array.isArray(cachedBusinessTransactions) || cachedBusinessTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center" style="padding: 24px; color: #94a3b8;">No weighbridge freight entries recorded. Log a transaction above.</td></tr>';
            updateKPIs(0, 0, 0, 0, 0);
            return;
        }

        let monthNetProfit = 0;
        let monthTonnage = 0;
        let totalSupplierPending = 0;
        let totalCompanyPending = 0;
        let supplierUnpaidCount = 0;
        let companyPendingCount = 0;

        cachedBusinessTransactions.forEach(t => {
            const supplierAmt = parseFloat(t.supplier_amount) || 0;
            const companyAmt = parseFloat(t.company_amount) || 0;
            const profit = parseFloat(t.net_profit) || 0;
            const netWeight = parseFloat(t.net_weight_tons) || 0;
            const isCurrentMonth = (t.transaction_date || '').startsWith(currentMonthStr);

            if (isCurrentMonth) {
                if (t.company_paid_status === 1) {
                    monthNetProfit += profit;
                }
                monthTonnage += netWeight;
            }

            if (t.supplier_paid_status === 0) {
                totalSupplierPending += supplierAmt;
                supplierUnpaidCount++;
            }

            if (t.company_paid_status === 0) {
                totalCompanyPending += companyAmt;
                companyPendingCount++;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${t.transaction_date}</td>
                <td><strong class="uppercase-input" style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px;">${t.vehicle_number}</strong></td>
                <td>${t.supplier_name}</td>
                <td>${t.company_name}</td>
                <td style="font-weight: 700; color: var(--mod-shop);">${netWeight.toFixed(2)} T</td>
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

        updateKPIs(monthNetProfit, monthTonnage, totalSupplierPending, totalCompanyPending, cachedBusinessTransactions.length, supplierUnpaidCount, companyPendingCount);

    } catch (e) {
        console.error("Error loading business transactions", e);
        tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="color: var(--status-danger);">Failed to load business transactions. ${e.message}</td></tr>`;
    }
}

function updateKPIs(monthNetProfit, monthTonnage, supplierPending, companyPending, totalTrades, supplierUnpaidCount = 0, companyPendingCount = 0) {
    const kpiProfitEl = document.getElementById('kpiMonthlyProfit');
    const kpiTonsEl = document.getElementById('kpiMonthlyTons');
    const kpiTradesCountEl = document.getElementById('kpiTotalTradesCount');
    const kpiSupplierPendingEl = document.getElementById('kpiSupplierPending');
    const kpiSupplierUnpaidCountEl = document.getElementById('kpiSupplierUnpaidCount');
    const kpiCompanyReceivablesEl = document.getElementById('kpiCompanyReceivables');
    const kpiCompanyPendingCountEl = document.getElementById('kpiCompanyPendingCount');

    if (kpiProfitEl) kpiProfitEl.innerText = "₹ " + formatCurrency(monthNetProfit);
    if (kpiTonsEl) kpiTonsEl.innerText = `${monthTonnage.toFixed(2)} Tons`;
    if (kpiTradesCountEl) kpiTradesCountEl.innerText = `${totalTrades} Total Trips Logged`;
    if (kpiSupplierPendingEl) kpiSupplierPendingEl.innerText = "₹ " + formatCurrency(supplierPending);
    if (kpiSupplierUnpaidCountEl) kpiSupplierUnpaidCountEl.innerText = `${supplierUnpaidCount} Unpaid Suppliers`;
    if (kpiCompanyReceivablesEl) kpiCompanyReceivablesEl.innerText = "₹ " + formatCurrency(companyPending);
    if (kpiCompanyPendingCountEl) kpiCompanyPendingCountEl.innerText = `${companyPendingCount} Pending Receivables`;
}

// Alias for backwards compatibility
function loadBusinessTransactions() {
    loadBusinessTradesLedger();
}

// Toggle Supplier Payment Status
async function toggleSupplierPaid(id) {
    try {
        await apiFetch(`/api/business/transactions/${id}/toggle-supplier-paid`, { method: 'PUT' });
        loadBusinessTradesLedger();
    } catch (e) {
        alert("Failed to toggle supplier status: " + e.message);
    }
}

// Toggle Company Receipt Status
async function toggleCompanyPaid(id) {
    try {
        await apiFetch(`/api/business/transactions/${id}/toggle-company-paid`, { method: 'PUT' });
        loadBusinessTradesLedger();
    } catch (e) {
        alert("Failed to toggle company status: " + e.message);
    }
}

// Delete Transaction Record
async function deleteBusinessTx(id) {
    if (!confirm("Are you sure you want to delete this freight transaction?")) return;
    try {
        await apiFetch(`/api/business/transactions/${id}`, { method: 'DELETE' });
        loadBusinessTradesLedger();
    } catch (e) {
        alert("Failed to delete entry: " + e.message);
    }
}

// ============================================================
// PDF EXPORT MODAL & GENERATION LOGIC
// ============================================================

function openExportPdfModal() {
    const modal = document.getElementById('exportPdfModal');
    if (modal) modal.style.display = 'flex';
}

function closeExportPdfModal() {
    const modal = document.getElementById('exportPdfModal');
    if (modal) modal.style.display = 'none';
}

function onPdfFilterTypeChange() {
    const filterType = document.getElementById('pdfFilterTypeSelect').value;
    const monthContainer = document.getElementById('pdfMonthContainer');
    const yearContainer = document.getElementById('pdfYearContainer');

    if (filterType === 'month') {
        monthContainer.style.display = 'block';
        yearContainer.style.display = 'none';
    } else if (filterType === 'year') {
        monthContainer.style.display = 'none';
        yearContainer.style.display = 'block';
    } else {
        monthContainer.style.display = 'none';
        yearContainer.style.display = 'none';
    }
}

async function handlePdfExportSubmit(event) {
    event.preventDefault();

    if (typeof window.jspdf === 'undefined') {
        alert("PDF generator library is loading. Please try again in a moment!");
        return;
    }

    const filterType = document.getElementById('pdfFilterTypeSelect').value;
    let filteredTxs = [];
    let periodTitle = "";

    if (filterType === 'month') {
        const selectedMonth = document.getElementById('pdfMonthInput').value;
        if (!selectedMonth) {
            alert("Please select a valid month!");
            return;
        }
        filteredTxs = cachedBusinessTransactions.filter(t => (t.transaction_date || '').startsWith(selectedMonth));
        periodTitle = `Monthly Report (${selectedMonth})`;
    } else if (filterType === 'year') {
        const selectedYear = document.getElementById('pdfYearSelect').value;
        filteredTxs = cachedBusinessTransactions.filter(t => (t.transaction_date || '').startsWith(selectedYear));
        periodTitle = `Annual Report (Year ${selectedYear})`;
    } else {
        filteredTxs = cachedBusinessTransactions;
        periodTitle = `Complete All-Time Freight Ledger`;
    }

    if (filteredTxs.length === 0) {
        alert(`No freight trade records found for ${periodTitle}`);
        return;
    }

    // Compute Summary Totals for Report
    let totalTons = 0;
    let totalSupplierAmt = 0;
    let totalCompanyAmt = 0;
    let totalNetProfit = 0;

    filteredTxs.forEach(t => {
        totalTons += (parseFloat(t.net_weight_tons) || 0);
        totalSupplierAmt += (parseFloat(t.supplier_amount) || 0);
        totalCompanyAmt += (parseFloat(t.company_amount) || 0);
        totalNetProfit += (parseFloat(t.net_profit) || 0);
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Document Header & Banner
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, 297, 24, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("BUSINESS WEIGHBRIDGE FREIGHT LEDGER STATEMENT", 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(158, 247, 210); // Mint green
    doc.text(`PERIOD: ${periodTitle.toUpperCase()}`, 190, 15);

    // KPI Metric Box
    doc.setFillColor(241, 245, 249);
    doc.rect(14, 28, 269, 18, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, 28, 269, 18, 'S');

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Freight Trips: ${filteredTxs.length}`, 18, 35);
    doc.text(`Net Weight Handled: ${totalTons.toFixed(2)} Tons`, 75, 35);
    doc.text(`Supplier Payable: RS. ${formatCurrency(totalSupplierAmt)}`, 140, 35);
    doc.text(`Company Receivable: RS. ${formatCurrency(totalCompanyAmt)}`, 205, 35);

    doc.setTextColor(16, 185, 129); // Green profit
    doc.text(`NET TRADE PROFIT: RS. ${formatCurrency(totalNetProfit)}`, 18, 42);

    // AutoTable Data Formatting
    const tableHeaders = [["#", "Date", "Vehicle No.", "Supplier Name", "Company Name", "Net Weight", "Supplier Amt", "Company Amt", "Net Profit", "Status"]];
    const tableData = filteredTxs.map((t, idx) => [
        idx + 1,
        t.transaction_date,
        (t.vehicle_number || '').toUpperCase(),
        t.supplier_name || '-',
        t.company_name || '-',
        `${(parseFloat(t.net_weight_tons) || 0).toFixed(2)} T`,
        `RS. ${formatCurrency(t.supplier_amount)}`,
        `RS. ${formatCurrency(t.company_amount)}`,
        `RS. ${formatCurrency(t.net_profit)}`,
        `Sup: ${t.supplier_paid_status ? 'PAID' : 'PENDING'} | Co: ${t.company_paid_status ? 'PAID' : 'PENDING'}`
    ]);

    doc.autoTable({
        head: tableHeaders,
        body: tableData,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 30, fontStyle: 'bold' },
            3: { cellWidth: 42 },
            4: { cellWidth: 42 },
            5: { cellWidth: 24, halign: 'right' },
            6: { cellWidth: 28, halign: 'right' },
            7: { cellWidth: 28, halign: 'right' },
            8: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
            9: { cellWidth: 18, halign: 'center', fontSize: 7 }
        }
    });

    const sanitizedTitle = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Business_Freight_Ledger_${sanitizedTitle}.pdf`);
    closeExportPdfModal();
}
