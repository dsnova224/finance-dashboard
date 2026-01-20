// CONFIGURATION - UPDATE THIS URL AFTER DEPLOYING CODE.GS
const API_URL = "https://script.google.com/macros/s/AKfycbxTu9cyLRFufc9Wzf60YNZWFAcwEFAcd0_WrhvHMqe5JWlpQWhxtoAwogL3wu3LEII/exec";
const API_TOKEN = "omom@123OM";

// Currency State
let selectedCurrency = 'EUR';
const CURRENCY_SYMBOLS = { EUR: '€', INR: '₹' };

// DOM Elements
const balanceDisplay = document.getElementById('balanceDisplay');
const incomeDisplay = document.getElementById('incomeDisplay');
const expenseDisplay = document.getElementById('expenseDisplay');
const transactionsList = document.getElementById('transactionsList');
const form = document.getElementById('transactionForm');
const formStatus = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');
const chartEl = document.getElementById('expenseChart');
const legendEl = document.getElementById('chartLegend');
const chartTotalValueEl = document.getElementById('chartTotalValue');

// Category Colors - Professional Palette
const CATEGORY_COLORS = {
    'Food': '#60a5fa',         // Blue 400
    'Rent': '#818cf8',         // Indigo 400
    'Transport': '#34d399',    // Emerald 400
    'Utilities': '#fbbf24',    // Amber 400
    'Shopping': '#f472b6',     // Pink 400
    'Health': '#4ade80',       // Green 400
    'Entertainment': '#a78bfa',// Violet 400
    'Education': '#5eead4',    // Teal 400
    'Savings': '#2dd4bf',     // Teal 400
    'Other Expense': '#94a3b8',// Slate 400
    'Salary': '#10b981',       // Emerald 500
    'Freelance': '#f59e0b',    // Amber 500
    'Business': '#6366f1',     // Indigo 500
    'Investments': '#14b8a6',  // Teal 500
    'Gifts / Bonus': '#ec4899',// Pink 500
    'Refunds': '#3b82f6',      // Blue 500
    'Other Income': '#64748b'  // Slate 500
};

const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investments", "Gifts / Bonus", "Refunds", "Other Income"];
const EXPENSE_CATEGORIES = ["Food", "Rent", "Transport", "Utilities", "Shopping", "Health", "Entertainment", "Education", "Savings", "Other Expense"];

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Transaction type toggle
    const typeInputs = document.querySelectorAll('input[name="type"]');
    typeInputs.forEach(input => {
        input.addEventListener('change', (e) => updateCategoryOptions(e.target.value));
    });
    updateCategoryOptions('Expense');

    // Currency toggle buttons
    const currencyBtns = document.querySelectorAll('.currency-btn');
    currencyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const currency = btn.dataset.currency;
            if (currency !== selectedCurrency) {
                switchCurrency(currency);
            }
        });
    });

    fetchData();
});

// CURRENCY SWITCHING
function switchCurrency(currency) {
    selectedCurrency = currency;

    // Update active button state
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.currency === currency);
    });

    // Update all currency labels
    updateCurrencyLabels();

    // Re-fetch data for new currency
    fetchData();
}

function updateCurrencyLabels() {
    const sym = CURRENCY_SYMBOLS[selectedCurrency];

    // Update all .currency-label spans
    document.querySelectorAll('.currency-label').forEach(el => {
        el.textContent = selectedCurrency;
    });

    // Update all .currency-symbol spans
    document.querySelectorAll('.currency-symbol').forEach(el => {
        el.textContent = sym;
    });
}

function updateCategoryOptions(type) {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '';
    const categories = type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

function updateDateTime() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

    document.getElementById('currentTime').textContent = now.toLocaleTimeString([], timeOptions);
    document.getElementById('currentDate').textContent = now.toLocaleDateString([], dateOptions);
}

// FETCH DATA
async function fetchData() {
    const btnText = submitBtn.querySelector('.btn-text');
    const originalText = btnText.textContent;
    btnText.textContent = "Updating...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData", token: API_TOKEN, targetCurrency: selectedCurrency })
        });
        const result = await response.json();
        if (result.status === "success") {
            renderDashboard(result.data);
        } else {
            console.error(result.message);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    } finally {
        btnText.textContent = originalText;
    }
}

function renderDashboard(data) {
    const sym = CURRENCY_SYMBOLS[selectedCurrency];

    // Update KPI cards with animation
    animateValue(balanceDisplay, parseFloat(balanceDisplay.innerText) || 0, data.balance, 500, sym);
    animateValue(incomeDisplay, parseFloat(incomeDisplay.innerText) || 0, data.totalIncome || 0, 500, sym);
    animateValue(expenseDisplay, parseFloat(expenseDisplay.innerText) || 0, data.totalExpense || 0, 500, sym);

    // Render transactions table
    transactionsList.innerHTML = '';
    let categoryTotals = {};
    let totalExpenseForChart = 0;

    if (!data.transactions || data.transactions.length === 0) {
        transactionsList.innerHTML = '<tr><td colspan="5" class="empty-state">No activity found in this currency</td></tr>';
    } else {
        data.transactions.forEach((tx, index) => {
            const tr = document.createElement('tr');
            tr.style.animation = `fadeInUp 0.3s ease-out forwards ${index * 0.05}s`;
            tr.style.opacity = '0';

            let dateStr = "";
            try {
                const d = new Date(tx.date);
                dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
            } catch (e) { }

            const isIncome = tx.type === 'Income';
            const amountColor = isIncome ? 'var(--success)' : 'var(--text-main)';
            const sign = isIncome ? '+' : '-';
            const catColor = CATEGORY_COLORS[tx.category] || '#94a3b8';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:8px; height:8px; border-radius:50%; background:${catColor}"></span>
                        ${tx.category}
                    </div>
                </td>
                <td style="color:var(--text-muted); font-size:0.8rem;">${tx.type}</td>
                <td style="color:var(--text-muted); font-size:0.8rem;">${tx.paymentMethod || '—'}</td>
                <td class="text-right" style="color:${amountColor}; font-weight:700;">${sign}${formatMoney(tx.amount, '')}</td>
            `;
            transactionsList.appendChild(tr);

            if (!isIncome) {
                const cat = tx.category || 'Other';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
                totalExpenseForChart += tx.amount;
            }
        });
    }

    renderChart(categoryTotals, totalExpenseForChart);
}

function renderChart(totals, totalAmount) {
    const sym = CURRENCY_SYMBOLS[selectedCurrency];
    chartTotalValueEl.textContent = formatMoney(totalAmount, sym);

    if (totalAmount === 0 || isNaN(totalAmount)) {
        chartEl.style.background = '#f1f5f9';
        legendEl.innerHTML = '<div style="grid-column: span 2; color:var(--text-muted); text-align:center; padding:1rem;">No spending recorded</div>';
        return;
    }

    let gradientString = [];
    let currentDeg = 0;
    legendEl.innerHTML = '';

    const sortedCats = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    sortedCats.forEach(([cat, amount]) => {
        const percent = amount / totalAmount;
        const deg = percent * 360;
        const color = CATEGORY_COLORS[cat] || '#94a3b8';

        const start = currentDeg;
        const end = currentDeg + (deg > 1 ? deg - 0.5 : deg); // Add small gap
        gradientString.push(`${color} ${start}deg ${end}deg`);
        currentDeg += deg;

        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="dot" style="background:${color}"></span>
            <span style="flex:1">${cat}</span>
            <span style="color:var(--text-main); font-weight:600">${Math.round(percent * 100)}%</span>
        `;
        legendEl.appendChild(legendItem);
    });

    chartEl.style.background = `conic-gradient(${gradientString.join(', ')})`;
}

// FORM SUBMIT
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.querySelector('input[name="type"]:checked').value;
    const transactionCurrency = document.getElementById('transactionCurrency').value;

    const formData = {
        action: "addTransaction",
        token: API_TOKEN,
        type: type,
        amount: document.getElementById('amount').value,
        currency: transactionCurrency,
        category: document.getElementById('category').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        notes: document.getElementById('notes').value
    };

    try {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.status === "success") {
            showStatus("Transaction Saved!", "var(--success)");
            form.reset();
            updateCategoryOptions('Expense');
            fetchData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error(error);
        showStatus("Error saving transaction", "var(--danger)");
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

// UTILS
function formatMoney(amount, symbol) {
    const formatted = parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return symbol ? `${symbol} ${formatted}` : formatted;
}

function showStatus(msg, color) {
    formStatus.textContent = msg;
    formStatus.style.color = color;
    setTimeout(() => { formStatus.textContent = ""; }, 3000);
}

function animateValue(obj, start, end, duration, sym) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = progress * (end - start) + start;
        obj.innerHTML = formatMoney(current, '');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = formatMoney(end, '');
        }
    };
    window.requestAnimationFrame(step);
}

// Animation styles
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(styleSheet);











