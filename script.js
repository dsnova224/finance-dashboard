// CONFIGURATION
// Replace with your deployment URL
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
// Category Colors (Professional Palette)
const CATEGORY_COLORS = {
    'Food': '#38bdf8',       // Sky Blue
    'Rent': '#818cf8',       // Indigo
    'Transport': '#2dd4bf',  // Teal
    'Shopping': '#f472b6',   // Pink
    'Utilities': '#fbbf24',  // Amber
    'Health': '#34d399',     // Emerald
    'Entertainment': '#a78bfa', // Purple
    'Salary': '#22c55e',     // Green
    'Other': '#94a3b8'       // Slate
};
// Fallback Mock Data
const MOCK_DATA = {
    balance: 5430.50,
    incomeCount: 4,
    expenseCount: 12,
    transactions: [
        { date: "2023-11-15", type: "Expense", category: "Rent", amount: 1500.00, currency: "USD", paymentMethod: "Bank" },
        { date: "2023-11-14", type: "Income", category: "Salary", amount: 4800.00, currency: "USD", paymentMethod: "Wire" },
        { date: "2023-11-12", type: "Expense", category: "Food", amount: 85.20, currency: "USD", paymentMethod: "Card" },
        { date: "2023-11-10", type: "Expense", category: "Transport", amount: 45.00, currency: "USD", paymentMethod: "Card" },
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
    document.getElementById('currentDate').textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
        renderData(MOCK_DATA);
    } finally {
        submitBtn.textContent = "Add Transaction";
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
    let categoryTotals = {};
    let totalExpenseForChart = 0;
    if (!data.transactions || data.transactions.length === 0) {
        transactionsList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">No recent activity</td></tr>';
    } else {
        data.transactions.forEach(tx => {
            const tr = document.createElement('tr');
            let dateStr = tx.date;
            try { dateStr = new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch (e) { }
            const isIncome = tx.type === 'Income';
            const colorClass = isIncome ? 'var(--success)' : 'var(--text-white)';
            const sign = isIncome ? '+' : '-';
            // Category Badge
            const catColor = CATEGORY_COLORS[tx.category] || '#94a3b8';
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td style="color:${catColor}">● ${tx.category}</td>
                <td style="color:var(--text-muted)">${tx.paymentMethod || '-'}</td>
                <td style="text-align:right; color:${colorClass}; font-weight:600;">${sign}${formatCurrency(tx.amount, tx.currency)}</td>
            `;
            transactionsList.appendChild(tr);
            // Chart Data Construction
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
        // Legend
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
        alert("Enter Real API URL in valid mode."); return;
    }
    // Radio
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
            formStatus.textContent = "Transaction Added";
            formStatus.style.color = "var(--success)";
            form.reset();
            // Reset to Expense checked
            document.querySelector('input[value="Expense"]').checked = true;
            fetchData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        formStatus.textContent = "Connection Error";
        formStatus.style.color = "var(--danger)";
    } finally {
        submitBtn.textContent = "Add Transaction";
        submitBtn.disabled = false;
        setTimeout(() => { formStatus.textContent = ""; }, 3000);
    }
});
// UTILS
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
}

