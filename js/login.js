// WARNING: This file demonstrates an insecure, client-side only authentication pattern for testing.
// Do NOT use this in a production environment.

import { db } from './firebase-init.js';
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

            // Treat the 'username' input as the user's email for authentication
            const email = loginForm.username.value.trim();
            const password = loginForm.password.value;

            if (!email || !password) {
                loginMessage.textContent = 'Please enter both email and password.';
                return;
            }

            try {
                const auth = getAuth();
                // 1. Authenticate using Firebase's built-in sign-in function
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 2. After successful authentication, get the user's role from Firestore
                // This assumes the document ID in your 'users' collection is the user's email
                const userRef = doc(db, "users", user.email);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();

                    // 3. Store user info in session storage
                    const userToStore = {
                        username: userData.username || user.email, // Use username from DB, fallback to email
                        role: userData.role
                    };
                    sessionStorage.setItem('currentUser', JSON.stringify(userToStore));

                    // 4. Redirect based on the role found in Firestore
                    if (userData.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'user.html';
                    }
                } else {
                    // This can happen if a user exists in Firebase Auth but not in your 'users' collection
                    loginMessage.textContent = 'Authentication successful, but user role not found.';
                }

            } catch (error) {
                console.error("Login Error:", error.code, error.message);
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                     loginMessage.textContent = 'Error: Invalid email or password.';
                } else {
                     loginMessage.textContent = 'An error occurred. Please try again.';
                }
            }
        });
    }
});