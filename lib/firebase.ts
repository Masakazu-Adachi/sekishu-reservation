import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const storageBucket =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
  "ochakai-reserve.appspot.com";

if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
  console.warn(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set. Falling back to default bucket",
    storageBucket,
  );
}

const firebaseConfig = {
  apiKey: "AIzaSyAvCJhb71RoHhw5KrKTK1ZUdpceuO8NXpw",
  authDomain: "ochakai-reserve.firebaseapp.com",
  projectId: "ochakai-reserve",
  storageBucket,
  messagingSenderId: "627049774917",
  appId: "1:627049774917:web:d7873398b9b2986d88028c",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
