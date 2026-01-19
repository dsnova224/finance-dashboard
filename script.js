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
// Mock Data for Demo (when API URL is not set)
const MOCK_DATA = {
    balance: 1250.50,
    incomeCount: 12,
    expenseCount: 8,
    transactions: [
        { date: "2023-10-24", type: "Expense", category: "Groceries", amount: 45.20, currency: "USD" },
        { date: "2023-10-23", type: "Income", category: "Freelance", amount: 500.00, currency: "USD" },
        { date: "2023-10-22", type: "Expense", category: "Transport", amount: 15.00, currency: "USD" },
        { date: "2023-10-21", type: "Expense", category: "Coffee", amount: 5.50, currency: "USD" },
        { date: "2023-10-20", type: "Income", category: "Salary", amount: 2000.00, currency: "USD" }
    ]
};
// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    fetchData();
});
// DATE & TIME
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentDate').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
// FETCH DATA
async function fetchData() {
    if (API_URL === "YOUR_GAS_WEB_APP_URL") {
        console.warn("API URL not set. Using mock data.");
        renderData(MOCK_DATA);
        return;
    }
    try {
        setLoadingState(true);
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "getData",
                token: API_TOKEN
            })
        });
        const result = await response.json();
        if (result.status === "success") {
            renderData(result.data);
        } else {
            console.error(result.message);
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoadingState(false);
    }
}
// RENDER UI
function renderData(data) {
    // Balance
    balanceDisplay.textContent = formatCurrency(data.balance);
    // Counts
    incomeCountEl.textContent = data.incomeCount;
    expenseCountEl.textContent = data.expenseCount;
    // Transactions Table
    transactionsList.innerHTML = '';
    if (data.transactions.length === 0) {
        transactionsList.innerHTML = '<tr><td colspan="3" class="empty-state">No transactions found</td></tr>';
        return;
    }
    data.transactions.forEach(tx => {
        const tr = document.createElement('tr');
        // Format Date (assuming API returns YYYY-MM-DD HH:MM:SS or similar)
        let dateStr = tx.date;
        try {
            // Simple date cleaning
            dateStr = new Date(tx.date).toLocaleDateString();
        } catch (e) { }
        const amountClass = tx.type === 'Income' ? 'transaction-income' : 'transaction-expense';
        const sign = tx.type === 'Income' ? '+' : '-';
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${tx.category} <span style="font-size:0.8em; color:#999">(${tx.type})</span></td>
            <td class="${amountClass}">${sign}${formatCurrency(tx.amount, tx.currency)}</td>
        `;
        transactionsList.appendChild(tr);
    });
}
// ADD TRANSACTION
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (API_URL === "YOUR_GAS_WEB_APP_URL") {
        alert("Cannot add transaction in Demo Mode. Please deploy the backend script.");
        return;
    }
    const formData = {
        action: "addTransaction",
        token: API_TOKEN,
        type: document.getElementById('type').value,
        amount: document.getElementById('amount').value,
        currency: document.getElementById('currency').value,
        category: document.getElementById('category').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        notes: document.getElementById('notes').value
    };
    try {
        submitBtn.textContent = "Adding...";
        submitBtn.disabled = true;
        formStatus.textContent = "";
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.status === "success") {
            formStatus.textContent = "Transaction added!";
            formStatus.style.color = "green";
            form.reset();
            fetchData(); // Refresh data
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        formStatus.textContent = "Error: " + error.message;
        formStatus.style.color = "red";
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
function setLoadingState(isLoading) {
    if (isLoading) {
        balanceDisplay.style.opacity = "0.5";
    } else {
        balanceDisplay.style.opacity = "1";
    }
}