import React, { useState, useEffect } from "react";
import { 
  Database, ShieldCheck, Download, Trash2, ArrowUpFromLine, 
  RefreshCw, AlertTriangle, Plus, HardDriveDownload, CloudLightning, 
  CloudRain, LogIn, LogOut, CheckCircle2, Lock, ShieldAlert 
} from "lucide-react";
import { BackupRecord, UserRole, Employee, hasPermission } from "../types.js";
import { 
  initAuth, googleSignIn, logout, saveBackupToDrive, 
  listBackupsFromDrive, deleteBackupFromDrive, downloadBackupFromDrive, 
  DriveBackup 
} from "../lib/gdrive.js";
import { User } from "firebase/auth";

interface BackupRestoreProps {
  backups: BackupRecord[];
  currentUser: Employee | null;
  onRefreshBackups: () => void;
  onCreateBackup: (notes: string) => void;
  onRestoreBackup: (id: string) => void;
  onDeleteBackup: (id: string) => void;
  isSyncing: boolean;
  onStateRestored?: () => void; // Extra callback to reload App's state
}

export default function BackupRestore({
  backups,
  currentUser,
  onRefreshBackups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  isSyncing,
  onStateRestored,
}: BackupRestoreProps) {
  const [notes, setNotes] = useState("");
  const [gdriveNotes, setGdriveNotes] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  
  // Google Drive state
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveBackups, setDriveBackups] = useState<DriveBackup[]>([]);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveConfirmId, setDriveConfirmId] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);
  const [autoBackupInterval, setAutoBackupInterval] = useState<"daily" | "weekly" | "disabled">("daily");

  const canManageSettings = hasPermission(currentUser, "manage_settings");

  // Hook up Firebase Auth listen
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user);
        refreshDriveBackups();
      },
      () => {
        setDriveUser(null);
        setDriveBackups([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const refreshDriveBackups = async () => {
    setIsDriveSyncing(true);
    try {
      const files = await listBackupsFromDrive();
      setDriveBackups(files);
    } catch (err) {
      console.error("Failed to load drive files:", err);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleSignInGDrive = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setDriveUser(result.user);
        const files = await listBackupsFromDrive();
        setDriveBackups(files);
        triggerClientToast("تم تسجيل الدخول لـ Google Drive بنجاح!");
      }
    } catch (err: any) {
      triggerClientToast("فشل تسجيل الدخول لـ Google: " + (err.message || err), true);
    }
  };

  const handleSignOutGDrive = async () => {
    try {
      await logout();
      setDriveUser(null);
      setDriveBackups([]);
      triggerClientToast("تم قطع الاتصال بـ Google Drive.");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const triggerClientToast = (msg: string, isError = false) => {
    setLocalFeedback(msg);
    setTimeout(() => setLocalFeedback(null), 5000);
  };

  const handleSubmitLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    onCreateBackup(notes || "نسخة احتياطية يدوية");
    setNotes("");
  };

  // Create & upload backup directly to Google Drive
  const handleCreateGDriveBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    if (!driveUser) {
      triggerClientToast("الرجاء تسجيل الدخول أولاً في خدمة Google Drive السحابية.", true);
      return;
    }

    setIsDriveSyncing(true);
    try {
      // Step 1: Fetch the current server state
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Failed to load state from hospital server");
      const currentState = await res.json();

      // Step 2: Upload to Google Drive using the cached token helper
      const driveRes = await saveBackupToDrive(currentState, gdriveNotes || "نسخة سحابية يدوية من المصلحة");
      
      triggerClientToast("تم تسجيل وحفظ النسخة الاحتياطية بنجاح على مساحة Google Drive الخاصة بك!");
      setGdriveNotes("");
      
      // Step 3: Refresh the cloud listed backups list
      await refreshDriveBackups();
    } catch (error: any) {
      console.error("GDrive backup error:", error);
      triggerClientToast("خطأ أثناء الرفع لـ Google Drive: " + (error.message || error), true);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Restore state from Google Drive file
  const handleRestoreFromDrive = async (fileId: string) => {
    if (!canManageSettings) return;
    setIsDriveSyncing(true);
    try {
      // Step 1: Download backup metadata content from drive path
      const stateContent = await downloadBackupFromDrive(fileId);
      
      // Step 2: Submit to our server payload replace API
      const res = await fetch("/api/state/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stateContent)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Server restore request declined");
      }

      triggerClientToast("تم ترميم واستعادة كامل بيانات المصلحة من نقطة Google Drive المحددة بنجاح!");
      setDriveConfirmId(null);

      // Step 3: Trigger full App.tsx state loaders if present
      if (onStateRestored) {
        onStateRestored();
      } else {
        // Fallback reload
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Restore from drive error:", error);
      triggerClientToast("فشل ترميم النسخة: " + (error.message || error), true);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Delete backup file from Google Drive
  const handleDeleteFromDrive = async (fileId: string) => {
    if (!canManageSettings) return;
    setIsDriveSyncing(true);
    try {
      await deleteBackupFromDrive(fileId);
      triggerClientToast("تم التخلص وحذف نسخة Google Drive المحددة نهائياً.");
      await refreshDriveBackups();
    } catch (error: any) {
      console.error("Delete from drive error:", error);
      triggerClientToast("فشل الحذف من السحابة: " + (error.message || error), true);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleDownloadBackupRaw = (bkId: string) => {
    window.open(`/api/state`, "_blank");
  };

  // Unauthorized screen layout if has no manage_settings permission
  if (!canManageSettings) {
    return (
      <div className="bg-white border border-slate-150 p-12 rounded-2xl shadow-xs text-center space-y-4 max-w-xl mx-auto my-8 font-sans" id="backup-unauthorized-view">
        <div className="h-14 w-14 bg-rose-50 border border-rose-250 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-base font-black text-slate-900">صلاحية إدارة إعدادات النظام مقفلة لديك</h3>
        <p className="text-xs text-slate-550 max-w-md mx-auto leading-relaxed">
          عذراً، تقع إدارة نقاط النسخ الاحتياطي وحماية أمن النظام وربط سحابة Google Drive ضمن الصلاحيات المتقدمة للأمن الرقمي.
          تواصل مع مدير المصلحة لتعديل صلاحيات حسابك لتمكين "إدارة إعدادات النظام".
        </p>
        <div className="border border-slate-100 bg-slate-50/75 p-3 rounded-xl max-w-sm mx-auto text-slate-500 text-[10px] space-y-1">
          <span className="font-bold block text-slate-700">مستوى صلاحياتك الحالي:</span>
          <span>{currentUser ? `${currentUser.name} (${currentUser.role})` : "غير مسجل"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="backups-tab-content">
      
      {/* Overview Banner */}
      <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">نظام أمن البيانات والنسخ السحابي المشترك (Google Drive)</h2>
              <p className="text-[11px] text-slate-500 mt-1">
                نظام حماية وسجلات تضمن عدم الفقدان المتوافق مع معايير الأمان الرقمية. أنشئ نقاط استرجاع مشفرة فورياً للمصلحة.
              </p>
            </div>
          </div>

          {/* Quick feedback toast inside component */}
          {localFeedback && (
            <div className="bg-slate-900 text-teal-300 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 animate-bounce">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span>{localFeedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* Google Drive Connection & Integration Board */}
      <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 select-none">
              <CloudLightning className="text-teal-600 h-4.5 w-4.5" />
              تكامل الحماية السحابية مع سحابة Google Drive الشخصية
            </h3>
            <p className="text-[10px] text-slate-500">
              قم بربط حساب Google الخاص بك لتتمكن من تشفير ورسم نسخ حماية المصلحة وحفظها مباشرة بمدونات حسابك في السحاب.
            </p>
          </div>

          <div>
            {!driveUser ? (
              <button
                onClick={handleSignInGDrive}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 font-extrabold text-[11px] px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-colors"
              >
                <LogIn className="h-4 w-4 text-teal-400" />
                <span>ربط السحابة عبر Google Sign-In</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-teal-50 border border-teal-150 p-2 rounded-xl">
                <div className="text-right">
                  <span className="block text-[10px] font-black text-teal-950">متصل بـ Google Drive السحابي</span>
                  <span className="block text-[9px] text-slate-500 font-sans">{driveUser.email}</span>
                </div>
                <button
                  onClick={handleSignOutGDrive}
                  className="p-1 px-2.5 bg-white text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  <span>فصل</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Automatic Backup Interval Settings */}
        <hr className="border-slate-100" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
          <div className="space-y-0.5">
            <span className="font-extrabold text-slate-800 block">جدولة النسخ التلقائي الدوري (Daily Scheduled indicator):</span>
            <span className="text-[10px] text-slate-500">يقوم النظام تلقائياً بإنشاء وحفظ نسخة احتياطية محلية جديدة في بداية كل يوم لتفادي الأخطاء.</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500">الدورية:</span>
            <select
              value={autoBackupInterval}
              onChange={(e) => {
                setAutoBackupInterval(e.target.value as any);
                triggerClientToast(`تم تحديث نظام النسخ الدوري التلقائي كـ: ${e.target.value === "daily" ? "يومي" : e.target.value === "weekly" ? "أسبوعي" : "معطل"}`);
              }}
              className="p-1 pb-1.5 bg-white border border-slate-200 text-slate-800 rounded font-bold text-[10px] cursor-pointer"
            >
              <option value="daily">نسخ احتياطي يومي (تلقائي مستمر)</option>
              <option value="weekly">نسخ احتياطي أسبوعي (دوري)</option>
              <option value="disabled">إيقاف الجدولة التلقائية</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Local vs GDrive Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="backups-split-views">
        
        {/* VIEW A: LOCAL BACKUPS */}
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-150">
            <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <Database className="h-4.5 w-4.5 text-slate-500 animate-bounce" />
              النسخ الاحتياطية المتوفرة بمخدم المستشفى ({backups.length})
            </h3>
            
            <button
              onClick={onRefreshBackups}
              disabled={isSyncing}
              className="text-[10px] text-teal-600 hover:text-teal-700 font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </button>
          </div>

          {/* Form to Create Local Backup */}
          <form onSubmit={handleSubmitLocal} className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-3">
            <div>
              <label className="block text-[10px] text-slate-350 font-bold mb-1">وصف/ عنوان النسخة الاحتياطية المحلية:</label>
              <input
                required
                type="text"
                placeholder="مثال: نسخة استباقية قبل فرز مناوبات يوليو..."
                className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-right"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all hover:scale-[1.01] cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4 text-slate-950 shadow-sm" />
              <span>إنشاء نسخة وحفظها محلياً على المخدم</span>
            </button>
          </form>

          {/* List of Local */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {backups.length === 0 ? (
              <div className="bg-white border border-slate-150 p-8 rounded-xl text-center text-slate-400 text-xs">
                لا توجد نقاط نسخ احتياطي محلية مسجلة حالياً.
              </div>
            ) : (
              backups.map((bk) => {
                const isConfirming = confirmId === bk.id;
                return (
                  <div key={bk.id} className="bg-white border border-slate-150 hover:border-slate-250 p-4 rounded-xl space-y-3 transition-colors">
                    <div>
                      <strong className="text-slate-900 font-bold text-xs block">{bk.notes}</strong>
                      <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                        المعرف: {bk.id} / الأبعاد: {bk.size}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans block mt-1">
                        تاريخ الحفظ: {new Date(bk.dateStr).toLocaleDateString("ar-EG")} - {new Date(bk.dateStr).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 flex-wrap gap-2 text-xs">
                      {isConfirming ? (
                        <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg flex flex-col gap-2 w-full">
                          <span className="text-rose-950 font-bold flex items-center gap-1 text-[10px]">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 animate-bounce" />
                            استرجاع؟ سيتم الكتابة فوق المناوبة المفتوحة حالياً!
                          </span>
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => setConfirmId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-[10px] font-bold text-slate-850 cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreBackup(bk.id);
                                setConfirmId(null);
                                triggerClientToast("تم استعادة وتحميل المناوبات المحلية بنجاح!");
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              نعم، استرجاع
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center w-full">
                          <button
                            type="button"
                            onClick={() => handleDownloadBackupRaw(bk.id)}
                            className="text-slate-500 hover:text-teal-600 font-bold text-[10px] flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            <span>تحميل كملف</span>
                          </button>

                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => onDeleteBackup(bk.id)}
                              className="p-1 px-1.5 text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                              title="حذف النسخة من القرص"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(bk.id)}
                              className="bg-slate-800 text-white hover:bg-slate-900 text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer"
                            >
                              استرجاع البيانات
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* VIEW B: GOOGLE DRIVE BACKUPS */}
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-150">
            <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <CloudLightning className="h-4.5 w-4.5 text-teal-600 animate-spin" />
              النسخ الاحتياطية المحفوظة بـ Google Drive السحابي ({driveBackups.length})
            </h3>
            
            <button
              onClick={refreshDriveBackups}
              disabled={isDriveSyncing || !driveUser}
              className="text-[10px] text-teal-600 hover:text-teal-700 font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isDriveSyncing ? "animate-spin" : ""}`} />
              <span>تحديث السحابة</span>
            </button>
          </div>

          {/* Form to upload to Google Drive */}
          <form onSubmit={handleCreateGDriveBackup} className="bg-teal-950 text-white p-4 rounded-xl border border-teal-900 space-y-3">
            <div>
              <label className="block text-[10px] text-teal-200 font-bold mb-1">وصف/ ملاحظة نقطة الحفظ بـ Google Drive:</label>
              <input
                required
                disabled={!driveUser}
                type="text"
                placeholder={driveUser ? "مثال: نسخة استباقية سحابية كاملة..." : "الرجاء تسجيل الدخول أولاً فوق..."}
                className="w-full text-xs p-2.5 bg-teal-900 border border-teal-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400 text-right placeholder-teal-700"
                value={gdriveNotes}
                onChange={(e) => setGdriveNotes(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isDriveSyncing || !driveUser}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all hover:scale-[1.01] cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4 text-slate-950" />
              <span>رفع نسخة الحفظ الحالية لسحابة Google Drive</span>
            </button>
          </form>

          {/* List of Drive files */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {!driveUser ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                <Lock className="h-6 w-6 text-slate-400 stroke-1" />
                <span>يرجى تسجيل الدخول بكود مصلحة الأشعة لتأمين قائمة النسخ السحابية لـ Google Drive.</span>
              </div>
            ) : driveBackups.length === 0 ? (
              <div className="bg-white border border-slate-150 p-8 rounded-xl text-center text-slate-400 text-xs">
                {isDriveSyncing ? "جاري جرد ملفات Google Drive..." : "لا توجد نقاط نسخ عولجت على Google Drive الخاص بك حتى الآن."}
              </div>
            ) : (
              driveBackups.map((f) => {
                const isDriveConfirming = driveConfirmId === f.id;
                const sizeKB = f.size ? (parseInt(f.size) / 1024).toFixed(2) : "غير محدد";

                return (
                  <div key={f.id} className="bg-white border border-teal-50 hover:border-teal-150 p-4 rounded-xl space-y-3 transition-all">
                    <div>
                      <strong className="text-slate-900 font-bold text-xs block">{f.description || f.name}</strong>
                      <span className="text-[9px] text-[10px] text-teal-800 font-black block mt-1">
                        ملف سحابي ID: {f.id.substring(0, 16)}... ({sizeKB} KB)
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans block mt-1">
                        تم الرفع: {new Date(f.createdTime).toLocaleDateString("ar-EG")} - {new Date(f.createdTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 flex-wrap gap-2 text-xs">
                      {isDriveConfirming ? (
                        <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg flex flex-col gap-2 w-full">
                          <span className="text-rose-950 font-bold flex items-center gap-1 text-[10px]">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 animate-bounce" />
                            تنبيه: سيتم تحميل هذه البيانات من السحاب واستبدال جدولك حالياً بالكامل!
                          </span>
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => setDriveConfirmId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-[10px] font-bold text-slate-850 cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestoreFromDrive(f.id)}
                              className="px-2.5 py-1 bg-teal-650 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              تأكيد ترميم واستعادة
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[9px] text-emerald-600 font-black flex items-center gap-1 font-sans bg-emerald-50 px-2 py-0.5 border border-emerald-150 rounded">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            سحابية معتمدة
                          </span>

                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteFromDrive(f.id)}
                              className="p-1 px-1.5 text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                              title="حذف ملف النسخة من سحابة درايف"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDriveConfirmId(f.id)}
                              className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer"
                            >
                              تحميل واسترجاع
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
