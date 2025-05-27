import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAMbMdzVutAT73-iLGr_ob7dqPAIjBNoZ4",
  authDomain: "contabilidad-d0f49.firebaseapp.com",
  projectId: "contabilidad-d0f49",
  storageBucket: "contabilidad-d0f49.firebasestorage.app",
  messagingSenderId: "526596614435",
  appId: "1:526596614435:web:fc8a2d95db28838f5d0496",
  measurementId: "G-ESW3HSLJ50"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios que usaremos
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);