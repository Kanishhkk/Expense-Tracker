// ===== State Management =====
let transactions = [];
let currentFilter = 'all';

// ===== DOM Elements =====
const elements = {
    form: document.getElementById('transactionForm'),
    description: document.getElementById('description'),
    amount: document.getElementById('amount'),
    category: document.getElementById('category'),
    creditType: document.getElementById('creditType'),
    debitType: document.getElementById('debitType'),
    transactionsList: document.getElementById('transactionsList'),
    totalBalance: document.getElementById('totalBalance'),
    totalIncome: document.getElementById('totalIncome'),
    totalExpense: document.getElementById('totalExpense'),
    currentDate: document.getElementById('currentDate'),
    filterButtons: document.querySelectorAll('.filter-btn')
};

// ===== Initialize App =====
function init() {
    loadTransactions();
    updateDisplay();
    displayCurrentDate();
    attachEventListeners();
}

// ===== Event Listeners =====
// ===== Modal Elements =====
const modalElements = {
    modal: document.getElementById('reportModal'),
    closeBtn: document.querySelector('.close-modal'),
    reportType: document.getElementById('reportType'),
    dateInputGroup: document.getElementById('dateInputGroup'),
    monthInputGroup: document.getElementById('monthInputGroup'),
    yearInputGroup: document.getElementById('yearInputGroup'),
    reportDate: document.getElementById('reportDate'),
    reportMonth: document.getElementById('reportMonth'),
    reportYear: document.getElementById('reportYear'),
    generateBtn: document.getElementById('generateReportBtn')
};

// POPULATE YEARS
function populateYears() {
    const currentYear = new Date().getFullYear();
    modalElements.reportYear.innerHTML = '';
    for (let i = currentYear; i >= currentYear - 5; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        modalElements.reportYear.appendChild(option);
    }
}

// ===== Event Listeners =====
function attachEventListeners() {
    elements.form.addEventListener('submit', handleFormSubmit);

    // Modal Triggers
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // Set default to current month
            const now = new Date();
            modalElements.reportMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            modalElements.reportDate.valueAsDate = now;

            modalElements.modal.style.display = 'block';
            populateYears();
            updateModalInputs();
        });
    }

    modalElements.closeBtn.addEventListener('click', () => {
        modalElements.modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modalElements.modal) {
            modalElements.modal.style.display = 'none';
        }
    });

    modalElements.reportType.addEventListener('change', updateModalInputs);
    modalElements.generateBtn.addEventListener('click', generateReport);

    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.filter;
            updateFilterButtons();
            filterTransactions();
        });
    });
}

function updateModalInputs() {
    const type = modalElements.reportType.value;
    modalElements.dateInputGroup.classList.add('hidden');
    modalElements.monthInputGroup.classList.add('hidden');
    modalElements.yearInputGroup.classList.add('hidden');

    if (type === 'daily') modalElements.dateInputGroup.classList.remove('hidden');
    else if (type === 'monthly') modalElements.monthInputGroup.classList.remove('hidden');
    else if (type === 'yearly') modalElements.yearInputGroup.classList.remove('hidden');
}

// ===== Generate Report =====
async function generateReport() {
    const { jsPDF } = window.jspdf;
    const type = modalElements.reportType.value;
    let filteredTransactions = [];
    let title = '';
    let reportFilename = '';

    if (type === 'daily') {
        const dateVal = modalElements.reportDate.value;
        if (!dateVal) return showNotification('Please select a date', 'error');

        filteredTransactions = transactions.filter(t => t.date.startsWith(dateVal));
        title = `Daily Report: ${new Date(dateVal).toLocaleDateString()}`;
        reportFilename = `Expense_Report_Daily_${dateVal}.pdf`;

    } else if (type === 'monthly') {
        const monthVal = modalElements.reportMonth.value; // YYYY-MM
        if (!monthVal) return showNotification('Please select a month', 'error');

        const [year, month] = monthVal.split('-');
        filteredTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
        });

        const dateObj = new Date(year, month - 1);
        const monthName = dateObj.toLocaleString('default', { month: 'long' });
        title = `Monthly Report: ${monthName} ${year}`;
        reportFilename = `Expense_Report_${monthName}_${year}.pdf`;

    } else if (type === 'yearly') {
        const yearVal = parseInt(modalElements.reportYear.value);
        filteredTransactions = transactions.filter(t => new Date(t.date).getFullYear() === yearVal);
        title = `Annual Report: ${yearVal}`;
        reportFilename = `Expense_Report_${yearVal}.pdf`;
    }

    if (filteredTransactions.length === 0) {
        showNotification('No transactions found for the selected period', 'info');
        return;
    }

    // Calculate totals
    const income = filteredTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = filteredTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    // Create PDF
    const doc = new jsPDF();

    // Add Header
    doc.setFontSize(22);
    doc.setTextColor(102, 126, 234);
    doc.text('Expense Tracker Report', 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(title, 14, 30);

    // Add Summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Income: ${formatCurrency(income)}`, 14, 45);
    doc.text(`Total Expenses: ${formatCurrency(expense)}`, 14, 52);
    doc.text(`Net Balance: ${formatCurrency(balance)}`, 14, 59);

    // Prepare table data
    const tableData = filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.description,
        getCategoryDisplay(t.category).replace(/[\u{1F300}-\u{1F9FF}]/gu, ''), // Remove emojis
        t.type === 'credit' ? 'Income' : 'Expense',
        formatCurrency(t.amount)
    ]);

    // Add Table
    doc.autoTable({
        startY: 70,
        head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [102, 126, 234],
            fontStyle: 'bold',
            halign: 'left' // Default left alignment for headers
        },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        styles: {
            fontSize: 9,
            valign: 'middle',
            overflow: 'linebreak',
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 22, halign: 'center' }, // Date
            1: { cellWidth: 'auto' },               // Description
            2: { cellWidth: 28 },                   // Category
            3: { cellWidth: 20, halign: 'center' }, // Type
            4: { cellWidth: 40, halign: 'right' }   // Amount (Wider & Right Aligned)
        },
        margin: { top: 20, right: 14, bottom: 20, left: 14 }
    });

    // Save and Close
    doc.save(reportFilename);
    modalElements.modal.style.display = 'none';
    showNotification('Report downloaded successfully!', 'success');
}

// ===== Display Current Date =====
function displayCurrentDate() {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const today = new Date();
    elements.currentDate.textContent = today.toLocaleDateString('en-US', options);
}

// ===== Handle Form Submission =====
function handleFormSubmit(e) {
    e.preventDefault();

    const description = elements.description.value.trim();
    const amount = parseFloat(elements.amount.value);
    const category = elements.category.value;
    const type = elements.creditType.checked ? 'credit' : 'debit';

    if (!description || !amount || !category || !type) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (amount <= 0) {
        showNotification('Amount must be greater than 0', 'error');
        return;
    }

    const transaction = {
        id: generateId(),
        description,
        amount,
        category,
        type,
        date: new Date().toISOString()
    };

    addTransaction(transaction);
    elements.form.reset();
    showNotification('Transaction added successfully!', 'success');
}

// ===== Add Transaction =====
function addTransaction(transaction) {
    transactions.unshift(transaction);
    saveTransactions();
    updateDisplay();
}

// ===== Delete Transaction =====
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    updateDisplay();
    showNotification('Transaction deleted', 'info');
}

// ===== Update Display =====
function updateDisplay() {
    updateBalances();
    renderTransactions();
}

// ===== Update Balances =====
function updateBalances() {
    const income = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    elements.totalIncome.textContent = formatCurrency(income);
    elements.totalExpense.textContent = formatCurrency(expense);
    elements.totalBalance.textContent = formatCurrency(balance);

    // Add animation on update
    animateValue(elements.totalBalance);
}

// ===== Render Transactions =====
function renderTransactions() {
    const filteredTransactions = getFilteredTransactions();

    if (filteredTransactions.length === 0) {
        elements.transactionsList.innerHTML = `
            <div class="empty-state">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="40" r="35" stroke="url(#emptyGradient)" stroke-width="2" opacity="0.3"/>
                    <path d="M40 25V55M25 40H55" stroke="url(#emptyGradient)" stroke-width="3" stroke-linecap="round"/>
                    <defs>
                        <linearGradient id="emptyGradient" x1="0" y1="0" x2="80" y2="80">
                            <stop offset="0%" stop-color="#667eea"/>
                            <stop offset="100%" stop-color="#764ba2"/>
                        </linearGradient>
                    </defs>
                </svg>
                <p>No transactions yet</p>
                <span>Add your first transaction to get started</span>
            </div>
        `;
        return;
    }

    elements.transactionsList.innerHTML = filteredTransactions
        .map(transaction => createTransactionHTML(transaction))
        .join('');

    // Attach delete event listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('.delete-btn').dataset.id;
            deleteTransaction(id);
        });
    });
}

// ===== Create Transaction HTML =====
function createTransactionHTML(transaction) {
    const date = new Date(transaction.date);
    const formattedDate = formatDate(date);
    const icon = transaction.type === 'credit' ? '↑' : '↓';
    const sign = transaction.type === 'credit' ? '+' : '-';

    return `
        <div class="transaction-item ${transaction.type}">
            <div class="transaction-left">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div class="transaction-description">${escapeHtml(transaction.description)}</div>
                    <div class="transaction-category">${getCategoryDisplay(transaction.category)}</div>
                </div>
            </div>
            <div class="transaction-right">
                <div class="transaction-amount">${sign}${formatCurrency(transaction.amount)}</div>
                <div class="transaction-date">${formattedDate}</div>
                <button class="delete-btn" data-id="${transaction.id}" title="Delete transaction">×</button>
            </div>
        </div>
    `;
}

// ===== Filter Transactions =====
function getFilteredTransactions() {
    if (currentFilter === 'all') {
        return transactions;
    }
    return transactions.filter(t => t.type === currentFilter);
}

function filterTransactions() {
    renderTransactions();
}

function updateFilterButtons() {
    elements.filterButtons.forEach(btn => {
        if (btn.dataset.filter === currentFilter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// ===== Local Storage =====
function saveTransactions() {
    localStorage.setItem('expenseTrackerTransactions', JSON.stringify(transactions));
}

function loadTransactions() {
    const stored = localStorage.getItem('expenseTrackerTransactions');
    if (stored) {
        try {
            transactions = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading transactions:', e);
            transactions = [];
        }
    }
}

// ===== Utility Functions =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return 'Today';
    } else if (days === 1) {
        return 'Yesterday';
    } else if (days < 7) {
        return `${days} days ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

function getCategoryDisplay(category) {
    const categories = {
        'food': '🍔 Food & Dining',
        'transport': '🚗 Transportation',
        'shopping': '🛍️ Shopping',
        'entertainment': '🎬 Entertainment',
        'bills': '📄 Bills & Utilities',
        'salary': '💰 Salary',
        'freelance': '💼 Freelance',
        'investment': '📈 Investment',
        'other': '📌 Other'
    };
    return categories[category] || category;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function animateValue(element) {
    element.style.transform = 'scale(1.05)';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 200);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '16px 24px',
        borderRadius: '12px',
        color: 'white',
        fontWeight: '600',
        zIndex: '10000',
        animation: 'slideInRight 0.3s ease',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)'
    });

    // Set background based on type
    const backgrounds = {
        'success': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'error': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'info': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };
    notification.style.background = backgrounds[type] || backgrounds.info;

    // Add to DOM
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// ===== Initialize on DOM Load =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
