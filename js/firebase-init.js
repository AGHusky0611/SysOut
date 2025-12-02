// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };