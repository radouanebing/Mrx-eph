import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // ... (إعداداتك كما هي) ...
  apiKey: "AIzaSyBd-w-8ilUbkbTgYTE6_xe5NOcPfelLxAA",
  authDomain: "optimistic-doodad-l9fkf.firebaseapp.com",
  projectId: "optimistic-doodad-l9fkf",
  storageBucket: "optimistic-doodad-l9fkf.firebasestorage.app",
  messagingSenderId: "289992860788",
  appId: "1:289992860788:web:02dbf98d5f9c1db5bc1d21"
};

const app = initializeApp(firebaseConfig);

// قم بتعديل هذا السطر وأضف اسم قاعدة البيانات التي تظهر في الصورة:
export const db = getFirestore(app, "ai-studio-546797b1-c112-4e18-ae73-311f0d7d7108");