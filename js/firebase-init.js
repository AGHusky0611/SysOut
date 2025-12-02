// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCHFYVBtWGzDiMKTyYykGUGwD8FJNXf37s",
    authDomain: "sysoutpos.firebaseapp.com",
    projectId: "sysoutpos",
    storageBucket: "sysoutpos.appspot.com", // Corrected storage bucket name
    messagingSenderId: "773223620702",
    appId: "1:773223620702:web:88ed7649f85ef93a7414cf",
    measurementId: "G-HKXDFNBCPR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);