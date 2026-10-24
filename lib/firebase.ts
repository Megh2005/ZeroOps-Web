import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBUBi_4O2qIGqDKje1gH5OvaZA4AT0oS_M",
    authDomain: "zero-ops-citadel.firebaseapp.com",
    projectId: "zero-ops-citadel",
    storageBucket: "zero-ops-citadel.firebasestorage.app",
    messagingSenderId: "705456952090",
    appId: "1:705456952090:web:78b3965a48d23073fd92a3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };