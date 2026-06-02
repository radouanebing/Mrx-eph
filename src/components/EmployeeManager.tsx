import React, { useState, useEffect } from "react";
import { Users, Plus, Trash2, Edit, CheckCircle2, ShieldAlert } from "lucide-react";
import { Employee, StaffSpecialty, UserRole, StaffTeam } from "../types.js";
import { db } from "../firebaseConfig"; // التأكد من مسار ملف الإعدادات
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // جلب البيانات من Firebase لحظياً
  useEffect(() => {
    const q = query(collection(db, "employees"), orderBy("name"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(data);
    });
    return () => unsub();
  }, []);

  // دالة الإضافة السحابية
  const handleAddEmployee = async (empData: any) => {
    await addDoc(collection(db, "employees"), empData);
    setIsFormOpen(false);
  };

  // دالة التحديث السحابية
  const handleUpdateEmployee = async (id: string, updates: Partial<Employee>) => {
    const empRef = doc(db, "employees", id);
    await updateDoc(empRef, updates);
  };

  // دالة الحذف السحابية
  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الموظف نهائياً؟")) {
      await deleteDoc(doc(db, "employees", id));
    }
  };

  return (
    <div className="space-y-6" id="employees-tab-content">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" /> إدارة الكوادر الطبية (سحابي)
          </h2>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 bg-teal-600 text-white font-black text-xs px-5 py-2.5 rounded-xl hover:bg-teal-700 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> <span>إضافة موظف</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm">{emp.name}</h3>
              <p className="text-xs text-slate-500">{emp.role}</p>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button onClick={() => handleDeleteEmployee(emp.id)} className="text-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer">
                <Trash2 className="h-3.5 w-3.5" /> حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}