// WARNING: This file demonstrates an insecure, client-side only authentication pattern for testing.
// Do NOT use this in a production environment.

import { db } from './firebase-init.js';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { hashText } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // **FIX: MOVE THE PROTECTION LOGIC INSIDE DOMContentLoaded**
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'admin') {
        console.error("Access Denied: Not an admin. Redirecting.");
        window.location.href = 'index.html';
        return; // Stop execution
    }

    // --- SETTINGS FUNCTIONS ---

    // Load and display all system settings
    async function loadGcashSettings() {
        const balanceDisplay = document.getElementById('current-gcash-balance');
        const feeInput = document.getElementById('service-fee');
        try {
            const settingsRef = doc(db, "settings", "gcash");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const settings = settingsSnap.data();
                balanceDisplay.textContent = `₱${(settings.balance || 0).toFixed(2)}`;
                feeInput.value = (settings.serviceFee || 0).toFixed(2);
            } else {
                balanceDisplay.textContent = "₱0.00";
            }
        } catch (error) {
            console.error("Error loading system settings:", error);
            balanceDisplay.textContent = "Error";
        }
    }

    async function loadPrintingSettings() {
        const balanceDisplay = document.getElementById('current-printing-balance');
        try {
            const settingsRef = doc(db, "settings", "printing");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                balanceDisplay.textContent = `₱${(settingsSnap.data().balance || 0).toFixed(2)}`;
            } else {
                 balanceDisplay.textContent = "₱0.00";
            }
        } catch (error) {
            console.error("Error loading printing settings:", error);
            balanceDisplay.textContent = "Error";
        }
    }

    // Load and display printing prices
    async function loadPrintPrices() {
        try {
            const pricesRef = doc(db, "settings", "printRates");
            const pricesSnap = await getDoc(pricesRef);
            if (pricesSnap.exists()) {
                const prices = pricesSnap.data();
                document.getElementById('price-a4-bw').value = prices.a4_bw || 0;
                document.getElementById('price-a4-color').value = prices.a4_color || 0;
                document.getElementById('price-letter-bw').value = prices.letter_bw || 0;
                document.getElementById('price-letter-color').value = prices.letter_color || 0;
                document.getElementById('price-legal-bw').value = prices.legal_bw || 0;
                document.getElementById('price-legal-color').value = prices.legal_color || 0;
            }
        } catch (error) {
            console.error("Error loading print prices:", error);
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
    loadPrintPrices();

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
    
    // Handle GCash Fee Update
    const gcashFeeForm = document.getElementById('gcash-fee-form');
    if (gcashFeeForm) {
        gcashFeeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('fee-message');
            const newFee = parseFloat(document.getElementById('service-fee').value);

             if (isNaN(newFee) || newFee < 0) {
                messageEl.textContent = "Please enter a valid fee.";
                return;
            }

            try {
                await setDoc(doc(db, "settings", "gcash"), { serviceFee: newFee }, { merge: true });
                messageEl.textContent = "Fee updated successfully!";
                loadGcashSettings(); // Refresh display
            } catch (error) {
                console.error("Error updating fee:", error);
                messageEl.textContent = "Failed to update fee.";
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

    // Handle Printing Prices Update
    const pricesForm = document.getElementById('printing-prices-form');
    if (pricesForm) {
        pricesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('pricing-message');
            
            const prices = {
                a4_bw: parseFloat(document.getElementById('price-a4-bw').value),
                a4_color: parseFloat(document.getElementById('price-a4-color').value),
                letter_bw: parseFloat(document.getElementById('price-letter-bw').value),
                letter_color: parseFloat(document.getElementById('price-letter-color').value),
                legal_bw: parseFloat(document.getElementById('price-legal-bw').value),
                legal_color: parseFloat(document.getElementById('price-legal-color').value)
            };

            try {
                await setDoc(doc(db, "settings", "printRates"), prices);
                messageEl.textContent = "Prices saved successfully!";
            } catch (error) {
                console.error("Error updating prices:", error);
                messageEl.textContent = "Failed to save prices.";
            }
            setTimeout(() => messageEl.textContent = '', 3000);
        });
    }

    // Export Button Listener
    const exportBtn = document.getElementById('export-excel-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportTransactionsToExcel);
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
});