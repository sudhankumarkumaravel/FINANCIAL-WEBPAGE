// ============================================================
// SHOP RENT MODULE - MONTHLY PAYMENTS, DATES, TENANT DIRECTORY & DELETE LOGIC
// ============================================================

let tenantsList = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('shopRentPage')) {
        initShopRentPage();
    }
});

async function initShopRentPage() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7); // YYYY-MM

    const payDateEl = document.getElementById('rentPaymentDateInput');
    const rentMonthEl = document.getElementById('rentMonthSelect');

    if (payDateEl) payDateEl.value = today;
    if (rentMonthEl) rentMonthEl.value = currentMonth;

    await loadTenantsDropdown();
    await loadTenantsDirectory();
    await loadRentPaymentsLedger();
}

// 1. Load Tenants Dropdown & Store Tenants Map
async function loadTenantsDropdown() {
    const dropdown = document.getElementById('tenantSelectDropdown');
    if (!dropdown) return;

    try {
        tenantsList = await apiFetch('/api/shop-rent/tenants');
        dropdown.innerHTML = '<option value="">-- Select Tenant --</option>';

        if (Array.isArray(tenantsList)) {
            tenantsList.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.innerText = `${t.tenant_name} (${t.shop_number}) - ₹${t.monthly_rent}/mo`;
                dropdown.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn("Failed to load tenants list", e);
    }
}

// 2. Load Commercial Tenants Directory (with Delete Option)
async function loadTenantsDirectory() {
    const dirTbody = document.getElementById('tenantsDirectoryTableBody');
    if (!dirTbody) return;

    dirTbody.innerHTML = '';

    try {
        tenantsList = await apiFetch('/api/shop-rent/tenants');

        if (!tenantsList || !Array.isArray(tenantsList) || tenantsList.length === 0) {
            dirTbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 24px; color: #94a3b8;">No commercial tenants found. Add a tenant above.</td></tr>';
            return;
        }

        tenantsList.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px;">${t.shop_number}</code></td>
                <td><strong>${t.tenant_name}</strong></td>
                <td>${t.aadhaar_number || '-'}</td>
                <td>${t.contact_phone || '-'}</td>
                <td style="font-weight: 700; color: var(--mod-shop);">₹ ${formatCurrency(t.monthly_rent)} / mo</td>
                <td class="text-center">
                    <button class="btn btn-danger" style="padding: 4px 10px; font-size: 12px;" onclick="deleteTenantRecord('${t.id}', '${t.tenant_name}')">
                        🗑️ Delete Tenant
                    </button>
                </td>
            `;
            dirTbody.appendChild(tr);
        });
    } catch (e) {
        console.warn("Failed to render tenants directory", e);
    }
}

// Auto-fill shop number and monthly rent amount when tenant selected
function onTenantSelectChange() {
    const dropdown = document.getElementById('tenantSelectDropdown');
    if (!dropdown) return;

    const tenantId = dropdown.value;
    const t = tenantsList.find(x => x.id === tenantId);

    const shopNoEl = document.getElementById('rentShopNoInput');
    const rentAmtEl = document.getElementById('rentAmountInput');

    if (t) {
        if (shopNoEl) shopNoEl.value = t.shop_number;
        if (rentAmtEl) rentAmtEl.value = t.monthly_rent;
    } else {
        if (shopNoEl) shopNoEl.value = '';
        if (rentAmtEl) rentAmtEl.value = '';
    }
}

// 3. Delete Tenant Record & Linked Payments
async function deleteTenantRecord(id, tenantName) {
    if (!confirm(`Are you sure you want to delete tenant "${tenantName}"? All linked rent records will be removed.`)) return;

    try {
        await apiFetch(`/api/shop-rent/tenants/${id}`, { method: 'DELETE' });
        alert(`✅ Tenant "${tenantName}" removed successfully.`);
        await loadTenantsDropdown();
        await loadTenantsDirectory();
        await loadRentPaymentsLedger();
    } catch (e) {
        alert("Failed to delete tenant: " + e.message);
    }
}

// 4. Submit Monthly Rent Payment Form
async function handleRentPaymentSubmit(event) {
    event.preventDefault();

    const dropdown = document.getElementById('tenantSelectDropdown');
    const tenantId = dropdown.value;
    const t = tenantsList.find(x => x.id === tenantId);

    if (!t) {
        alert("Please select a valid tenant!");
        return;
    }

    const payload = {
        tenant_id: t.id,
        tenant_name: t.tenant_name,
        shop_number: t.shop_number,
        payment_date: document.getElementById('rentPaymentDateInput').value,
        rent_month: document.getElementById('rentMonthSelect').value,
        amount_paid: parseFloat(document.getElementById('rentAmountInput').value) || 0,
        is_paid: parseInt(document.getElementById('paymentStatusSelect').value) === 1
    };

    try {
        await apiFetch('/api/shop-rent/payments', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        alert("✅ Monthly rent payment logged successfully!");
        dropdown.value = '';
        onTenantSelectChange();
        await loadRentPaymentsLedger();
    } catch (e) {
        alert("Failed to log rent payment: " + e.message);
    }
}

// 5. Load Rent Payments Ledger & Compute Collection Math
async function loadRentPaymentsLedger() {
    const tbody = document.getElementById('shopRentTableBody');
    if (!tbody) return;

    const selectedMonth = document.getElementById('rentMonthSelect').value || new Date().toISOString().slice(0, 7);

    try {
        const payments = await apiFetch('/api/shop-rent/payments');
        tbody.innerHTML = '';

        let monthCollected = 0, monthPending = 0;
        let paidCount = 0, pendingCount = 0;

        if (Array.isArray(payments)) {
            payments.forEach(p => {
                const amt = parseFloat(p.amount_paid) || 0;
                const isForSelectedMonth = (p.rent_month === selectedMonth);

                if (isForSelectedMonth) {
                    if (p.is_paid) {
                        monthCollected += amt;
                        paidCount++;
                    } else {
                        monthPending += amt;
                        pendingCount++;
                    }
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.payment_date}</td>
                    <td><strong>${p.tenant_name}</strong></td>
                    <td><code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px;">${p.shop_number}</code></td>
                    <td><span class="pill pill-paid">${p.rent_month}</span></td>
                    <td style="font-weight: 700;">₹ ${formatCurrency(amt)}</td>
                    <td>
                        <button class="pill ${p.is_paid ? 'pill-paid' : 'pill-pending'}" onclick="toggleRentPaymentStatus('${p.id}')">
                            ${p.is_paid ? '✓ PAID' : '⏳ PENDING'}
                        </button>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteRentPaymentRecord('${p.id}')">🗑️ Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        if (tbody.children.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">No payment records found for month ${selectedMonth}. Log rent payments above.</td></tr>`;
        }

        // Compute KPIs
        const totalTenantsCount = tenantsList.length || 1;
        const totalTargetRent = tenantsList.reduce((acc, t) => acc + (parseFloat(t.monthly_rent) || 0), 0);
        const collectionRate = totalTargetRent > 0 ? Math.round((monthCollected / totalTargetRent) * 100) : 0;

        const kpiShopRentCollected = document.getElementById('kpiShopRentCollected');
        const kpiSelectedMonthLabel = document.getElementById('kpiSelectedMonthLabel');
        const kpiShopRentPending = document.getElementById('kpiShopRentPending');
        const kpiPendingTenantsCount = document.getElementById('kpiPendingTenantsCount');
        const kpiPaidTenantsRatio = document.getElementById('kpiPaidTenantsRatio');
        const kpiTotalTenantsCount = document.getElementById('kpiTotalTenantsCount');
        const kpiCollectionRate = document.getElementById('kpiCollectionRate');
        const kpiCollectionMeter = document.getElementById('kpiCollectionMeter');

        if (kpiShopRentCollected) kpiShopRentCollected.innerText = "₹ " + formatCurrency(monthCollected);
        if (kpiSelectedMonthLabel) kpiSelectedMonthLabel.innerText = `Month: ${selectedMonth}`;
        if (kpiShopRentPending) kpiShopRentPending.innerText = "₹ " + formatCurrency(monthPending);
        if (kpiPendingTenantsCount) kpiPendingTenantsCount.innerText = `${pendingCount} Unpaid Tenants`;
        if (kpiPaidTenantsRatio) kpiPaidTenantsRatio.innerText = `${paidCount} / ${totalTenantsCount} Paid`;
        if (kpiTotalTenantsCount) kpiTotalTenantsCount.innerText = `${totalTenantsCount} Active Tenants`;
        if (kpiCollectionRate) kpiCollectionRate.innerText = `${collectionRate}%`;
        if (kpiCollectionMeter) kpiCollectionMeter.style.width = `${collectionRate}%`;

    } catch (e) {
        console.error("Error loading rent payments ledger", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--status-danger);">Failed to load rent payments. ${e.message}</td></tr>`;
    }
}

// 6. Toggle Payment Status
async function toggleRentPaymentStatus(id) {
    try {
        await apiFetch(`/api/shop-rent/payments/${id}/toggle-paid`, { method: 'PUT' });
        await loadRentPaymentsLedger();
    } catch (e) {
        alert("Failed to update status: " + e.message);
    }
}

// 7. Delete Payment Record
async function deleteRentPaymentRecord(id) {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
        await apiFetch(`/api/shop-rent/payments/${id}`, { method: 'DELETE' });
        await loadRentPaymentsLedger();
    } catch (e) {
        alert("Failed to delete record: " + e.message);
    }
}

// 8. Tenant Management Modal Handlers
function openAddTenantModal() {
    const modal = document.getElementById('addTenantModal');
    if (modal) modal.style.display = 'flex';
}

function closeAddTenantModal() {
    const modal = document.getElementById('addTenantModal');
    if (modal) modal.style.display = 'none';
}

async function handleAddTenantSubmit(event) {
    event.preventDefault();

    const payload = {
        tenant_name: document.getElementById('modalTenantName').value,
        shop_number: document.getElementById('modalShopNumber').value,
        aadhaar_number: document.getElementById('modalAadhaar').value,
        contact_phone: document.getElementById('modalPhone').value,
        monthly_rent: parseFloat(document.getElementById('modalRent').value) || 0
    };

    try {
        await apiFetch('/api/shop-rent/tenants', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        alert("✅ New commercial tenant added successfully!");
        closeAddTenantModal();
        document.getElementById('addTenantForm').reset();
        await loadTenantsDropdown();
        await loadTenantsDirectory();
        await loadRentPaymentsLedger();
    } catch (e) {
        alert("Failed to add tenant: " + e.message);
    }
}
