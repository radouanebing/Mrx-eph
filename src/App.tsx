import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Employee, Shift, SuddenAbsence, LeaveRequest } from "./types";
import { db } from "./firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

// استيراد المكونات
import Header from "./components/Header";
import ScheduleGrid from "./components/ScheduleGrid";
import AbsenceAlerts from "./components/AbsenceAlerts";
import SwapBoard from "./components/SwapBoard";
import EmployeeManager from "./components/EmployeeManager";
import VacationRequests from "./components/VacationRequests";
import LoginPortal from "./components/LoginPortal";

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<SuddenAbsence[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<string>("schedule");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ربط Firebase بجميع المجموعات (Collections)
    const unsubEmployees = onSnapshot(collection(db, "employees"), (s) => 
      setEmployees(s.docs.map(d => ({id: d.id, ...d.data()} as Employee)))
    );
    const unsubShifts = onSnapshot(collection(db, "shifts"), (s) => 
      setShifts(s.docs.map(d => ({id: d.id, ...d.data()} as Shift)))
    );
    const unsubAbsences = onSnapshot(collection(db, "absences"), (s) => 
      setAbsences(s.docs.map(d => ({id: d.id, ...d.data()} as SuddenAbsence)))
    );
    const unsubLeaves = onSnapshot(collection(db, "leaves"), (s) => 
      setLeaves(s.docs.map(d => ({id: d.id, ...d.data()} as LeaveRequest)))
    );
    
    setLoading(false);

    return () => {
      unsubEmployees(); unsubShifts(); unsubAbsences(); unsubLeaves();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white">
        <RefreshCw className="h-10 w-10 animate-spin text-teal-400" />
        <p className="mt-4 font-bold">جاري المزامنة مع السحابة...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPortal onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header 
        currentUser={currentUser} 
        employees={employees} 
        onUserChange={() => {}} 
        syncStatus="idle" 
        onTriggerSync={() => {}} 
        onLogout={() => setCurrentUser(null)} 
      />
      
      <main className="p-8">
        {activeTab === "schedule" && <ScheduleGrid shifts={shifts} employees={employees} currentUser={currentUser} />}
        {activeTab === "employees" && <EmployeeManager />}
        {activeTab === "absences" && <AbsenceAlerts absences={absences} employees={employees} currentUser={currentUser} onCoverAbsence={() => {}} onReportSuddenAbsence={() => {}} />}
        {activeTab === "vacations" && <VacationRequests leaves={leaves} employees={employees} currentUser={currentUser} />}
      </main>
    </div>
  );
}