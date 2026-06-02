import * as admin from 'firebase-admin';
import * as data from './data.json'; // تأكد أن ملفك يحتوي البيانات التي أرسلتها

// قم بتحميل ملف الـ JSON الخاص بـ Service Account من Firebase Console
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadData() {
  const collections = ['employees', 'shifts', 'swapRequests', 'absences', 'evaluations'];
  
  for (const col of collections) {
    if (data[col]) {
      for (const item of data[col]) {
        await db.collection(col).doc(item.id).set(item);
        console.log(`Uploaded ${col}: ${item.id}`);
      }
    }
  }
  console.log("تم رفع جميع البيانات بنجاح!");
}

uploadData();