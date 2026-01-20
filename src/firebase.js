import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCwQNS9uWUtBYMqUKb2wWFtpZLNLW97Hwg",
  authDomain: "intellection-classboard-b2ee6.firebaseapp.com",
  projectId: "intellection-classboard-b2ee6",
  storageBucket: "intellection-classboard-b2ee6.firebasestorage.app",
  messagingSenderId: "36437442866",
  appId: "1:36437442866:web:9359f6c84d71a5dc56d72b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };