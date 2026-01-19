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
// Category Colors for Chart
const CATEGORY_COLORS = {
    'Food': '#ffadad',
    'Rent': '#ffd6a5',
    'Transport': '#fdffb6',
    'Shopping': '#caffbf',
    'Utilities': '#9bf6ff',
    'Health': '#a0c4ff',
    'Entertainment': '#bdb2ff',
    'Salary': '#ffc6ff',
    'Savings': '#fffffc',
    'Other': '#cfcfcf'
};
// Fallback Mock Data
const MOCK_DATA = {
    balance: 2450.75,
    incomeCount: 2,
    expenseCount: 5,
    transactions: [
        { date: "2023-10-25", type: "Expense", category: "Food", amount: 45.00, currency: "USD", paymentMethod: "Card" },
        { date: "2023-10-24", type: "Expense", category: "Transport", amount: 15.50, currency: "USD", paymentMethod: "Cash" },
        { date: "2023-10-24", type: "Income", category: "Salary", amount: 3000.00, currency: "USD", paymentMethod: "Bank" },
        { date: "2023-10-22", type: "Expense", category: "Utilities", amount: 120.00, currency: "USD", paymentMethod: "Bill" },
        { date: "2023-10-21", type: "Expense", category: "Shopping", amount: 200.00, currency: "USD", paymentMethod: "Card" },
        { date: "2023-10-20", type: "Expense", category: "Entertainment", amount: 50.00, currency: "USD", paymentMethod: "Card" }
    ]
};
// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000); // Live clock
    fetchData(); // Load data
});
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentDate').textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}
// FETCH DATA
async function fetchData() {
    if (API_URL === "YOUR_GAS_WEB_APP_URL") {
        console.warn("Using Mock Data");
        renderData(MOCK_DATA);
        return;
    }
    try {
        submitBtn.textContent = "Syncing...";
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData", token: API_TOKEN })
        });
        const result = await response.json();
        if (result.status === "success") {
            renderData(result.data);
        } else {
            console.error(result.message);
        }
    } catch (error) {
        console.error("Error:", error);
        // Fallback to mock data if offline or error
        renderData(MOCK_DATA);
    } finally {
        submitBtn.textContent = "Add Record";
    }
}
// RENDER FUNCTION
function renderData(data) {
    // 1. Balance & Counts
    balanceDisplay.textContent = formatCurrency(data.balance);
    incomeCountEl.textContent = data.incomeCount;
    expenseCountEl.textContent = data.expenseCount;
    // 2. Transactions Table
    transactionsList.innerHTML = '';
    // We want to calculate category totals for the chart as we loop
    let categoryTotals = {};
    let totalExpenseForChart = 0;
    if (!data.transactions || data.transactions.length === 0) {
        transactionsList.innerHTML = '<tr><td colspan="4" class="empty">No recent transactions</td></tr>';
    } else {
        data.transactions.forEach(tx => {
            // Populate Table
            const tr = document.createElement('tr');
            let dateStr = tx.date;
            try { dateStr = new Date(tx.date).toLocaleDateString(); } catch (e) { }
            const isIncome = tx.type === 'Income';
            const amountClass = isIncome ? 'amount-income' : 'amount-expense';
            const sign = isIncome ? '+' : '-';
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${CATEGORY_COLORS[tx.category] || '#ccc'};margin-right:5px;"></span>
                    ${tx.category}
                </td>
                <td>${tx.paymentMethod || '-'}</td>
                <td class="${amountClass}">${sign}${formatCurrency(tx.amount, tx.currency)}</td>
            `;
            transactionsList.appendChild(tr);
            // Tally for Chart (Expenses Only)
            if (!isIncome) {
                const cat = tx.category || 'Other';
                const amt = parseFloat(tx.amount) || 0;
                categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
                totalExpenseForChart += amt;
            }
        });
    }
    // 3. Render Chart
    renderChart(categoryTotals, totalExpenseForChart);
}
// VANILLA JS DONUT CHART
function renderChart(totals, totalAmount) {
    if (totalAmount === 0) {
        chartEl.style.background = '#f0f0f0'; // Empty state
        legendEl.innerHTML = '<div class="legend-item">No expenses yet</div>';
        return;
    }
    let gradientString = [];
    let currentDeg = 0;
    legendEl.innerHTML = ''; // Clear legend
    // Sort categories by size
    const sortedCats = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    sortedCats.forEach(([cat, amount]) => {
        const percent = amount / totalAmount;
        const deg = percent * 360;
        const color = CATEGORY_COLORS[cat] || '#cfcfcf';
        // CSS Conic Dividend
        gradientString.push(`${color} 0 ${deg + currentDeg}deg`);
        // Next segment starts where this one ended
        // But conic-gradient syntax is: color startDeg endDeg, color2 startDeg endDeg...
        // Actually simpler: color 0 deg is relative to the previous stop if we use just hints, 
        // but standard safer way is absolute degrees.
        // Correct standard syntax:
        // red 0deg 90deg, blue 90deg 180deg...
        const start = currentDeg;
        const end = currentDeg + deg;
        // We override the array above because syntax is tricky. Let's use the explicit range.
        gradientString[gradientString.length - 1] = `${color} ${start}deg ${end}deg`;
        currentDeg += deg;
        // Legend Item
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="dot" style="background:${color}"></span>
            <span>${cat}</span>
            <span style="opacity:0.6; margin-left:auto">${Math.round(percent * 100)}%</span>
        `;
        legendEl.appendChild(legendItem);
    });
    chartEl.style.background = `conic-gradient(${gradientString.join(', ')})`;
}
// FORM HANDLING
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (API_URL === "YOUR_GAS_WEB_APP_URL") {
        alert("Enter Real API URL in valid mode."); return;
    }
    // Get Radio Value
    const type = document.querySelector('input[name="type"]:checked').value;
    const formData = {
        action: "addTransaction",
        token: API_TOKEN,
        type: type,
        amount: document.getElementById('amount').value,
        currency: document.getElementById('currency').value,
        category: document.getElementById('category').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        notes: document.getElementById('notes').value
    };
    try {
        submitBtn.textContent = "Processing...";
        submitBtn.disabled = true;
        const response = await fetch(API_URL, {
            method: "POST", body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.status === "success") {
            formStatus.textContent = "âœ“ Added!";
            formStatus.style.color = "var(--success)";
            form.reset();
            // Reset radio to Expense
            document.getElementById('typeExpense').checked = true;
            fetchData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        formStatus.textContent = "âœ— Error";
        formStatus.style.color = "var(--danger)";
    } finally {
        submitBtn.textContent = "Add Record";
        submitBtn.disabled = false;
        setTimeout(() => { formStatus.textContent = ""; }, 2000);
    }
});
// UTILS
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
}
