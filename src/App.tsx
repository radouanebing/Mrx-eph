// 1. تأكد من وجود هذه الاستيرادات في أعلى الملف
import { db } from "./firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

// 2. داخل دالة App، استبدل useEffect القديم (الذي يحتوي على fetchState) بهذا المنطق الجديد:
useEffect(() => {
  setSyncStatus("syncing");
  
  // الاستماع لمجموعة الموظفين (employees)
  const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    setEmployees(data);
    setSyncStatus("idle");
  }, (error) => {
    console.error("Firebase Error:", error);
    setSyncStatus("error");
  });

  // ملاحظة: يمكنك إضافة onSnapshot لمجموعات أخرى (shifts, leaves) بنفس الطريقة هنا
  
  return () => {
    unsubEmployees();
  };
}, []);

// 3. قم بتعليق (Comment) أو حذف دالة fetchState القديمة التي تستخدم fetch بالكامل
// (لا تحذفها إذا كنت لا تزال تحتاجها لأجزاء أخرى، فقط ضع /* */ حولها)