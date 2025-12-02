import { db } from './firebase-init.js';
import { doc, getDoc, setDoc, runTransaction, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & INITIALIZATION ---
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    const usernameDisplay = document.getElementById('username-display');
    usernameDisplay.textContent = currentUser.username;

    let printPrices = {};
    let currentTransactionItems = [];
    let gcashServiceFee = 15.00; // Default fee

    // --- DOM ELEMENT REFERENCES ---
    const gcashBalanceDisplay = document.getElementById('current-gcash-balance');
    const transactionItemsList = document.getElementById('transaction-items');
    const subtotalDisplay = document.getElementById('subtotal');
    const serviceFeeDisplay = document.getElementById('service-fee');
    const grandTotalDisplay = document.getElementById('grand-total');
    const transactionMessage = document.getElementById('transaction-message');

    // --- DATA FETCHING ---
    async function loadInitialData() {
        try {
            // Fetch GCash Settings (Balance and Fee)
            const gcashRef = doc(db, "settings", "gcash");
            const gcashSnap = await getDoc(gcashRef);
            if (gcashSnap.exists()) {
                const gcashSettings = gcashSnap.data();
                gcashBalanceDisplay.textContent = `₱${gcashSettings.balance.toFixed(2)}`;
                gcashServiceFee = gcashSettings.serviceFee || 15.00; // Use fetched fee or default
            }

            // Fetch Print Prices
            const pricesRef = doc(db, "settings", "printRates");
            const pricesSnap = await getDoc(pricesRef);
            if (pricesSnap.exists()) {
                printPrices = pricesSnap.data();
            } else {
                console.error("Print prices not found!");
            }
        } catch (error) {
            console.error("Error loading initial data:", error);
        }
    }

    // --- UI RENDERING ---
    function renderTransaction() {
        transactionItemsList.innerHTML = '';
        if (currentTransactionItems.length === 0) {
            transactionItemsList.innerHTML = `<li class="placeholder">Add items to begin a transaction.</li>`;
            updateTotals();
            return;
        }

        currentTransactionItems.forEach((item, index) => {
            const li = document.createElement('li');
            const description = item.type === 'print' ?
                `${item.pages} page(s) - ${item.description}` :
                `${item.description} (₱${item.amount.toFixed(2)})`;

            li.innerHTML = `
                <span class="item-desc">${description}</span>
                <span class="item-price">₱${item.total.toFixed(2)}</span>
                <button class="item-remove" data-index="${index}">&times;</button>
            `;
            transactionItemsList.appendChild(li);
        });
        updateTotals();
    }

    function updateTotals() {
        const subtotal = currentTransactionItems.reduce((acc, item) => acc + (item.type === 'print' ? item.total : item.amount), 0);
        const serviceFee = currentTransactionItems.reduce((acc, item) => acc + (item.fee || 0), 0);
        const grandTotal = subtotal + serviceFee;

        subtotalDisplay.textContent = `₱${subtotal.toFixed(2)}`;
        serviceFeeDisplay.textContent = `₱${serviceFee.toFixed(2)}`;
        grandTotalDisplay.textContent = `₱${grandTotal.toFixed(2)}`;
    }

    // --- EVENT HANDLERS ---
    function handleGcashTransaction(type) {
        const amountInput = document.getElementById('gcash-amount');
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        const description = type === 'in' ? 'GCash Cash In' : 'GCash Cash Out';
        currentTransactionItems.push({
            type: `gcash_${type}`,
            description: description,
            amount: amount,
            fee: gcashServiceFee,
            total: amount + gcashServiceFee,
        });

        renderTransaction();
        amountInput.value = '';
    }

    function handleAddPrintJob(e) {
        e.preventDefault();
        const paperSize = document.getElementById('paper-size').value; // a4, letter, legal
        const printType = document.getElementById('print-type').value; // bw, color
        const pages = parseInt(document.getElementById('page-count').value);

        const priceKey = `${paperSize}_${printType}`;
        const pricePerPage = printPrices[priceKey];

        if (pricePerPage === undefined) {
            alert("Pricing for this selection is not available.");
            return;
        }

        const cost = pages * pricePerPage;
        const description = `${paperSize.toUpperCase()} ${printType.toUpperCase()}`;
        currentTransactionItems.push({
            type: 'print',
            description: description,
            pages: pages,
            cost: cost,
            total: cost
        });

        renderTransaction();
        e.target.reset();
    }

    function handleRemoveItem(index) {
        currentTransactionItems.splice(index, 1);
        renderTransaction();
    }
    
    async function handleCompletePayment() {
        if (currentTransactionItems.length === 0) {
            alert("Cannot complete an empty transaction.");
            return;
        }

        const grandTotal = currentTransactionItems.reduce((acc, item) => acc + item.total, 0);

        try {
            const gcashRef = doc(db, "settings", "gcash");
            const printingRef = doc(db, "settings", "printing");

            await runTransaction(db, async (transaction) => {
                const gcashDoc = await transaction.get(gcashRef);
                const printingDoc = await transaction.get(printingRef);

                if (!gcashDoc.exists()) {
                    throw "GCash settings document does not exist!";
                }

                // 1. Calculate and update GCash balance
                let newGcashBalance = gcashDoc.data().balance;
                const gcashIn = currentTransactionItems.filter(i => i.type === 'gcash_in').reduce((sum, i) => sum + i.amount, 0);
                const gcashOut = currentTransactionItems.filter(i => i.type === 'gcash_out').reduce((sum, i) => sum + i.amount, 0);
                const totalFees = currentTransactionItems.filter(i => i.fee).reduce((sum, i) => sum + i.fee, 0);
                
                newGcashBalance += gcashIn - gcashOut + totalFees;
                
                if (newGcashBalance < 0) {
                    throw "Insufficient GCash balance for this transaction.";
                }
                transaction.update(gcashRef, { balance: newGcashBalance });

                // 2. Calculate and update Printing balance
                const printingTotal = currentTransactionItems
                    .filter(i => i.type === 'print')
                    .reduce((sum, i) => sum + i.total, 0);

                if (printingTotal > 0) {
                    const currentPrintingBalance = printingDoc.exists() ? printingDoc.data().balance : 0;
                    const newPrintingBalance = currentPrintingBalance + printingTotal;
                    transaction.set(printingRef, { balance: newPrintingBalance }, { merge: true });
                }

                // 3. Log the entire transaction
                const transLogRef = collection(db, "transactions");
                await addDoc(transLogRef, {
                    user: currentUser.username,
                    timestamp: serverTimestamp(),
                    totalAmount: grandTotal,
                    items: currentTransactionItems
                });
            });

            // Success
            transactionMessage.textContent = "Payment completed successfully!";
            transactionMessage.style.color = 'green';
            currentTransactionItems = [];
            renderTransaction();
            loadInitialData(); // Refresh balance display
        } catch (e) {
            console.error("Transaction failed: ", e);
            transactionMessage.textContent = `Transaction failed: ${e}`;
            transactionMessage.style.color = 'red';
        }

        setTimeout(() => transactionMessage.textContent = '', 4000);
    }
    
    // --- EVENT LISTENERS ---
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    document.getElementById('cash-in-btn').addEventListener('click', () => handleGcashTransaction('in'));
    document.getElementById('cash-out-btn').addEventListener('click', () => handleGcashTransaction('out'));
    document.getElementById('print-job-form').addEventListener('submit', handleAddPrintJob);
    document.getElementById('clear-transaction-btn').addEventListener('click', () => {
        currentTransactionItems = [];
        renderTransaction();
    });
    document.getElementById('complete-payment-btn').addEventListener('click', handleCompletePayment);

    transactionItemsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('item-remove')) {
            const index = e.target.dataset.index;
            handleRemoveItem(index);
        }
    });

    // --- INITIAL LOAD ---
    loadInitialData();
});