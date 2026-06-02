import React, { useState, useEffect } from "react";
import { Employee, UserRole } from "../types.js";
import { db } from "./firebaseConfig"; // تأكد من مسار ملف الإعدادات
import { collection, onSnapshot } from "firebase/firestore";
import { ShieldCheck, Lock, User, Eye, EyeOff, Activity, AlertCircle, KeyRound } from "lucide-react";

interface LoginPortalProps {
  onLoginSuccess: (employee: Employee) => void;
}

export default function LoginPortal({ onLoginSuccess }: LoginPortalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // جلب البيانات من Firebase لحظياً
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "employees"), (snapshot) => {
      const empList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
      setEmployees(empList);
    });
    return () => unsub();
  }, []);

  const activeEmployees = employees.filter((e) => e.active !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedEmpId) {
      setError("الرجاء اختيار اسم الموظف/العامل أولاً.");
      return;
    }

    const employee = employees.find((emp) => emp.id === selectedEmpId);
    if (!employee) {
      setError("الموظف غير موجود في النظام.");
      return;
    }

    const enteredPassword = password.trim();
    const correctPassword = (employee.password || "123456").trim();

    if (enteredPassword === correctPassword) {
      onLoginSuccess(employee);
    } else {
      setError("كلمة المرور غير صحيحة!");
    }
  };

  return (
    // استبدل هذا الجزء داخل LoginPortal.tsx في الـ return الخاص بك:
<select
  id="employee-select"
  className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700 focus:border-sky-500 outline-none"
  value={selectedEmpId}
  onChange={(e) => setSelectedEmpId(e.target.value)}
>
  <option value="">-- اختر اسمك للولوج السريع --</option>
  {employees.map((emp) => (
    <option key={emp.id} value={emp.id}>
      {emp.name} ({emp.role === "MANAGER" ? "مدير مصلحة" : "موظف مصلحة"})
    </option>
  ))}
</select>
  );
}