// CONFIGURATION - UPDATE THIS URL AFTER DEPLOYING CODE.GS
const API_URL = "https://script.google.com/macros/s/AKfycbwvmNVA_PD18Y9hYb3-MNEgnngARAU0_ho2f7vD3jvDjM-6NmFSjw5tXKpAv1KBWUTv/exec";
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

// Category Colors
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
    document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentDate').textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// FETCH DATA
async function fetchData() {
    submitBtn.textContent = "Loading...";
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
        submitBtn.textContent = "Add Transaction";
    }
}

function renderDashboard(data) {
    const sym = CURRENCY_SYMBOLS[selectedCurrency];

    // Update KPI cards
    balanceDisplay.textContent = formatMoney(data.balance, sym);
    incomeDisplay.textContent = formatMoney(data.totalIncome || 0, sym);
    expenseDisplay.textContent = formatMoney(data.totalExpense || 0, sym);

    // Render transactions table
    transactionsList.innerHTML = '';
    let categoryTotals = {};
    let totalExpenseForChart = 0;

    if (!data.transactions || data.transactions.length === 0) {
        transactionsList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#aaa;">No transactions found</td></tr>';
    } else {
        data.transactions.forEach(tx => {
            const tr = document.createElement('tr');
            let dateStr = "";
            try { dateStr = new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch (e) { }

            const isIncome = tx.type === 'Income';
            const colorClass = isIncome ? 'var(--success)' : 'var(--text-white)';
            const sign = isIncome ? '+' : '-';
            const catColor = CATEGORY_COLORS[tx.category] || '#94a3b8';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td style="color:${catColor}">● ${tx.category}</td>
                <td style="color:var(--text-muted)">${tx.type}</td>
                <td style="text-align:right; color:${colorClass}; font-weight:600;">${sign}${formatMoney(tx.amount, sym)}</td>
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
    if (totalAmount === 0 || isNaN(totalAmount)) {
        chartEl.style.background = '#1e293b';
        legendEl.innerHTML = '<div style="color:#aaa; text-align:center;">No expense data</div>';
        return;
    }

    let gradientString = [];
    let currentDeg = 0;
    legendEl.innerHTML = '';

    const sortedCats = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const sym = CURRENCY_SYMBOLS[selectedCurrency];

    sortedCats.forEach(([cat, amount]) => {
        const percent = amount / totalAmount;
        const deg = percent * 360;
        const color = CATEGORY_COLORS[cat] || '#94a3b8';

        const start = currentDeg;
        const end = currentDeg + deg;
        gradientString.push(`${color} ${start}deg ${end}deg`);
        currentDeg += deg;

        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="dot" style="background:${color}"></span>
            <span style="flex:1">${cat}</span>
            <span style="opacity:0.7">${Math.round(percent * 100)}%</span>
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
        submitBtn.textContent = "Saving...";
        submitBtn.disabled = true;

        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.status === "success") {
            formStatus.textContent = "Saved!";
            formStatus.style.color = "var(--success)";
            form.reset();
            updateCategoryOptions('Expense');
            fetchData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error(error);
        formStatus.textContent = "Error";
        formStatus.style.color = "var(--danger)";
    } finally {
        submitBtn.textContent = "Add Transaction";
        submitBtn.disabled = false;
        setTimeout(() => { formStatus.textContent = ""; }, 3000);
    }
});

function formatMoney(amount, symbol) {
    return symbol + ' ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}













