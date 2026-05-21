import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    getRedirectResult,
    onAuthStateChanged,
    signInWithRedirect,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB_zrmg8aLWHjiMxz0ZoxL2Zp1AUiDZsjs",
    authDomain: "nova-chat-3aa9e.firebaseapp.com",
    projectId: "nova-chat-3aa9e",
    storageBucket: "nova-chat-3aa9e.firebasestorage.app",
    messagingSenderId: "507690635546",
    appId: "1:507690635546:web:41757e2bf0ce850ad3dca3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export {
    addDoc,
    auth,
    collection,
    db,
    deleteDoc,
    doc,
    getDocs,
    getRedirectResult,
    GoogleAuthProvider,
    limit,
    onAuthStateChanged,
    onSnapshot,
    orderBy,
    provider,
    query,
    serverTimestamp,
    setDoc,
    signInWithRedirect,
    signInWithPopup,
    signOut,
    updateDoc,
    writeBatch
};
