import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { db } from "../firebaseConfig";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

export const EmployeeManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Employee['role']>('Technician');
  const [specialty, setSpecialty] = useState('MRI');

  // جلب البيانات لحظياً من Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await addDoc(collection(db, 'employees'), {
      name, role, specialty, 
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120',
      contractType: 'Full-Time',
      weeklyHoursLimit: 40
    });
    setName('');
  };

  const handleRemove = async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
    if (selectedEmployee === id) setSelectedEmployee('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* الخطوة 1: اختيار الموظف */}
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <label className="block text-sm font-bold text-slate-700 mb-2">الرجاء اختيار اسم الموظف/العامل أولاً:</label>
        <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full bg-slate-50 border rounded-lg p-3">
          <option value="">-- اختر الموظف --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>

      {/* الخطوة 2: العرض بناءً على الاختيار */}
      {selectedEmployee && (
        <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100 flex justify-between items-center">
          <p className="text-sm text-cyan-800 font-bold">الموظف المختار: {employees.find(e => e.id === selectedEmployee)?.name}</p>
          <button onClick={() => handleRemove(selectedEmployee)} className="text-rose-600 font-bold text-xs flex items-center gap-1">
            <Trash2 className="h-4 w-4" /> استبعاد
          </button>
        </div>
      )}

      {/* نموذج إضافة كادر جديد */}
      <div className="bg-white p-6 rounded-xl shadow border h-fit space-y-4">
        <h4 className="text-sm font-bold text-slate-800 border-b pb-2"><UserPlus className="h-4 w-4 text-cyan-600 inline" /> تسجيل كادر جديد</h4>
        <form onSubmit={handleAdd} className="space-y-4">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الموظف" className="w-full text-xs bg-slate-50 border rounded-lg p-2.5" />
          <select value={role} onChange={(e) => setRole(e.target.value as Employee['role'])} className="w-full text-xs bg-slate-50 border rounded-lg p-2.5">
            <option value="Consultant">استشاري</option>
            <option value="Technician">تقني</option>
          </select>
          <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="التخصص (MRI, CT)" className="w-full text-xs bg-slate-50 border rounded-lg p-2.5" />
          <button type="submit" className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg text-xs">إضافة الكادر للسحابة</button>
        </form>
      </div>
    </div>
  );
};