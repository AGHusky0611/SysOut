// WARNING: This file demonstrates an insecure, client-side only authentication pattern for testing.
// Do NOT use this in a production environment.

import { db } from './firebase-init.js';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { hashText } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // **FIX: MOVE THE PROTECTION LOGIC INSIDE DOMContentLoaded**
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'index.html'; // Redirect non-admins
        return; // Stop execution
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
        return 220; // Default for amounts over 11,000
    }

    // --- SETTINGS FUNCTIONS ---

    // Load and display all gcash settings
    async function loadGcashSettings() {
        const balanceDisplay = document.getElementById('current-gcash-balance');
        try {
            const settingsRef = doc(db, "settings", "gcash");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const settings = settingsSnap.data();
                // Defensive check: Ensure balance is a valid number before formatting
                const balance = parseFloat(settings.balance);
                if (!isNaN(balance)) {
                    balanceDisplay.textContent = `₱${balance.toFixed(2)}`;
                } else {
                    balanceDisplay.textContent = "Invalid Data"; // Handle non-numeric data
                }
            } else {
                balanceDisplay.textContent = "₱0.00";
            }
        } catch (error) {
            console.error("Error loading gcash settings:", error);
            balanceDisplay.textContent = "Error";
        }
    }

    async function loadPrintingSettings() {
        const balanceDisplay = document.getElementById('current-printing-balance');
        try {
            const settingsRef = doc(db, "settings", "printing");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const printingSettings = settingsSnap.data();
                // Defensive check: Ensure balance is a valid number before formatting
                const balance = parseFloat(printingSettings.balance);
                if (!isNaN(balance)) {
                    balanceDisplay.textContent = `₱${balance.toFixed(2)}`;
                } else {
                    balanceDisplay.textContent = "Invalid Data"; // Handle non-numeric data
                }
            } else {
                 balanceDisplay.textContent = "₱0.00";
            }
        } catch (error) {
            console.error("Error loading printing settings:", error);
            balanceDisplay.textContent = "Error";
        }
    }

    // Load and display service prices
    async function loadServicePrices() {
        try {
            const pricesRef = doc(db, "settings", "servicePrices");
            const pricesSnap = await getDoc(pricesRef);
            if (pricesSnap.exists()) {
                const prices = pricesSnap.data();
                // Loop through all keys in the prices object and set input values
                for (const key in prices) {
                    const input = document.getElementById(`price_${key}`);
                    if (input) {
                        input.value = prices[key];
                    }
                }
            }
        } catch (error) {
            console.error("Error loading service prices:", error);
        }
    }

    // --- END SETTINGS FUNCTIONS ---


    async function fetchAndDisplayUsers() {
        const usersTableBody = document.querySelector('#users-table tbody');
        if (!usersTableBody) return;
        usersTableBody.innerHTML = ''; // Clear table before populating

        try {
            const usersSnapshot = await getDocs(collection(db, "users"));
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                const row = usersTableBody.insertRow();

                // Prevent admin from deleting themselves
                const isCurrentUser = currentUser && currentUser.username === user.username;

                row.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>
                        <button class="edit-btn" data-username="${user.username}">Edit</button>
                        <button class="delete-btn" data-username="${user.username}" ${isCurrentUser ? 'disabled' : ''}>Delete</button>
                    </td>
                `;
            });
        } catch (error) {
            console.error("Error fetching users:", error);
            usersTableBody.innerHTML = `<tr><td colspan="4">Error loading users.</td></tr>`;
        }
    }

    // --- EXPORT FUNCTION ---
    async function exportTransactionsToExcel() {
        try {
            const transactionsSnapshot = await getDocs(collection(db, "transactions"));
            if (transactionsSnapshot.empty) {
                alert("No transactions to export.");
                return;
            }

            const data = [];
            transactionsSnapshot.forEach(doc => {
                const t = doc.data();
                const timestamp = t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString() : 'N/A';
                
                t.items.forEach(item => {
                    data.push({
                        'Transaction ID': doc.id,
                        'Date': timestamp,
                        'Cashier': t.user,
                        'Item Type': item.type,
                        'Description': item.description,
                        'Amount': item.amount || item.cost || 0,
                        'Service Fee': item.fee || 0,
                        'Item Total': item.total,
                        'Transaction Total': t.totalAmount
                    });
                });
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
            XLSX.writeFile(workbook, `SysOut_Transactions_${new Date().toISOString().slice(0,10)}.xlsx`);

        } catch (error) {
            console.error("Error exporting to Excel:", error);
            alert("Failed to export transactions. See console for details.");
        }
    }


    // Initial load
    fetchAndDisplayUsers();
    loadGcashSettings();
    loadPrintingSettings();
    loadServicePrices();

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    // CREATE User
    const createUserForm = document.getElementById('create-user-form');
    const formMessage = document.getElementById('form-message');
    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = createUserForm.username.value.trim();
            const email = createUserForm.email.value;
            const password = createUserForm.password.value;

            const userRef = doc(db, "users", username);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                formMessage.textContent = 'Error: Username already exists.'; return;
            }
            const hashedPassword = await hashText(password);
            await setDoc(userRef, { username, email, passwordHash: hashedPassword, role: 'user' });
            
            formMessage.textContent = `User '${username}' created.`;
            createUserForm.reset();
            fetchAndDisplayUsers(); // Refresh table
        });
    }

    // --- EVENT LISTENERS FOR SETTINGS ---

    // Handle GCash Balance Update
    const gcashForm = document.getElementById('gcash-balance-form');
    if (gcashForm) {
        gcashForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('gcash-message');
            const newBalance = parseFloat(document.getElementById('new-balance').value);

            if (isNaN(newBalance) || newBalance < 0) {
                messageEl.textContent = "Please enter a valid amount.";
                return;
            }

            try {
                // Use setDoc with merge:true to create or update without overwriting other fields
                await setDoc(doc(db, "settings", "gcash"), { balance: newBalance }, { merge: true });
                messageEl.textContent = "Balance updated successfully!";
                loadGcashSettings(); // Refresh display
                gcashForm.reset();
            } catch (error) {
                console.error("Error updating balance:", error);
                messageEl.textContent = "Failed to update balance.";
            }
            setTimeout(() => messageEl.textContent = '', 3000);
        });
    }
    
    // Handle Printing Balance Update
    const printingBalanceForm = document.getElementById('printing-balance-form');
    if(printingBalanceForm) {
        printingBalanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('printing-balance-message');
            const newBalance = parseFloat(document.getElementById('new-printing-balance').value);

            if (isNaN(newBalance) || newBalance < 0) {
                messageEl.textContent = "Please enter a valid amount.";
                return;
            }

            try {
                await setDoc(doc(db, "settings", "printing"), { balance: newBalance }, { merge: true });
                messageEl.textContent = "Balance updated successfully!";
                loadPrintingSettings(); // Refresh display
                printingBalanceForm.reset();
            } catch (error) {
                console.error("Error updating printing balance:", error);
                messageEl.textContent = "Failed to update balance.";
            }
            setTimeout(() => messageEl.textContent = '', 3000);
        });
    }

    // Handle Service Prices Update
    const pricesForm = document.getElementById('service-prices-form');
    if (pricesForm) {
        pricesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('pricing-message');
            const priceInputs = pricesForm.querySelectorAll('input[type="number"]');
            const prices = {};

            priceInputs.forEach(input => {
                const key = input.id.replace('price_', ''); // e.g., "price_printing_bw_letter" -> "printing_bw_letter"
                const value = parseFloat(input.value);
                if (!isNaN(value)) {
                    prices[key] = value;
                }
            });

            try {
                await setDoc(doc(db, "settings", "servicePrices"), prices);
                messageEl.textContent = "Prices saved successfully!";
            } catch (error) {
                console.error("Error updating prices:", error);
                messageEl.textContent = "Failed to save prices.";
            }
            setTimeout(() => messageEl.textContent = '', 3000);
        });
    }


    // EDIT and DELETE buttons (using event delegation)
    const usersTable = document.getElementById('users-table');
    const editModal = document.getElementById('editUserModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const editForm = document.getElementById('edit-user-form');

    usersTable.addEventListener('click', async (e) => {
        const target = e.target;
        const username = target.dataset.username;

        if (target.classList.contains('edit-btn')) {
            const userRef = doc(db, "users", username);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            
            document.getElementById('edit-username-hidden').value = username;
            document.getElementById('edit-email').value = userData.email;
            document.getElementById('edit-role').value = userData.role;
            document.getElementById('edit-password').value = '';
            editModal.style.display = 'flex';
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm(`Are you sure you want to delete user: ${username}?`)) {
                await deleteDoc(doc(db, "users", username));
                fetchAndDisplayUsers();
            }
        }
    });

    // UPDATE User (from modal)
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editFormMessage = document.getElementById('edit-form-message');
        editFormMessage.textContent = ''; // Clear previous messages

        const username = document.getElementById('edit-username-hidden').value;
        const email = document.getElementById('edit-email').value;
        const role = document.getElementById('edit-role').value;
        const newPassword = document.getElementById('edit-password').value;

        const userRef = doc(db, "users", username);
        const updateData = { email, role };
        
        if (newPassword) {
            updateData.passwordHash = await hashText(newPassword);
        }

        try {
            await updateDoc(userRef, updateData);
            editModal.style.display = 'none';
            fetchAndDisplayUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            editFormMessage.textContent = "Failed to update user. Please try again.";
        }
    });

    closeEditModal.onclick = () => editModal.style.display = 'none';
    
    // --- SIDEBAR TOGGLE FOR MOBILE ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Optional: Close sidebar when a nav link is clicked
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 900) {
                     sidebar.classList.remove('open');
                }
            });
        });
    }

    // --- GCASH FEE CHECKER ---
    const checkAmountInput = document.getElementById('check-amount');
    const calculatedFeeDisplay = document.getElementById('calculated-fee-display');

    if (checkAmountInput && calculatedFeeDisplay) {
        checkAmountInput.addEventListener('input', () => {
            const amount = parseFloat(checkAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                calculatedFeeDisplay.textContent = '₱0.00';
                return;
            }
            const fee = getGcashFee(amount);
            calculatedFeeDisplay.textContent = `₱${fee.toFixed(2)}`;
        });
    }

    // Export Button Listener
    const exportBtn = document.getElementById('export-excel-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportTransactionsToExcel);
    }
});