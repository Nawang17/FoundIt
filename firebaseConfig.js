import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBASG6oMAwjpiIKQRwKntPVa_2LsYdrq4c",
  authDomain: "foundit-72032.firebaseapp.com",
  projectId: "foundit-72032",
  storageBucket: "foundit-72032.firebasestorage.app",
  messagingSenderId: "294645918648",
  appId: "1:294645918648:web:4578b35e4361720cb23d4d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
