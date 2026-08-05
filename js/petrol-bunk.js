// ============================================================
// PETROL BUNK MODULE - DAILY SALES, STATE PRICES & PROFIT LOGIC
// ============================================================

let stateFuelPricesMap = {};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('petrolBunkPage')) {
        initPetrolBunkPage();
    }
});

async function initPetrolBunkPage() {
    // Set default dates to today YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const saleDateEl = document.getElementById('saleDateInput');
    const slipDateEl = document.getElementById('slipDate');
    if (saleDateEl) saleDateEl.value = today;
    if (slipDateEl) slipDateEl.value = today;

    // Load State Fuel Price directory
    await loadStatePrices();
    
    // Load Logs & KPIs
    loadDailySalesLog();
    loadSlipsLedger();
}

// 1. Load State Fuel Price Directory from REST API
async function loadStatePrices() {
    try {
        stateFuelPricesMap = await apiFetch('/api/petrol-bunk/state-prices');
        onStateSelectChange();
    } catch (e) {
        console.warn("Using fallback state fuel prices", e);
        stateFuelPricesMap = {
            "Tamil Nadu": { petrol: 100.75, diesel: 92.34, petrolCost: 97.25, dieselCost: 89.14 },
            "Karnataka": { petrol: 102.86, diesel: 88.94, petrolCost: 99.30, dieselCost: 85.74 },
            "Maharashtra": { petrol: 104.21, diesel: 90.75, petrolCost: 100.70, dieselCost: 87.55 },
            "Delhi": { petrol: 94.72, diesel: 87.62, petrolCost: 91.22, dieselCost: 84.42 }
        };
        onStateSelectChange();
    }
}

// 2. Handle State Dropdown Selection Change
function onStateSelectChange() {
    const stateSelect = document.getElementById('stateSelect');
    if (!stateSelect) return;

    const stateName = stateSelect.value;
    const rates = stateFuelPricesMap[stateName] || { petrol: 100.75, diesel: 92.34, petrolCost: 97.25, dieselCost: 89.14 };

    // Update Form Inputs
    document.getElementById('petrolPriceInput').value = rates.petrol;
    document.getElementById('petrolCostInput').value = rates.petrolCost;
    document.getElementById('dieselPriceInput').value = rates.diesel;
    document.getElementById('dieselCostInput').value = rates.dieselCost;

    // Update KPI Card
    const kpiStateName = document.getElementById('kpiStateName');
    const kpiStateRates = document.getElementById('kpiStateRates');
    const kpiStateDiesel = document.getElementById('kpiStateDiesel');

    if (kpiStateName) kpiStateName.innerText = stateName;
    if (kpiStateRates) kpiStateRates.innerText = `₹ ${rates.petrol.toFixed(2)} / L`;
    if (kpiStateDiesel) kpiStateDiesel.innerText = `Diesel: ₹ ${rates.diesel.toFixed(2)} / L`;

    updateSlipPriceDefault();
    calculateLiveProfit();
}

// Update Credit Slip Rate default based on selected state & fuel type
function updateSlipPriceDefault() {
    const stateSelect = document.getElementById('stateSelect');
    const fuelTypeEl = document.getElementById('fuelType');
    const rateEl = document.getElementById('ratePerLiter');

    if (!stateSelect || !fuelTypeEl || !rateEl) return;
    const rates = stateFuelPricesMap[stateSelect.value] || { petrol: 100.75, diesel: 92.34 };

    rateEl.value = (fuelTypeEl.value === 'DIESEL') ? rates.diesel : rates.petrol;
    calculateSlipTotal();
}

// 3. Live Math Profit Preview Calculator
function calculateLiveProfit() {
    const pPrice = parseFloat(document.getElementById('petrolPriceInput').value) || 0;
    const pCost = parseFloat(document.getElementById('petrolCostInput').value) || 0;
    const pLiters = parseFloat(document.getElementById('petrolLitersInput').value) || 0;

    const dPrice = parseFloat(document.getElementById('dieselPriceInput').value) || 0;
    const dCost = parseFloat(document.getElementById('dieselCostInput').value) || 0;
    const dLiters = parseFloat(document.getElementById('dieselLitersInput').value) || 0;

    const revenue = (pLiters * pPrice) + (dLiters * dPrice);
    const profit = (pLiters * (pPrice - pCost)) + (dLiters * (dPrice - dCost));

    const prevRev = document.getElementById('previewRevenue');
    const prevProf = document.getElementById('previewProfit');

    if (prevRev) prevRev.innerText = "₹ " + formatCurrency(revenue);
    if (prevProf) prevProf.innerText = "₹ " + formatCurrency(profit);
}

// 4. Submit Daily Sales Form
async function handleDailySalesSubmit(event) {
    event.preventDefault();

    const payload = {
        sale_date: document.getElementById('saleDateInput').value,
        state_name: document.getElementById('stateSelect').value,
        petrol_price: parseFloat(document.getElementById('petrolPriceInput').value),
        petrol_cost: parseFloat(document.getElementById('petrolCostInput').value),
        petrol_liters: parseFloat(document.getElementById('petrolLitersInput').value),
        diesel_price: parseFloat(document.getElementById('dieselPriceInput').value),
        diesel_cost: parseFloat(document.getElementById('dieselCostInput').value),
        diesel_liters: parseFloat(document.getElementById('dieselLitersInput').value)
    };

    try {
        await apiFetch('/api/petrol-bunk/daily-sales', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        alert("✅ Daily fuel sales & dealer net profit recorded successfully!");
        document.getElementById('petrolLitersInput').value = '';
        document.getElementById('dieselLitersInput').value = '';
        calculateLiveProfit();
        loadDailySalesLog();
    } catch (e) {
        alert("Failed to save daily sales log: " + e.message);
    }
}

// 5. Load Daily Sales Log & Calculate KPIs
async function loadDailySalesLog() {
    const tbody = document.getElementById('dailySalesTableBody');
    if (!tbody) return;

    try {
        const sales = await apiFetch('/api/petrol-bunk/daily-sales');
        tbody.innerHTML = '';

        if (!sales || sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">No daily sales logs found. Submit daily liters sold above.</td></tr>';
            return;
        }

        let totalPetrolLiters = 0, totalDieselLiters = 0;
        let todayProfit = 0, totalProfit = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        sales.forEach(s => {
            const pL = parseFloat(s.petrol_liters) || 0;
            const dL = parseFloat(s.diesel_liters) || 0;
            const rev = parseFloat(s.total_revenue) || 0;
            const prof = parseFloat(s.total_profit) || 0;

            totalPetrolLiters += pL;
            totalDieselLiters += dL;
            totalProfit += prof;

            if (s.sale_date === todayStr) {
                todayProfit += prof;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.sale_date}</strong></td>
                <td><span class="pill pill-paid">${s.state_name}</span></td>
                <td>${pL.toLocaleString('en-IN', {minimumFractionDigits: 2})} L</td>
                <td>${dL.toLocaleString('en-IN', {minimumFractionDigits: 2})} L</td>
                <td>₹ ${formatCurrency(rev)}</td>
                <td style="color: var(--status-success); font-weight: 800;">₹ ${formatCurrency(prof)}</td>
                <td class="text-center">
                    <button class="btn btn-danger" style="padding: 4px 10px; font-size: 12px;" onclick="deleteDailySalesRecord('${s.id}')">🗑️ Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update Top KPI Cards
        const latestSale = sales[0] || {};
        const todayLiters = (parseFloat(latestSale.petrol_liters) || 0) + (parseFloat(latestSale.diesel_liters) || 0);

        const kpiTotalLiters = document.getElementById('kpiTotalLiters');
        const kpiLitersBreakdown = document.getElementById('kpiLitersBreakdown');
        const kpiTodayProfit = document.getElementById('kpiTodayProfit');
        const kpiTotalProfitCumulative = document.getElementById('kpiTotalProfitCumulative');

        if (kpiTotalLiters) kpiTotalLiters.innerText = `${todayLiters.toLocaleString('en-IN', {minimumFractionDigits: 2})} L`;
        if (kpiLitersBreakdown) kpiLitersBreakdown.innerText = `Petrol: ${(latestSale.petrol_liters || 0)}L | Diesel: ${(latestSale.diesel_liters || 0)}L`;
        if (kpiTodayProfit) kpiTodayProfit.innerText = "₹ " + formatCurrency(todayProfit || sales[0]?.total_profit || 0);
        if (kpiTotalProfitCumulative) kpiTotalProfitCumulative.innerText = `Cumulative: ₹ ${formatCurrency(totalProfit)}`;

    } catch (e) {
        console.error("Error loading daily sales log", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--status-danger);">Failed to load daily sales logs. ${e.message}</td></tr>`;
    }
}

// Delete Daily Sales Record
async function deleteDailySalesRecord(id) {
    if (!confirm("Are you sure you want to delete this daily sales entry?")) return;
    try {
        await apiFetch(`/api/petrol-bunk/daily-sales/${id}`, { method: 'DELETE' });
        loadDailySalesLog();
    } catch (e) {
        alert("Failed to delete daily sales log: " + e.message);
    }
}

// 6. Credit Slip Ledger Functions
function calculateSlipTotal() {
    const qty = parseFloat(document.getElementById('qtyLiters').value) || 0;
    const rate = parseFloat(document.getElementById('ratePerLiter').value) || 0;
    const total = qty * rate;
    const totalEl = document.getElementById('totalAmount');
    if (totalEl) totalEl.value = "₹ " + formatCurrency(total);
}

async function handleSlipSubmit(event) {
    event.preventDefault();
    const payload = {
        slip_date: document.getElementById('slipDate').value,
        customer_name: document.getElementById('customerName').value,
        vehicle_number: document.getElementById('vehicleNumber').value.toUpperCase(),
        fuel_type: document.getElementById('fuelType').value,
        qty_liters: parseFloat(document.getElementById('qtyLiters').value),
        rate_per_liter: parseFloat(document.getElementById('ratePerLiter').value)
    };

    try {
        await apiFetch('/api/petrol-bunk/slips', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        alert("✅ Fuel credit slip generated and saved!");
        document.getElementById('customerName').value = '';
        document.getElementById('vehicleNumber').value = '';
        document.getElementById('qtyLiters').value = '';
        calculateSlipTotal();
        loadSlipsLedger();
    } catch (e) {
        alert("Failed to save credit slip: " + e.message);
    }
}

async function loadSlipsLedger() {
    const tbody = document.getElementById('petrolSlipsTableBody');
    if (!tbody) return;

    try {
        const slips = await apiFetch('/api/petrol-bunk/slips');
        tbody.innerHTML = '';

        if (!slips || slips.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 24px; color: #94a3b8;">No credit slips generated yet.</td></tr>';
            return;
        }

        let totalUnpaid = 0, unpaidCount = 0;

        slips.forEach(s => {
            const qty = parseFloat(s.qty_liters) || 0;
            const rate = parseFloat(s.rate_per_liter) || 0;
            const total = qty * rate;

            if (!s.is_paid) {
                totalUnpaid += total;
                unpaidCount++;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.slip_date}</td>
                <td><strong>${s.customer_name}</strong></td>
                <td><code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px;">${s.vehicle_number}</code></td>
                <td><span class="pill ${s.fuel_type === 'DIESEL' ? 'pill-pending' : 'pill-paid'}">${s.fuel_type}</span></td>
                <td>${qty.toFixed(2)} L</td>
                <td>₹ ${rate.toFixed(2)}</td>
                <td style="font-weight: 700;">₹ ${formatCurrency(total)}</td>
                <td>
                    <button class="pill ${s.is_paid ? 'pill-paid' : 'pill-pending'}" onclick="toggleSlipPaidStatus('${s.id}')">
                        ${s.is_paid ? '✓ PAID' : '⏳ UNPAID'}
                    </button>
                </td>
                <td class="text-center" style="display: flex; gap: 6px; justify-content: center;">
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="printSlipReceipt('${s.id}')">🖨️ Print</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteSlipRecord('${s.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update Unpaid KPI
        const kpiUnpaidCredit = document.getElementById('kpiUnpaidCredit');
        const kpiUnpaidCount = document.getElementById('kpiUnpaidCount');
        if (kpiUnpaidCredit) kpiUnpaidCredit.innerText = "₹ " + formatCurrency(totalUnpaid);
        if (kpiUnpaidCount) kpiUnpaidCount.innerText = `${unpaidCount} Pending Slips`;

    } catch (e) {
        console.error("Error loading slips ledger", e);
        tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="color: var(--status-danger);">Failed to load credit slips. ${e.message}</td></tr>`;
    }
}

async function toggleSlipPaidStatus(id) {
    try {
        await apiFetch(`/api/petrol-bunk/slips/${id}/toggle-paid`, { method: 'PUT' });
        loadSlipsLedger();
    } catch (e) {
        alert("Failed to update status: " + e.message);
    }
}

async function deleteSlipRecord(id) {
    if (!confirm("Are you sure you want to delete this credit slip?")) return;
    try {
        await apiFetch(`/api/petrol-bunk/slips/${id}`, { method: 'DELETE' });
        loadSlipsLedger();
    } catch (e) {
        alert("Failed to delete credit slip: " + e.message);
    }
}

async function printSlipReceipt(id) {
    const slips = await apiFetch('/api/petrol-bunk/slips');
    const s = slips.find(x => x.id === id);
    if (!s) return alert("Slip not found!");

    const total = (parseFloat(s.qty_liters) || 0) * (parseFloat(s.rate_per_liter) || 0);
    const slipHtml = `
        <div class="slip-container">
            <div class="slip-header">
                <div class="bunk-name">PETROL BUNK ENTERPRISE</div>
                <div style="font-size: 12px;">High Quality Fuel & Lubricants Station</div>
                <div class="slip-title">CREDIT FUEL RECEIPT SLIP</div>
            </div>
            <div class="slip-grid">
                <div><span class="bold-label">Slip Date:</span> ${s.slip_date}</div>
                <div><span class="bold-label">Slip ID:</span> ${s.id}</div>
                <div><span class="bold-label">Customer:</span> ${s.customer_name}</div>
                <div><span class="bold-label">Vehicle No:</span> ${s.vehicle_number}</div>
            </div>
            <table class="slip-table">
                <thead>
                    <tr><th>Fuel Type</th><th>Quantity (Liters)</th><th>Rate / Liter</th><th>Total Amount</th></tr>
                </thead>
                <tbody>
                    <tr><td>${s.fuel_type}</td><td>${s.qty_liters} L</td><td>₹ ${s.rate_per_liter}</td><td><strong>₹ ${formatCurrency(total)}</strong></td></tr>
                </tbody>
            </table>
            <div class="signatures">
                <div class="sig-line">Customer Signature</div>
                <div class="sig-line">Authorized Manager</div>
            </div>
        </div>
    `;

    const printArea = document.getElementById('printableSlipArea');
    if (printArea) {
        printArea.innerHTML = slipHtml;
        window.print();
    }
}
