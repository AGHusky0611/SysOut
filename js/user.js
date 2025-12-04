import { db } from './firebase-init.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    getDoc, 
    doc, 
    addDoc, 
    Timestamp, 
    runTransaction, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & INITIALIZATION ---
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    const usernameDisplay = document.getElementById('username-display');
    usernameDisplay.textContent = currentUser.username;

    let servicePrices = {};
    let currentTransactionItems = [];
    // The fixed service fee is no longer needed.

    // --- DOM ELEMENT REFERENCES ---
    const gcashBalanceDisplay = document.getElementById('dashboard-gcash-balance');
    const posGcashBalanceDisplay = document.getElementById('pos-gcash-balance');
    const dashboardCashOnHandDisplay = document.getElementById('dashboard-cash-on-hand');
    const posCashOnHandDisplay = document.getElementById('pos-cash-on-hand');

    const gcashFeeDisplay = document.getElementById('gcash-fee-display');
    const gcashAmountInput = document.getElementById('gcash-amount');
    // ADD THIS NEW REFERENCE TO THE INPUT FIELD
    const gcashReferenceInput = document.getElementById('gcash-reference'); 
    const transactionItemsList = document.getElementById('transaction-items');
    const subtotalDisplay = document.getElementById('subtotal');
    const serviceFeeDisplay = document.getElementById('service-fee');
    const grandTotalDisplay = document.getElementById('grand-total');
    const transactionMessage = document.getElementById('transaction-message');

    // --- Dashboard Elements ---
    const todayServiceSalesEl = document.getElementById('today-service-sales');
    const todayGcashFeesEl = document.getElementById('today-gcash-fees');
    const todayTransactionCountEl = document.getElementById('today-transaction-count');
    const recentTransactionsTable = document.querySelector('#recent-transactions-table tbody');

    // --- DATA FETCHING ---
    async function loadInitialData() {
        try {
            // 1. Correct the document name from "prices" to "servicePrices"
            const pricesDocRef = doc(db, "settings", "servicePrices");
            const pricesSnap = await getDoc(pricesDocRef);

            if (pricesSnap.exists()) {
                servicePrices = pricesSnap.data();
                // Log to console for easy debugging to see if prices loaded
                console.log("Service prices loaded successfully:", servicePrices);
            } else {
                console.error("CRITICAL: The 'prices' document was not found in 'settings' collection.");
                alert("Could not load service prices from the database. Service POS will be disabled. Please contact an administrator.");
                // Disable all service forms if prices cannot be loaded
                document.querySelectorAll('.service-form button').forEach(btn => btn.disabled = true);
                document.querySelectorAll('.service-form input, .service-form select').forEach(input => input.disabled = true);
            }
        } catch (error) {
            console.error("Error during loadInitialData:", error);
            alert("A critical error occurred while loading initial price data. Check the console for more details.");
        }
    }

    async function loadDashboardData() {
        // Fetch and display current GCash Balance
        try {
            const gcashRef = doc(db, "settings", "gcash");
            const gcashSnap = await getDoc(gcashRef);
            if (gcashSnap.exists()) {
                const gcashSettings = gcashSnap.data();
                const balance = parseFloat(gcashSettings.balance);
                if (!isNaN(balance)) {
                     const formattedBalance = `₱${balance.toFixed(2)}`;
                     gcashBalanceDisplay.textContent = formattedBalance;
                     posGcashBalanceDisplay.textContent = formattedBalance;
                } else {
                     gcashBalanceDisplay.textContent = "Invalid Data";
                     posGcashBalanceDisplay.textContent = "Invalid Data";
                }
            } else {
                gcashBalanceDisplay.textContent = "Not Set";
                posGcashBalanceDisplay.textContent = "Not Set";
                console.warn("GCash settings document does not exist.");
            }
        } catch (error) {
            console.error("Error loading GCash balance:", error);
            gcashBalanceDisplay.textContent = "Error";
            posGcashBalanceDisplay.textContent = "Error";
        }

        // ADD THIS: Fetch and display current Cash on Hand Balance
        try {
            const cashOnHandRef = doc(db, "settings", "cashOnHand");
            const cashOnHandSnap = await getDoc(cashOnHandRef);
            if (cashOnHandSnap.exists()) {
                const cashOnHandSettings = cashOnHandSnap.data();
                const balance = parseFloat(cashOnHandSettings.balance);
                if (!isNaN(balance)) {
                    const formattedBalance = `₱${balance.toFixed(2)}`;
                    dashboardCashOnHandDisplay.textContent = formattedBalance;
                    posCashOnHandDisplay.textContent = formattedBalance;
                } else {
                    dashboardCashOnHandDisplay.textContent = "Invalid Data";
                    posCashOnHandDisplay.textContent = "Invalid Data";
                }
            } else {
                dashboardCashOnHandDisplay.textContent = "Not Set";
                posCashOnHandDisplay.textContent = "Not Set";
                console.warn("Cash on Hand settings document does not exist.");
            }
        } catch (error) {
            console.error("Error loading Cash on Hand balance:", error);
            dashboardCashOnHandDisplay.textContent = "Error";
            posCashOnHandDisplay.textContent = "Error";
        }


        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const transactionsRef = collection(db, "transactions");
        // Query for all of the current user's transactions today
        const q = query(
            transactionsRef,
            where("user", "==", currentUser.username),
            where("timestamp", ">=", startOfDay),
            orderBy("timestamp", "desc")
        );

        const querySnapshot = await getDocs(q);

        let totalServiceSales = 0;
        let totalGcashFees = 0;
        const transactionCount = querySnapshot.size;

        recentTransactionsTable.innerHTML = ''; // Clear existing rows

        if (querySnapshot.empty) {
            recentTransactionsTable.innerHTML = '<tr><td colspan="3">No transactions yet today.</td></tr>';
        } else {
            querySnapshot.forEach(doc => {
                const t = doc.data();
                
                // Calculate totals for summary cards
                t.items.forEach(item => {
                    if (item.type === 'service') {
                        totalServiceSales += item.total;
                    } else if (item.type.startsWith('gcash_')) {
                        totalGcashFees += item.fee;
                    }
                });

                // Populate recent transactions table (limit to first 10 for display)
                if (recentTransactionsTable.rows.length < 10) {
                    const row = recentTransactionsTable.insertRow();
                    const itemDescriptions = t.items.map(i => i.description).join(', ');
                    row.innerHTML = `
                        <td>${t.timestamp.toDate().toLocaleTimeString()}</td>
                        <td>${itemDescriptions}</td>
                        <td>₱${t.totalAmount.toFixed(2)}</td>
                    `;
                }
            });
        }

        // Update dashboard summary cards
        todayServiceSalesEl.textContent = `₱${totalServiceSales.toFixed(2)}`;
        todayGcashFeesEl.textContent = `₱${totalGcashFees.toFixed(2)}`;
        todayTransactionCountEl.textContent = transactionCount;
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
            // Use a more generic description display
            const displayDesc = item.type.startsWith('gcash') 
                ? `${item.description} (₱${item.amount.toFixed(2)})`
                : item.description;

            li.innerHTML = `
                <span class="item-desc">${displayDesc}</span>
                <span class="item-price">₱${item.total.toFixed(2)}</span>
                <button class="item-remove" data-index="${index}">&times;</button>
            `;
            transactionItemsList.appendChild(li);
        });
        updateTotals();
    }

    function updateTotals() {
        // More consistent calculation for all item types
        const subtotal = currentTransactionItems.reduce((acc, item) => acc + (item.amount || 0), 0);
        const serviceFee = currentTransactionItems.reduce((acc, item) => acc + (item.fee || 0), 0);
        const grandTotal = subtotal + serviceFee;

        subtotalDisplay.textContent = `₱${subtotal.toFixed(2)}`;
        serviceFeeDisplay.textContent = `₱${serviceFee.toFixed(2)}`;
        grandTotalDisplay.textContent = `₱${grandTotal.toFixed(2)}`;
    }

    // --- HELPER FUNCTIONS ---
    function getGcashFee(amount) {
        if (amount <= 250) return 5;
        if (amount <= 500) return 10;
        if (amount <= 1000) return 20;
        if (amount <= 1500) return 30;
        if (amount <= 2000) return 40;
        if (amount <= 2500) return 50;
        if (amount <= 3000) return 60;
        if (amount <= 3500) return 70;
        if (amount <= 4000) return 80;
        if (amount <= 4500) return 90;
        if (amount <= 5000) return 100;
        if (amount <= 5500) return 110;
        if (amount <= 6000) return 120;
        if (amount <= 6500) return 130;
        if (amount <= 7000) return 140;
        if (amount <= 7500) return 150;
        if (amount <= 8000) return 160;
        if (amount <= 8500) return 170;
        if (amount <= 9000) return 180;
        if (amount <= 9500) return 190;
        if (amount <= 10000) return 200;
        if (amount <= 11000) return 220;
        return 220; // Default for amounts over 11,000, adjust as needed
    }

    // --- EVENT HANDLERS ---
    function handleGcashTransaction(type) {
        const amountInput = document.getElementById('gcash-amount');
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }
        
        // GET THE REFERENCE FROM THE NEW INPUT FIELD
        const reference = gcashReferenceInput.value.trim();

        const fee = getGcashFee(amount);
        const description = type === 'in' ? 'GCash Cash In' : 'GCash Cash Out';
        currentTransactionItems.push({
            type: `gcash_${type}`,
            description: description,
            amount: amount,
            fee: fee,
            total: amount + fee, // Total the customer pays (amount + fee)
            reference: reference || (type === 'in' ? 'Cash In (POS)' : 'Cash Out (POS)') // Add reference to the item
        });

        renderTransaction();
        amountInput.value = '';
        gcashReferenceInput.value = ''; // Clear reference input after adding
    }

    function handleAddService(e) {
        e.preventDefault();
        const serviceType = document.getElementById('service-type').value;
        let item = null;

        // Check if prices have been loaded at all.
        if (!servicePrices || Object.keys(servicePrices).length === 0) {
             alert("Service prices have not been loaded from the database. Please refresh.");
             return;
        }

        try {
            switch (serviceType) {
                case 'printing':
                case 'photocopy': {
                    const paperSize = document.getElementById('print-paper-size').value; // e.g., 'a4'
                    const printType = document.getElementById('print-type').value;     // e.g., 'bw'
                    const pages = parseInt(document.getElementById('print-pages').value, 10);
                    if (isNaN(pages) || pages <= 0) return alert("Invalid number of pages.");

                    // 2. Build the key to match your flat Firestore structure
                    const priceKey = `${serviceType}_${printType}_${paperSize}`; // e.g., "printing_bw_a4"
                    const pricePerPage = servicePrices[priceKey];
                    
                    if (typeof pricePerPage === 'undefined') {
                        throw new Error(`Price for '${priceKey}' is not set in your Firestore 'servicePrices' document.`);
                    }
                    
                    const total = pricePerPage * pages;
                    const description = `${serviceType === 'photocopy' ? 'Photocopy' : 'Printing'}: ${pages} pg(s) (${paperSize}, ${printType === 'bw' ? 'B&W' : 'Color'})`;
                    item = { description, total };
                    break;
                }
                
                case 'scan': {
                    const scanType = document.getElementById('scan-type').value; // e.g., "scan_only"
                    const pages = parseInt(document.getElementById('scan-pages').value, 10);
                    if (isNaN(pages) || pages <= 0) return alert("Invalid number of pages.");

                    // Assumes you have fields like "scan_only" and "ecopy" in Firestore
                    const pricePerPage = servicePrices[scanType];
                    if (typeof pricePerPage === 'undefined') {
                        throw new Error(`Price for scan type '${scanType}' is not set in Firestore.`);
                    }

                    const total = pricePerPage * pages;
                    const description = `Scan: ${pages} pg(s) (${scanType === 'ecopy' ? 'with E-Copy' : 'Scan Only'})`;
                    item = { description, total };
                    break;
                }

                case 'lamination': {
                    const size = document.getElementById('lamination-size').value; // e.g., "small"
                    const qty = parseInt(document.getElementById('lamination-qty').value, 10);
                    if (isNaN(qty) || qty <= 0) return alert("Invalid quantity.");

                    // Assumes you have fields like "lamination_small" in Firestore
                    const priceKey = `lamination_${size}`;
                    const pricePerPiece = servicePrices[priceKey];
                    if (typeof pricePerPiece === 'undefined') {
                        throw new Error(`Price for lamination size '${priceKey}' is not set in Firestore.`);
                    }
                    
                    const total = pricePerPiece * qty;
                    const description = `Lamination: ${qty} pc(s) (${size.replace('_', ' ')})`;
                    item = { description, total };
                    break;
                }

                case 'pvc': {
                    const pvcType = document.getElementById('pvc-type').value; // e.g., "front"
                    const withEdit = document.getElementById('pvc-edit').value;
                    const qty = parseInt(document.getElementById('pvc-qty').value, 10);
                    if (isNaN(qty) || qty <= 0) return alert("Invalid quantity.");

                    // Assumes fields like "pvc_front", "pvc_back", and "pvc_edit" in Firestore
                    const priceKey = `pvc_${pvcType}`;
                    let pricePerPiece = servicePrices[priceKey];
                    if (typeof pricePerPiece === 'undefined') {
                        throw new Error(`Price for PVC type '${priceKey}' is not set in Firestore.`);
                    }

                    if (withEdit === 'yes') {
                        pricePerPiece += (servicePrices.pvc_edit || 0);
                    }

                    const total = pricePerPiece * qty;
                    const description = `PVC ID: ${qty} pc(s) (${pvcType === 'back' ? 'Back-to-Back' : 'Front Only'}, Edit: ${withEdit})`;
                    item = { description, total };
                    break;
                }
            }

            if (item) {
                // A common structure for all service items
                const serviceItem = {
                    type: 'service',
                    description: item.description,
                    amount: item.total, // Base amount
                    fee: 0,           // Services have no separate fee
                    total: item.total // Total cost for this item
                };
                currentTransactionItems.push(serviceItem);
                renderTransaction();
                e.target.reset(); // Clear the form after adding the item
            }
        } catch (error) {
            console.error("Error calculating price:", error);
            alert(`Could not calculate price. Please ensure prices are set in the admin panel.\n\nDetails: ${error.message}`);
        }
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
            const cashOnHandRef = doc(db, "settings", "cashOnHand");

            await runTransaction(db, async (transaction) => {
                const gcashDoc = await transaction.get(gcashRef);
                const printingDoc = await transaction.get(printingRef);
                const cashOnHandDoc = await transaction.get(cashOnHandRef);

                if (!gcashDoc.exists()) {
                    throw "GCash settings document does not exist!";
                }
                if (!cashOnHandDoc.exists()) {
                    throw "Cash on Hand settings document does not exist! Please set an initial balance in the Admin panel.";
                }

                let newGcashBalance = gcashDoc.data().balance;
                let newCashOnHandBalance = cashOnHandDoc.data().balance;

                let gcashInPrincipal = 0; // Amount customer wants to deposit to their GCash
                let gcashInTotalPaidByCustomer = 0; // Principal + fee, total cash received from customer for cash in
                let gcashInFee = 0;
                let gcashInReferences = []; // Collect references for logging

                let gcashOutPrincipal = 0; // Amount customer wants to withdraw from their GCash
                let gcashOutTotalChargedToGcash = 0; // Principal + fee, total charged to customer's GCash for cash out
                let gcashOutFee = 0;
                let gcashOutReferences = []; // Collect references for logging
                

                // Calculate separate totals for cash-in and cash-out GCash items
                currentTransactionItems.forEach(item => {
                    if (item.type === 'gcash_in') {
                        gcashInPrincipal += item.amount;
                        gcashInFee += item.fee;
                        gcashInTotalPaidByCustomer += item.total; // item.amount + item.fee
                        if (item.reference) gcashInReferences.push(item.reference); // Collect reference
                    } else if (item.type === 'gcash_out') {
                        gcashOutPrincipal += item.amount;
                        gcashOutFee += item.fee;
                        gcashOutTotalChargedToGcash += item.total; // item.amount + item.fee
                        if (item.reference) gcashOutReferences.push(item.reference); // Collect reference
                    }
                });

                // My Digital GCash Balance Logic:
                // - Cash In: DECREASES by the principal amount (money sent from my GCash to customer's).
                // - Cash Out: INCREASES by the total amount charged to the customer's GCash (money sent from customer's GCash to mine).
                newGcashBalance = newGcashBalance - gcashInPrincipal + gcashOutTotalChargedToGcash;


                // Corrected Physical Cash on Hand Logic:
                // - Cash In: INCREASES by the total cash I receive from the customer (principal + fee).
                // - Cash Out: DECREASES by the principal amount of cash I give to the customer, and INCREASES by the fee earned.
                newCashOnHandBalance = newCashOnHandBalance + gcashInTotalPaidByCustomer - gcashOutPrincipal + gcashOutFee;

                if (newGcashBalance < 0) {
                    // Note: This check might be less relevant for cash-out now, but good to keep.
                    throw "Insufficient GCash balance for this transaction.";
                }
                if (newCashOnHandBalance < 0) {
                    throw "Insufficient Cash on Hand for this transaction.";
                }

                transaction.update(gcashRef, { balance: newGcashBalance });
                transaction.update(cashOnHandRef, { balance: newCashOnHandBalance });

                // Logging for GCash Cash In/Out changes affecting Cash on Hand
                if (gcashInPrincipal > 0) {
                    const cashLogRef = doc(collection(db, "cash_on_hand_logs"));
                    transaction.set(cashLogRef, {
                        type: 'pos-gcash-cash-in',
                        cashImpact: gcashInTotalPaidByCustomer, // Total cash received
                        gcashPrincipalImpact: -gcashInPrincipal, // Principal removed from my digital GCash
                        gcashFeeCollected: gcashInFee,
                        newGcashBalance: newGcashBalance, // Snapshot of balance after all changes
                        newCashOnHandBalance: newCashOnHandBalance, // Snapshot of balance after all changes
                        // Use collected references for the log
                        reference: gcashInReferences.length > 0 ? gcashInReferences.join('; ') : 'Customer GCash Cash In (POS)',
                        user: currentUser.username,
                        timestamp: Timestamp.fromDate(new Date())
                    });
                }

                if (gcashOutPrincipal > 0) {
                    const cashLogRef = doc(collection(db, "cash_on_hand_logs"));
                    transaction.set(cashLogRef, {
                        type: 'pos-gcash-cash-out',
                        cashImpact: -gcashOutPrincipal, // Cash given out (negative value)
                        gcashPrincipalImpact: gcashOutTotalChargedToGcash, // Total charged to customer's GCash added to my digital GCash
                        gcashFeeCollected: gcashOutFee,
                        newGcashBalance: newGcashBalance, // Snapshot of balance after all changes
                        newCashOnHandBalance: newCashOnHandBalance, // Snapshot of balance after all changes
                        // Use collected references for the log
                        reference: gcashOutReferences.length > 0 ? gcashOutReferences.join('; ') : 'Customer GCash Cash Out (POS)',
                        user: currentUser.username,
                        timestamp: Timestamp.fromDate(new Date())
                    });
                }

                // 2. Calculate and update Printing balance
                const serviceTotal = currentTransactionItems
                    .filter(i => i.type === 'service')
                    .reduce((sum, i) => sum + i.total, 0);

                if (serviceTotal > 0) {
                    const currentPrintingBalance = printingDoc.exists() ? printingDoc.data().balance : 0;
                    const newPrintingBalance = currentPrintingBalance + serviceTotal;
                    transaction.set(printingRef, { balance: newPrintingBalance }, { merge: true });
                }

                // 4. Log the entire transaction
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
            // The functions below will now properly refresh all displays
            loadDashboardData(); // This will reload both GCash and Cash on Hand balances
        } catch (e) {
            console.error("Transaction failed: ", e);
            transactionMessage.textContent = `Transaction failed: ${e}`;
            transactionMessage.style.color = 'red';
        }

        setTimeout(() => transactionMessage.textContent = '', 4000);
    }
    
    // --- End of Shift Report ---
    async function generateShiftReport() {
        const serviceSales = todayServiceSalesEl.textContent;
        const gcashFees = todayGcashFeesEl.textContent;
        const transCount = todayTransactionCountEl.textContent;
        // ADD THIS
        const cashOnHand = dashboardCashOnHandDisplay.textContent;


        alert(
            `--- End of Shift Summary ---\n\n` +
            `Total Transactions: ${transCount}\n` +
            `Total Service Sales: ${serviceSales}\n` +
            `Total GCash Fees: ${gcashFees}\n` +
            `Current Cash on Hand: ${cashOnHand}\n\n` + // ADD THIS
            `Report generated for user: ${currentUser.username}`
        );

        // Optional: Implement Excel export for the shift
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const q = query(collection(db, "transactions"), where("user", "==", currentUser.username), where("timestamp", ">=", startOfDay));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return;

        const data = [];
        querySnapshot.forEach(doc => {
            const t = doc.data();
            data.push({
                'Time': t.timestamp.toDate().toLocaleTimeString(),
                'Items': t.items.map(i => i.description).join(', '),
                'Total': t.totalAmount
            });
        });
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Shift Report");
        XLSX.writeFile(workbook, `Shift_Report_${currentUser.username}_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    // --- EVENT LISTENERS ---
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    document.getElementById('cash-in-btn').addEventListener('click', () => handleGcashTransaction('in'));
    document.getElementById('cash-out-btn').addEventListener('click', () => handleGcashTransaction('out'));
    
    // Switch between service forms
    const serviceTypeSelect = document.getElementById('service-type');
    const serviceForms = document.querySelectorAll('.service-form');
    serviceTypeSelect.addEventListener('change', () => {
        serviceForms.forEach(form => form.style.display = 'none');
        const selectedFormId = serviceTypeSelect.value === 'photocopy' ? 'form-printing' : `form-${serviceTypeSelect.value}`;
        document.getElementById(selectedFormId).style.display = 'block';
    });

    // Add universal listener for all service forms
    serviceForms.forEach(form => form.addEventListener('submit', handleAddService));
    
    document.getElementById('clear-transaction-btn').addEventListener('click', () => {
        currentTransactionItems = [];
        renderTransaction();
    });
    document.getElementById('complete-payment-btn').addEventListener('click', handleCompletePayment);
    document.getElementById('end-of-shift-report-btn').addEventListener('click', generateShiftReport);

    transactionItemsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('item-remove')) {
            const index = e.target.dataset.index;
            handleRemoveItem(index);
        }
    });

    // --- INITIAL LOAD ---
    loadInitialData();
    loadDashboardData();
});