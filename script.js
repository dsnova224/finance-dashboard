// CONFIGURATION
const API_URL = "https://script.google.com/macros/s/AKfycbzgLB4yl-tIFRLyX0MA0WGYVxfNV84IPDgvhLIvK3NX6mxaVlX8ljclYYl9ZXqYMrK1/exec";
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
let globalLiveRate = 92.0; // Default fallback
let currentData = null; // Store fetched data so we can re-render without refetching
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
    // Category Switcher
    const typeInputs = document.querySelectorAll('input[name="type"]');
    typeInputs.forEach(input => {
        input.addEventListener('change', (e) => updateCategoryOptions(e.target.value));
    });
    updateCategoryOptions('Expense');
    // Currency Dropdown Switcher (Form)
    currencySelect.addEventListener('change', (e) => {
        if (e.target.value === 'EUR') {
            rateInputGroup.style.display = 'block';
            exchangeRateInput.value = globalLiveRate; // Auto-fill
        } else {
            rateInputGroup.style.display = 'none';
        }
    });
    // View Toggle Switcher (Header)
    const viewInputs = document.querySelectorAll('input[name="viewCurrency"]');
    viewInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (currentData) renderData(currentData);
        });
    });
    fetchData();
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
// FETCH DATA
async function fetchData() {
    if (API_URL === "YOUR_GAS_WEB_APP_URL") {
        console.warn("Mock Data"); return;
    }
    try {
        submitBtn.textContent = "Syncing...";
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData", token: API_TOKEN })
        });
        // Parse safely
        const text = await response.text();
        let result = JSON.parse(text);
        if (result.status === "success") {
            currentData = result.data; // Store globally
            // Update Live Rate from Server
            if (result.data.currentRate) {
                globalLiveRate = parseFloat(result.data.currentRate);
                console.log("Updated Live Rate:", globalLiveRate);
            }
            renderData(currentData);
        } else {
            console.error(result.message);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    } finally {
        submitBtn.textContent = "Add Transaction";
    }
}
// RENDER FUNCTION (Handles Conversions)
function renderData(data) {
    if (!data) return;
    // 1. Determine Target Currency
    const viewCurrency = document.querySelector('input[name="viewCurrency"]:checked').value;
    const isViewINR = viewCurrency === 'INR';
    // 2. Calculate Display Values
    // Backend returns 'balance' in INR (Base). 
    let displayBalance = data.balance;
    let currencySymbol = '₹';
    if (!isViewINR) {
        // Convert TO EUR
        // Estimate: TotalINR / CurrentRate
        displayBalance = data.balance / globalLiveRate;
        currencySymbol = '€';
    }
    balanceDisplay.textContent = formatMoney(displayBalance, currencySymbol);
    incomeCountEl.textContent = data.incomeCount;
    expenseCountEl.textContent = data.expenseCount;
    // 3. Transactions Table & Chart totals
    transactionsList.innerHTML = '';
    let categoryTotals = {};
    let totalExpenseForChart = 0;
    data.transactions.forEach(tx => {
        const tr = document.createElement('tr');
        let dateStr = "";
        try { dateStr = new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch (e) { }
        const isIncome = tx.type === 'Income';
        const colorClass = isIncome ? 'var(--success)' : 'var(--text-white)';
        const sign = isIncome ? '+' : '-';
        const catColor = CATEGORY_COLORS[tx.category] || '#94a3b8';
        // CONVERSION LOGIC FOR ROW
        // We know tx.amount is the original amount. tx.currency is original.
        // But backend `getData` summary logic was already done in INR.
        // Wait, `transactions` array from backend has generic "amount" and "currency".
        // Let's do client-side conversion for the list display.
        let displayAmount = parseFloat(tx.amount);
        let rowSymbol = (tx.currency === 'USD') ? '$' : (tx.currency === 'EUR' ? '€' : '₹');
        // Logic: specific requirements said "View in EUR".
        // If we represent the list, we usually show Original Currency. 
        // BUT if the user toggles "View in EUR", should we convert everything in the list?
        // Usually, transaction lists show the *actual* paid amount.
        // Let's keep the list showing Original Currency for accuracy, 
        // but the Summary Cards above (Balance) obey the toggle.
        // HOWEVER, if the user specifically requested "dynamically convert... using stored rates" implies visual consistency.
        // Let's stick to: Table shows ORIGINAL. Dashboard Totals show CONVERTED.
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td style="color:${catColor}">● ${tx.category}</td>
            <td style="color:var(--text-muted); font-size:0.85rem;">${tx.exchangeRate ? '@' + tx.exchangeRate : '-'}</td>
            <td style="text-align:right; color:${colorClass}; font-weight:600;">${sign}${formatMoney(displayAmount, rowSymbol)}</td>
        `;
        transactionsList.appendChild(tr);
        // Chart Logic (needs to be uniform currency)
        // Let's use the Base INR totals for simplicity, or convert if View is EUR.
        // Backend gave us `amount` in original currency. We need to normalize.
        // For accurate chart: Amount * ExchangeRate = INR Value.
        let amountInINR = parseFloat(tx.amount);
        if (tx.currency === 'EUR') amountInINR = amountInINR * (tx.exchangeRate || globalLiveRate);
        if (!isIncome) {
            let chartVal = amountInINR;
            if (!isViewINR) chartVal = chartVal / globalLiveRate; // Convert to EUR for chart
            const cat = tx.category || 'Other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + chartVal;
            totalExpenseForChart += chartVal;
        }
    });
    renderChart(categoryTotals, totalExpenseForChart);
}
// VANILLA JS DONUT CHART
function renderChart(totals, totalAmount) {
    if (totalAmount === 0 || isNaN(totalAmount)) {
        chartEl.style.background = '#1e293b';
        legendEl.innerHTML = '<div class="legend-item">No expenses yet</div>';
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
// FORM SUBMISSION
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (API_URL === "YOUR_GAS_WEB_APP_URL") {
        alert("Enter Real API URL."); return;
    }
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
        const text = await response.text();
        let result = JSON.parse(text);
        if (result.status === "success") {
            formStatus.textContent = "Transaction Added";
            formStatus.style.color = "var(--success)";
            form.reset();
            // Reset state
            document.querySelector('input[value="Expense"]').checked = true;
            updateCategoryOptions('Expense');
            rateInputGroup.style.display = 'none'; // Hide rate input
            fetchData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Submit Error:", error);
        formStatus.textContent = "Error: " + error.message;
        formStatus.style.color = "var(--danger)";
    } finally {
        submitBtn.textContent = "Add Transaction";
        submitBtn.disabled = false;
        setTimeout(() => {
            if (formStatus.textContent.includes("Transaction Added")) formStatus.textContent = "";
        }, 3000);
    }
});
function formatMoney(amount, symbol) {
    return symbol + ' ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}





