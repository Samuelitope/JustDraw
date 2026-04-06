import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPjcWTreZJ2M2iY2_kxoImiV5xLp_e6qg",
  authDomain: "justdraw-4bbde.firebaseapp.com",
  projectId: "justdraw-4bbde",
  storageBucket: "justdraw-4bbde.firebasestorage.app",
  messagingSenderId: "78967755781",
  appId: "1:78967755781:web:3ea46fad0006cd478f786c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);