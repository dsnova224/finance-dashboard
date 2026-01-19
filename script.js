const API_URL = "https://script.google.com/macros/s/AKfycbyEIR9lSWL8di5hJDIrL8MYO72uZn9U0lkAFTzurnNIhoOHHi4Pz6bpiTYNz7Xsme2S/exec"; 
const API_TOKEN = "omom@123OM";

const balanceDisplay = document.getElementById('balanceDisplay');
const incomeCountEl = document.getElementById('incomeCount');
const expenseCountEl = document.getElementById('expenseCount');
const transactionsList = document.getElementById('transactionsList');
const form = document.getElementById('transactionForm');
const formStatus = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');
const chartEl = document.getElementById('expenseChart');
const legendEl = document.getElementById('chartLegend');

const CATEGORY_COLORS = {
    'Food': '#38bdf8', 'Rent': '#818cf8', 'Transport': '#2dd4bf',
    'Utilities': '#fbbf24', 'Shopping': '#f472b6', 'Health': '#34d399',
    'Entertainment': '#a78bfa', 'Education': '#60a5fa', 'Savings': '#22c55e',
    'Other Expense': '#94a3b8',
    'Salary': '#22c55e', 'Freelance': '#fbbf24', 'Business': '#818cf8',
    'Investments': '#34d399', 'Gifts / Bonus': '#f472b6', 'Refunds': '#38bdf8',
    'Other Income': '#94a3b8'
};
const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investments", "Gifts / Bonus", "Refunds", "Other Income"];
const EXPENSE_CATEGORIES = ["Food", "Rent", "Transport", "Utilities", "Shopping", "Health", "Entertainment", "Education", "Savings", "Other Expense"];

document.addEventListener('DOMContentLoaded', () => {
    updateDateTime(); setInterval(updateDateTime, 1000);
    document.querySelectorAll('input[name="type"]').forEach(input => {
        input.addEventListener('change', (e) => updateCategoryOptions(e.target.value));
    });
    updateCategoryOptions('Expense');
    fetchData();
});

function updateCategoryOptions(type) {
    const sel = document.getElementById('category'); sel.innerHTML = '';
    (type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).forEach(cat => {
        const opt = document.createElement('option'); opt.value = cat; opt.textContent = cat; sel.appendChild(opt);
    });
}

function updateDateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentDate').textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function fetchData() {
    submitBtn.textContent = "Loading...";
    try {
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "getData", token: API_TOKEN, targetCurrency: "EUR" }) });
        const result = JSON.parse(await res.text());
        if (result.status === "success") renderDashboard(result.data);
    } catch (e) { console.error(e); }
    finally { submitBtn.textContent = "Add Transaction"; }
}

function renderDashboard(data) {
    balanceDisplay.textContent = formatMoney(data.balance, '€');
    incomeCountEl.textContent = data.incomeCount;
    expenseCountEl.textContent = data.expenseCount;
    transactionsList.innerHTML = '';
    let catTotals = {}, totalExp = 0;
    if (!data.transactions?.length) { transactionsList.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#aaa;">No data</td></tr>'; }
    else {
        data.transactions.forEach(tx => {
            const tr = document.createElement('tr');
            const isInc = tx.type === 'Income';
            tr.innerHTML = `<td>${new Date(tx.date).toLocaleDateString([], {month:'short', day:'numeric'})}</td>
                <td style="color:${CATEGORY_COLORS[tx.category]||'#94a3b8'}">● ${tx.category}</td>
                <td style="color:var(--text-muted)">${tx.type}</td>
                <td style="text-align:right;color:${isInc?'var(--success)':'var(--text-white)'};font-weight:600">${isInc?'+':'-'}${formatMoney(tx.amount, '€')}</td>`;
            transactionsList.appendChild(tr);
            if (!isInc) { catTotals[tx.category] = (catTotals[tx.category]||0) + tx.amount; totalExp += tx.amount; }
        });
    }
    renderChart(catTotals, totalExp);
}

function renderChart(totals, total) {
    if (!total) { chartEl.style.background = '#1e293b'; return; }
    let grad = [], deg = 0; legendEl.innerHTML = '';
    Object.entries(totals).sort((a,b)=>b[1]-a[1]).forEach(([cat, amt]) => {
        const pct = amt/total, d = pct*360, col = CATEGORY_COLORS[cat]||'#94a3b8';
        grad.push(`${col} ${deg}deg ${deg+d}deg`); deg += d;
        legendEl.innerHTML += `<div class="legend-item"><span class="dot" style="background:${col}"></span><span style="flex:1">${cat}</span><span style="opacity:0.7">${Math.round(pct*100)}%</span></div>`;
    });
    chartEl.style.background = `conic-gradient(${grad.join(', ')})`;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = { action: "addTransaction", token: API_TOKEN, type: document.querySelector('input[name="type"]:checked').value, amount: document.getElementById('amount').value, currency: "EUR", category: document.getElementById('category').value, paymentMethod: document.getElementById('paymentMethod').value, notes: document.getElementById('notes').value };
    try {
        submitBtn.textContent = "Saving..."; submitBtn.disabled = true;
        const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(formData) });
        if ((await res.json()).status === "success") { formStatus.textContent = "Saved!"; formStatus.style.color = "var(--success)"; form.reset(); fetchData(); }
    } catch (e) { formStatus.textContent = "Error"; }
    finally { submitBtn.textContent = "Add Transaction"; submitBtn.disabled = false; }
});

function formatMoney(amt, sym) { return sym + ' ' + amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }




