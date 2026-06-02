import React, { useState, useEffect } from "react";
// ... (حافظ على باقي الاستيرادات كما هي)
import { db } from "./firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  // ... (حافظ على باقي الـ states)

  // استبدال fetch بـ Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "employees"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(data);
      // هنا يمكنك أيضاً جلب الـ shifts والـ leaves من مجموعات أخرى في Firebase
    });
    return () => unsub();
  }, []);

  // احذف دالة fetchState القديمة التي تستخدم fetch، واستخدم هذا المنطق لجلب البيانات
  // ...