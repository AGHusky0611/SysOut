// WARNING: This file demonstrates an insecure, client-side only authentication pattern for testing.
// Do NOT use this in a production environment.

import { db } from './firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { hashText } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // **FIX: ADD THIS BLOCK AT THE TOP**
    // If a user is already logged in, redirect them away from the login page.
    const loggedInUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (loggedInUser) {
        console.log('User already logged in. Redirecting...');
        if (loggedInUser.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
        return; // Stop the rest of the script from running
    }

    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the form from reloading the page
            loginMessage.textContent = ''; // Clear previous messages

            const username = loginForm.username.value.trim();
            const password = loginForm.password.value;

            if (!username || !password) {
                loginMessage.textContent = 'Please enter both username and password.';
                return;
            }

            try {
                const userRef = doc(db, "users", username);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    loginMessage.textContent = 'Error: Invalid username or password.';
                    return;
                }

                const userData = userSnap.data();
                const enteredPasswordHash = await hashText(password);

                if (userData.passwordHash === enteredPasswordHash) {
                    // Store user info in session storage
                    const userToStore = {
                        username: userData.username,
                        role: userData.role
                    };
                    sessionStorage.setItem('currentUser', JSON.stringify(userToStore));

                    // Redirect based on role
                    if (userData.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'user.html';
                    }
                } else {
                    loginMessage.textContent = 'Error: Invalid username or password.';
                }
            } catch (error) {
                console.error("Login Error:", error);
                loginMessage.textContent = 'An error occurred. Please try again.';
            }
        });
    }
});