import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2 } from 'lucide-react';
// تأكد من المسار الصحيح، استخدم ../ إذا كان الملف داخل مجلد
import { db } from '../firebaseConfig'; 
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Employee } from '../types';

export const EmployeeManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [role, setRole] = useState<any>('Technician');
  const [specialty, setSpecialty] = useState('MRI');

  useEffect(() => {
    const colRef = collection(db, 'employees');
    const unsub = onSnapshot(colRef, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Employee));
        setEmployees(data);
        setLoading(false);
      },
      (error) => {
        console.error("Firebase Error:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await addDoc(collection(db, 'employees'), {
        name, role, specialty,
        avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'
      });
      setName('');
    } catch (err) {
      console.error("Error adding document: ", err);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (err) {
      console.error("Error removing document: ", err);
    }
  };

  if (loading) return <div className="p-20 text-center font-bold">جاري الاتصال بقاعدة بيانات المشفى وجلب السجلات...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <Users className="h-6 w-6 text-cyan-600" />
          <h3 className="text-lg font-bold text-slate-800">إدارة الكوادر الطبية (سحابي)</h3>
        </div>
        <div className="bg-white rounded-xl shadow divide-y">
          {employees.map(emp => (
            <div key={emp.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={emp.avatar} alt="" className="h-10 w-10 rounded-full border" />
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800">{emp.name}</div>
                  <div className="text-xs text-slate-400">{emp.role} • التخصص: {emp.specialty}</div>
                </div>
              </div>
              <button onClick={() => handleRemove(emp.id)} className="text-slate-400 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow border h-fit space-y-4">
        <h4 className="text-sm font-bold border-b pb-2">تسجيل كادر جديد</h4>
        <form onSubmit={handleAdd} className="space-y-4">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الموظف" className="w-full text-xs bg-slate-50 border rounded-lg p-2.5" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full text-xs bg-slate-50 border rounded-lg p-2.5">
            <option value="Consultant">استشاري</option>
            <option value="Technician">تقني أشعة</option>
          </select>
          <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="التخصص (MRI, CT)" className="w-full text-xs bg-slate-50 border rounded-lg p-2.5" />
          <button type="submit" className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg text-xs">إضافة الكادر</button>
        </form>
      </div>
    </div>
  );
};