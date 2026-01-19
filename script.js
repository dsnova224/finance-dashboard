// CONFIGURATION
// PASTE YOUR NEW WEB APP URL HERE
const API_URL = "https://script.google.com/macros/s/AKfycbxIMDToHTMSJhbNuE3XriArTC-GRMTpK0GDHecgM1jMkawzO9df3TvIxdqpzsxPqWgV/exec";
const API_TOKEN = "omom@123OM";
// DOM Elements
const balanceDisplay = document.getElementById('balanceDisplay');
const incomeCountEl = document.getElementById('incomeCount');
const expenseCountEl = document.getElementById('expenseCount');
const transactionsList = document.getElementById('transactionsList');
const form = document.getElementById('transactionForm');
const formStatus = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');
const chartEl = document.getElementById('expenseChart');
const legendEl = document.getElementById('chartLegend');
const currencySelect = document.getElementById('currency');
const rateInputGroup = document.getElementById('rateInputGroup');
const exchangeRateInput = document.getElementById('exchangeRate');
// State
let globalLiveRate = 105.86; // Fallback
let currentView = 'INR';      // Default
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
    // Category Logic
    const typeInputs = document.querySelectorAll('input[name="type"]');
    typeInputs.forEach(input => {
        input.addEventListener('change', (e) => updateCategoryOptions(e.target.value));
    });
    updateCategoryOptions('Expense');
    // Form Currency Logic
    currencySelect.addEventListener('change', (e) => {
        if (e.target.value === 'EUR') {
            rateInputGroup.style.display = 'block';
            exchangeRateInput.value = globalLiveRate;
        } else {
            rateInputGroup.style.display = 'none';
        }
    });
    // HEADER VIEW TOGGLE -> FETCH NEW DATA
    const viewInputs = document.querySelectorAll('input[name="viewCurrency"]');
    viewInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            currentView = e.target.value;
            fetchData(); // REQUEST SERVER TO CONVERT
        });
    });
    fetchData(); // Initial Load (INR)
});
function updateCategoryOptions(type) {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '';
    const categories = type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat; option.textContent = cat;
        categorySelect.appendChild(option);
    });
}
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentDate').textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
// MAIN DATA FUNCTION
async function fetchData() {
    // Determine what currency we want to see
    const target = document.querySelector('input[name="viewCurrency"]:checked').value;
    submitBtn.textContent = "Loading...";
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "getData",
                token: API_TOKEN,
                targetCurrency: target // TELL SERVER WHAT WE WANT
            })
        });
        const text = await response.text();
        let result = JSON.parse(text);
        if (result.status === "success") {
            const data = result.data;
            // Update global rate if provided
            if (data.liveRate) globalLiveRate = parseFloat(data.liveRate);
            renderDashboard(data);
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
    // Currency Symbol
    const sym = data.viewCurrency === 'EUR' ? '€' : '₹';
    // 1. Balance & Counts
    balanceDisplay.textContent = formatMoney(data.balance, sym);
    incomeCountEl.textContent = data.incomeCount;
    expenseCountEl.textContent = data.expenseCount;
    // 2. Transactions Table
    transactionsList.innerHTML = '';
    let categoryTotals = {};
    let totalExpenseForChart = 0;
    if (data.transactions.length === 0) {
        transactionsList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#aaa;">No transactions found</td></tr>';
    }
    data.transactions.forEach(tx => {
        const tr = document.createElement('tr');
        let dateStr = tx.date.split('T')[0]; // Simple date handle
        const isIncome = tx.type === 'Income';
        const colorClass = isIncome ? 'var(--success)' : 'var(--text-white)';
        const sign = isIncome ? '+' : '-';
        const catColor = CATEGORY_COLORS[tx.category] || '#94a3b8';
        // NOTE: tx.amount IS ALREADY CONVERTED BY SERVER
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td style="color:${catColor}">● ${tx.category}</td>
            <td style="color:var(--text-muted); font-size:0.85rem;">
                ${tx.targetCurrency}
            </td>
            <td style="text-align:right; color:${colorClass}; font-weight:600;">
                ${sign}${formatMoney(tx.amount, sym)}
            </td>
        `;
        transactionsList.appendChild(tr);
        // Chart Data
        if (!isIncome) {
            const cat = tx.category || 'Other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
            totalExpenseForChart += tx.amount;
        }
    });
    renderChart(categoryTotals, totalExpenseForChart);
}
function renderChart(totals, totalAmount) {
    if (totalAmount === 0 || isNaN(totalAmount)) {
        chartEl.style.background = '#1e293b';
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
    if (API_URL.includes("YOUR")) { alert("Update API URL!"); return; }
    const type = document.querySelector('input[name="type"]:checked').value;
    const curr = document.getElementById('currency').value;
    // Logic: If EUR, we use the input rate. If INR, we use 1.0.
    let rateToSend = 1.0;
    if (curr === 'EUR') {
        rateToSend = document.getElementById('exchangeRate').value || globalLiveRate;
    }
    const formData = {
        action: "addTransaction",
        token: API_TOKEN,
        type: type,
        amount: document.getElementById('amount').value,
        currency: curr,
        category: document.getElementById('category').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        notes: document.getElementById('notes').value,
        exchangeRate: rateToSend // Send the rate!
    };
    try {
        submitBtn.textContent = "Processing...";
        submitBtn.disabled = true;
        const response = await fetch(API_URL, {
            method: "POST", body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.status === "success") {
            formStatus.textContent = "Saved!";
            formStatus.style.color = "var(--success)";
            form.reset();
            // Refetch current view
            fetchData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        formStatus.textContent = "Error";
    } finally {
        submitBtn.textContent = "Add Transaction";
        submitBtn.disabled = false;
    }
});
function formatMoney(amount, symbol) {
    return symbol + ' ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


