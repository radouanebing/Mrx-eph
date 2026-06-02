import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  UserRole, StaffSpecialty, ShiftType, SwapStatus, StaffTeam,
  RadiologyState, Employee, Shift, ShiftSwapRequest, SuddenAbsence, 
  PerformanceEvaluation, LeaveType, LeaveStatus, LeaveRequest, AdminNotice
} from "./src/types.js";

const app = express();
const PORT = 3000;
const SECURE_TOKEN = "Hospital-Secure-2026"; // مفتاح الحماية

app.use(express.json());

// --- 1. نظام مراقبة العمليات (Audit Log) ---
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    const user = req.headers['x-user-name'] || 'مستخدم مجهول';
    console.log(`[AUDIT] ${new Date().toISOString()} | ${req.method} ${req.path} | بواسطة: ${user}`);
  }
  next();
});

// --- 2. بوابة الحماية (Security Middleware) ---
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  if (authHeader === SECURE_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: "غير مصرح بالدخول: يرجى التحقق من توكن الصلاحية" });
  }
};

// --- تطبيق الحماية على جميع مسارات الـ API ---
app.use('/api', authMiddleware);

// --- تهيئة المسارات والملفات ---
const DATA_DIR = path.join(process.cwd(), "data");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
const DB_FILE = path.join(DATA_DIR, "radiology_db.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR);

// --- دوال المساعدة (readState, saveState, Backup) ---
const readState = (): RadiologyState => {
  if (!fs.existsSync(DB_FILE)) return initialState;
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch { return initialState; }
};

const saveState = (state: RadiologyState) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
};

// [هنا يتم إدراج بيانات initialState كما كانت في ملفك الأصلي]
const initialState: RadiologyState = {
  employees: [], shifts: [], swapRequests: [], absences: [], evaluations: [],
  settings: { showAlgorithmToEmployees: true, showSmartControlToEmployees: true },
  leaves: [], notices: []
};

// --- الـ Endpoints ---
app.get("/api/state", (req, res) => {
  res.json(readState());
});

app.put("/api/settings", (req, res) => {
  const state = readState();
  state.settings = req.body;
  saveState(state);
  res.json(state.settings);
});

// [يمكنك هنا إضافة باقي الـ Endpoints (employees, shifts, etc) بنفس الطريقة]

// --- التكامل مع Gemini ---
let aiInstance: GoogleGenAI | null = null;
app.post("/api/gemini/diagnostics-report", async (req, res) => {
  try {
    const { modality, finding } = req.body;
    if (!aiInstance) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key Missing");
        aiInstance = new GoogleGenAI({ apiKey });
    }
    const result = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `اكتب تقرير طبي تشخيصي لـ ${modality} حول ${finding}...`
    });
    res.json({ report: result.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- تشغيل السيرفر ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Radiology System] Running securely on port ${PORT}`);
  });
}

startServer();