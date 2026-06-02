import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { db } from "../firebaseConfig";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

export const EmployeeManager: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]); // تغيير النوع لـ any لتجنب خطأ الـ Types
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Technician');
  const [specialty, setSpecialty] = useState('MRI');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'employees'), { name, role, specialty });
    setName('');
  };

  const handleRemove = async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
  };

  return (
    <div className="p-6">
      <select onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full p-3 border rounded-lg">
        <option value="">اختر موظف</option>
        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
      </select>
    </div>
  );
};