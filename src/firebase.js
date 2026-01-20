import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDNUD0aXKN3zdyKxUGqMgdBbW5Poomdros",
  authDomain: "intellection-classboard-v2.firebaseapp.com",
  projectId: "intellection-classboard-v2",
  storageBucket: "intellection-classboard-v2.firebasestorage.app",
  messagingSenderId: "401219921591",
  appId: "1:401219921591:web:3121a89c13129a5192cf32"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };