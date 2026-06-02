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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans transition-all relative overflow-hidden" id="hospital-login-portal">
       {/* (باقي كود التصميم كما هو دون تغيير لضمان الشكل) */}
       {/* ... الجزء الخاص بالـ UI ... */}
       {/* تأكد فقط أن الـ select والـ input يستمران في العمل كما كانا */}
       {/* ... */}
    </div>
  );
}