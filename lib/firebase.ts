// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAvCJhb71RoHhw5KrKTK1ZUdpceuO8NXpw",
  authDomain: "ochakai-reserve.firebaseapp.com",
  projectId: "ochakai-reserve",
  storageBucket: "ochakai-reserve.appspot.com",
  messagingSenderId: "627049774917",
  appId: "1:627049774917:web:d7873398b9b2986d88028c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
