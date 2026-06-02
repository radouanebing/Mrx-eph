import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBd-w-8ilUbkbTgYTE6_xe5NOcPfelLxAA",
  authDomain: "optimistic-doodad-l9fkf.firebaseapp.com",
  projectId: "optimistic-doodad-l9fkf",
  storageBucket: "optimistic-doodad-l9fkf.firebasestorage.app",
  messagingSenderId: "289992860788",
  appId: "1:289992860788:web:02dbf98d5f9c1db5bc1d21"
};

// الحل الجذري: لا ننشئ التطبيق إلا إذا لم يكن موجوداً
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);