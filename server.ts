import * as admin from 'firebase-admin';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { UserRole, StaffTeam } from "./src/types"; // بدون .js

// تهيئة Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
const PORT = 3000;
app.use(express.json());

// --- دوال الاتصال بـ Firestore ---

// جلب كامل الحالة (State) من Firebase
app.get("/api/state", async (req, res) => {
  try {
    const collections = ['employees', 'shifts', 'swapRequests', 'absences', 'evaluations', 'leaves', 'notices'];
    const state: any = { settings: { showAlgorithmToEmployees: true, showSmartControlToEmployees: true } };
    
    for (const col of collections) {
      const snapshot = await db.collection(col).get();
      state[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: "خطأ في الاتصال بقاعدة البيانات السحابية" });
  }
});

// إضافة موظف جديد لـ Firebase
app.post("/api/employees", async (req, res) => {
  try {
    const newEmp = req.body;
    const docRef = await db.collection('employees').add(newEmp);
    res.status(201).json({ id: docRef.id, ...newEmp });
  } catch (err) {
    res.status(500).json({ error: "خطأ في إضافة الموظف" });
  }
});

// تحديث موظف في Firebase
app.put("/api/employees/:id", async (req, res) => {
  try {
    await db.collection('employees').doc(req.params.id).update(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "خطأ في تحديث الموظف" });
  }
});

// --- دوال الذكاء الاصطناعي (كما هي) ---
let aiInstance: GoogleGenAI | null = null;
const getAiInstance = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY غير موجود");
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

app.post("/api/gemini/diagnostics-report", async (req, res) => {
  try {
    const { modality, finding } = req.body;
    const ai = getAiInstance();
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `اكتب تقرير طبي لـ ${modality} بناءً على: ${finding}`
    });
    res.json({ report: result.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- تشغيل الخادم ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(process.cwd(), "dist", "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`السيرفر يعمل الآن على http://0.0.0.0:${PORT}`));
}

startServer();