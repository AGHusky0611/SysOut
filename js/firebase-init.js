// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
// IMPORTANT: Replace the placeholder values with your actual Firebase project config
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

// Export the db instance so it can be used in other files
export { db };