import { auth } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // Check auth state from sessionStorage
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    // If no user is logged in, OR if the user is an admin, redirect.
    // Admins should not access the user dashboard.
    if (!currentUser || currentUser.role === 'admin') {
        window.location.href = 'index.html';
        return; // Stop script execution
    }

    // --- Page Setup ---
    // Update the welcome message
    const welcomeHeader = document.querySelector('.main-header h1');
    if (welcomeHeader) {
        // Use the username from the session storage
        welcomeHeader.textContent = `Welcome, ${currentUser.username}!`;
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('currentUser'); // Clear the session
            window.location.href = 'index.html';
        });
    }

    // --- The rest of your dashboard modal and calculator logic ---
    // Modal elements
    const gcashModal = document.getElementById('gcashModal');
    const printModal = document.getElementById('printModal');

    // Buttons to open modals
    const gcashBtn = document.getElementById('gcashBtn');
    const printBtn = document.getElementById('printBtn');

    // Close buttons for modals
    const closeGcash = document.getElementById('closeGcash');
    const closePrint = document.getElementById('closePrint');

    // Function to open a modal
    const openModal = (modal) => {
        modal.style.display = 'flex';
    };

    // Function to close a modal
    const closeModal = (modal) => {
        modal.style.display = 'none';
    };

    // Event listeners for opening modals
    if (gcashBtn) gcashBtn.addEventListener('click', () => openModal(gcashModal));
    if (printBtn) printBtn.addEventListener('click', () => openModal(printModal));

    // Event listeners for closing modals
    if (closeGcash) closeGcash.addEventListener('click', () => closeModal(gcashModal));
    if (closePrint) closePrint.addEventListener('click', () => closeModal(printModal));

    // Close modal if user clicks outside of the modal content
    window.addEventListener('click', (event) => {
        if (event.target === gcashModal) {
            closeModal(gcashModal);
        }
        if (event.target === printModal) {
            closeModal(printModal);
        }
    });

    // --- Printing Cost Calculator ---
    const printingForm = document.getElementById('printingForm');
    const totalCostEl = document.getElementById('totalCost');

    // Prices (can be updated by admin later)
    const prices = {
        bw: 2,   // Black & White price per page
        color: 5 // Colored price per page
    };

    function calculatePrintCost() {
        const printType = document.getElementById('printType').value;
        const pages = parseInt(document.getElementById('pages').value) || 0;
        
        if (pages > 0) {
            const costPerPage = prices[printType];
            const total = costPerPage * pages;
            totalCostEl.textContent = `₱ ${total.toFixed(2)}`;
        } else {
            totalCostEl.textContent = '₱ 0.00';
        }
    }

    if (printingForm) {
        // Calculate on any form change
        printingForm.addEventListener('input', calculatePrintCost);
    }
});