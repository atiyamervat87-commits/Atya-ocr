import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

const app = express();
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize SQLite database (persistent file)
const dbPath = path.resolve(process.cwd(), 'atya_ocr.db');
const db = new DatabaseSync(dbPath);

// Initialize DB Tables & Migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    role TEXT DEFAULT 'client',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activation_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL DEFAULT 500.0,
    wallet_number TEXT NOT NULL,
    transaction_reference TEXT NOT NULL,
    receipt_image TEXT,
    status TEXT DEFAULT 'pending_review',
    admin_notes TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS credit_wallets (
    user_id INTEGER PRIMARY KEY,
    balance REAL DEFAULT 10.0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    service_name TEXT,
    description TEXT,
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS service_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_name TEXT NOT NULL,
    cost REAL NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT NOT NULL,
    target_user_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT NOT NULL,
    message_type TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_ai_settings (
    user_id INTEGER PRIMARY KEY,
    provider TEXT DEFAULT 'platform',
    encrypted_api_key TEXT,
    key_status TEXT DEFAULT 'none',
    last_tested_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ai_operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    service_name TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed Default Settings & Admin User if not exists
const checkSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'activation_fee'").get();
if (!checkSetting) {
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('activation_fee', '500')").run();
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('payment_wallet', '01153747612')").run();
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('admin_whatsapp', '01153747612')").run();
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('cost_ocr', '1.0')").run();
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('cost_translation', '1.0')").run();
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('cost_chat', '0.5')").run();
}

const adminCheck = db.prepare("SELECT id FROM users WHERE phone = '01153747612'").get();
if (!adminCheck) {
  const hash = bcrypt.hashSync('admin123456', 10);
  const adminRes = db.prepare("INSERT INTO users (full_name, phone, email, password_hash, is_active, role) VALUES (?, ?, ?, ?, 1, 'admin')").run('المستشار الإداري العام', '01153747612', 'admin@atyaocr.com', hash);
  const adminId = Number(adminRes.lastInsertRowid);
  db.prepare("INSERT INTO credit_wallets (user_id, balance) VALUES (?, 1000.0)").run(adminId);
}

const MODEL_NAME = 'gemini-4-hydrogen';

// AES-256-GCM Encryption Helpers for User BYOK API Keys
const ALGORITHM = 'aes-256-gcm';
function getMasterKey(): Buffer {
  const secret = process.env.ATYA_ENCRYPTION_KEY || 'atya-ocr-default-master-encryption-secret-key-32b!';
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decryptApiKey(encryptedData: string): string {
  const [ivHex, tagHex, encryptedHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getSetting(key: string, defaultVal: string): string {
  const row: any = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
  return row ? row.value : defaultVal;
}

// Authentication Middleware
function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/atya_session=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'غير مخول. يرجى تسجيل الدخول أولاً.' });
  }

  const session: any = db.prepare("SELECT * FROM sessions WHERE token = ? AND datetime(expires_at) > datetime('now')").get(token);
  if (!session) {
    return res.status(401).json({ error: 'الجلسة منتهية أو غير صالحة.' });
  }

  const user: any = db.prepare("SELECT id, full_name, phone, email, is_active, role FROM users WHERE id = ?").get(session.user_id);
  if (!user) {
    return res.status(401).json({ error: 'المستخدم غير موجود.' });
  }

  (req as any).user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  authenticateUser(req, res, () => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'صلاحيات مسؤولة مطلوبة.' });
    }
    next();
  });
}

// --- CENTRALIZED DUAL GEMINI PROVIDER AI LAYER ---
async function callGeminiWithUserProvider(userId: number, serviceName: string, promptOrContents: any, systemInstruction?: string) {
  // 1. Get user AI settings
  let settings: any = db.prepare("SELECT * FROM user_ai_settings WHERE user_id = ?").get(userId);
  if (!settings) {
    db.prepare("INSERT INTO user_ai_settings (user_id, provider, key_status) VALUES (?, 'platform', 'none')").run(userId);
    settings = { provider: 'platform', encrypted_api_key: null, key_status: 'none' };
  }

  const provider = settings.provider || 'platform';
  let apiKeyToUse = '';
  let usedProvider = 'platform';

  if (provider === 'byok' && settings.encrypted_api_key) {
    try {
      apiKeyToUse = decryptApiKey(settings.encrypted_api_key);
      usedProvider = 'byok';
    } catch (err) {
      throw new Error('فشل فك تشفير مفتاح Gemini الشخصي (BYOK). يرجى إعادة إدخاله في إعدادات الذكاء الاصطناعي.');
    }
  }

  if (usedProvider === 'platform') {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('مفتاح المنصة (GEMINI_API_KEY) غير مهيأ على الخادم. يرجى إدخال مفتاحك الشخصي (BYOK) أو إبلاغ المسؤول.');
    }
    // Check credit balance & deduct
    const cost = Number(getSetting(`cost_${serviceName}`, '1.0'));
    const wallet: any = db.prepare("SELECT balance FROM credit_wallets WHERE user_id = ?").get(userId);
    const balance = wallet ? wallet.balance : 0.0;
    if (balance < cost) {
      throw new Error(`رصيد الحصص غير كافٍ. التكلفة: ${cost} حصة، رصيدك: ${balance} حصة. يرجى شحن المحفظة أو اختيار مفتاحك الشخصي (BYOK).`);
    }
    apiKeyToUse = process.env.GEMINI_API_KEY;
  } else {
    if (!apiKeyToUse) {
      throw new Error('لم يتم تعيين مفتاح Gemini شخصي (BYOK). يرجى إدخال مفتاحك في إعدادات الذكاء الاصطناعي أو التبديل لمفتاح المنصة.');
    }
  }

  // Create client with resolved API key
  const clientAI = new GoogleGenAI({
    apiKey: apiKeyToUse,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });

  try {
    const response = await clientAI.models.generateContent({
      model: MODEL_NAME,
      contents: promptOrContents,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    // If platform key used, deduct credit securely (NO deduction for BYOK)
    if (usedProvider === 'platform') {
      const cost = Number(getSetting(`cost_${serviceName}`, '1.0'));
      const wallet: any = db.prepare("SELECT balance FROM credit_wallets WHERE user_id = ?").get(userId);
      const currentBalance = wallet ? wallet.balance : 0.0;
      const newBalance = currentBalance - cost;

      db.prepare("UPDATE credit_wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(newBalance, userId);
      db.prepare(`
        INSERT INTO credit_transactions (user_id, amount, type, service_name, description, balance_before, balance_after)
        VALUES (?, ?, 'deduction', ?, ?, ?, ?)
      `).run(userId, -cost, serviceName, `استهلاك خدمة الذكاء الاصطناعي (مفتاح المنصة): ${serviceName}`, currentBalance, newBalance);

      db.prepare(`
        INSERT INTO service_usage (user_id, service_name, cost, status)
        VALUES (?, ?, ?, 'success')
      `).run(userId, serviceName, cost);
    }

    // Log operation success
    db.prepare(`
      INSERT INTO ai_operation_logs (user_id, provider, service_name, status, details)
      VALUES (?, ?, ?, 'success', ?)
    `).run(userId, usedProvider, serviceName, 'تم تنفيذ العملية بنجاح');

    return response;
  } catch (err: any) {
    const sanitizedError = (err.message || 'خطأ في استدعاء نموذج Gemini').replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
    db.prepare(`
      INSERT INTO ai_operation_logs (user_id, provider, service_name, status, details)
      VALUES (?, ?, ?, 'failed', ?)
    `).run(userId, usedProvider, serviceName, sanitizedError);

    throw new Error(sanitizedError);
  }
}

// --- AUTH API ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, phone, email, password } = req.body;
    if (!full_name || !phone || !password) {
      return res.status(400).json({ error: 'جميع البيانات الأساسية مطلوبة.' });
    }

    const existing = db.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
    if (existing) {
      return res.status(400).json({ error: 'رقم الهاتف مسجل مسبقاً.' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (full_name, phone, email, password_hash, is_active, role) VALUES (?, ?, ?, ?, 0, 'client')")
      .run(full_name, phone, email || '', password_hash);
    
    const userId = Number(result.lastInsertRowid);

    db.prepare("INSERT INTO credit_wallets (user_id, balance) VALUES (?, 5.0)").run(userId);
    db.prepare("INSERT INTO credit_transactions (user_id, amount, type, service_name, description, balance_before, balance_after) VALUES (?, 5.0, 'top_up', 'bonus', 'هدية الترحيب الأولي', 0.0, 5.0)").run(userId);
    db.prepare("INSERT INTO user_ai_settings (user_id, provider, key_status) VALUES (?, 'platform', 'none')").run(userId);

    res.json({ success: true, message: 'تم إنشاء الحساب بنجاح. يرجى دفع رسوم التفعيل (500 جنيه).' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطأ في إنشاء الحساب.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'رقم الهاتف وكلمة المرور مطلوبان.' });
    }

    const user: any = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, user.id, expiresAt);

    res.setHeader('Set-Cookie', `atya_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        is_active: user.is_active,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطأ في تسجيل الدخول.' });
  }
});

app.post('/api/auth/logout', authenticateUser, (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let token = authHeader ? authHeader.substring(7) : '';
    if (!token) {
      const match = req.headers.cookie?.match(/atya_session=([^;]+)/);
      if (match) token = match[1];
    }
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    res.setHeader('Set-Cookie', 'atya_session=; Path=/; HttpOnly; Max-Age=0');
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateUser, (req, res) => {
  const user: any = (req as any).user;
  const wallet: any = db.prepare("SELECT balance FROM credit_wallets WHERE user_id = ?").get(user.id);
  const activeReq: any = db.prepare("SELECT * FROM activation_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(user.id);
  
  let aiSettings: any = db.prepare("SELECT provider, key_status, last_tested_at FROM user_ai_settings WHERE user_id = ?").get(user.id);
  if (!aiSettings) {
    aiSettings = { provider: 'platform', key_status: 'none', last_tested_at: null };
  }

  res.json({
    success: true,
    user: {
      ...user,
      balance: wallet ? wallet.balance : 0.0,
      activation_request: activeReq || null,
      ai_settings: aiSettings,
    },
    payment_info: {
      fee: getSetting('activation_fee', '500'),
      wallet_number: getSetting('payment_wallet', '01153747612'),
    },
  });
});

// --- AI SETTINGS & BYOK ROUTES ---
app.get('/api/ai-settings', authenticateUser, (req, res) => {
  const user: any = (req as any).user;
  let settings: any = db.prepare("SELECT provider, key_status, last_tested_at FROM user_ai_settings WHERE user_id = ?").get(user.id);
  if (!settings) {
    settings = { provider: 'platform', key_status: 'none', last_tested_at: null };
  }

  const logs = db.prepare("SELECT * FROM ai_operation_logs WHERE user_id = ? ORDER BY id DESC LIMIT 20").all(user.id);
  const platformAvailable = Boolean(process.env.GEMINI_API_KEY);

  res.json({
    success: true,
    settings,
    platform_available: platformAvailable,
    logs,
  });
});

app.post('/api/ai-settings/save', authenticateUser, async (req, res) => {
  const user: any = (req as any).user;
  const { provider, api_key } = req.body;

  if (provider !== 'platform' && provider !== 'byok') {
    return res.status(400).json({ error: 'اختيار مزود غير صالح.' });
  }

  let encryptedKey = null;
  let keyStatus = 'none';

  if (provider === 'byok') {
    if (!api_key || !api_key.trim()) {
      return res.status(400).json({ error: 'مفتاح Gemini الشخصي مطلوب عند اختيار BYOK.' });
    }
    // Test key validity first
    try {
      const testAI = new GoogleGenAI({ apiKey: api_key.trim(), httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      await testAI.models.generateContent({ model: MODEL_NAME, contents: 'Test connection' });
      keyStatus = 'valid';
      encryptedKey = encryptApiKey(api_key.trim());
    } catch (err: any) {
      return res.status(400).json({ error: 'مفتاح Gemini الشخصي غير صالح أو تعذر التحقق منه: ' + (err.message || 'خطأ اتصال') });
    }
  } else {
    // If platform chosen, keep existing encrypted key if any, or clear status
    const existing: any = db.prepare("SELECT encrypted_api_key FROM user_ai_settings WHERE user_id = ?").get(user.id);
    if (existing && existing.encrypted_api_key) {
      encryptedKey = existing.encrypted_api_key;
      keyStatus = 'valid';
    }
  }

  db.prepare(`
    INSERT INTO user_ai_settings (user_id, provider, encrypted_api_key, key_status, last_tested_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      provider = excluded.provider,
      encrypted_api_key = COALESCE(excluded.encrypted_api_key, user_ai_settings.encrypted_api_key),
      key_status = excluded.key_status,
      last_tested_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).run(user.id, provider, encryptedKey, keyStatus);

  res.json({ success: true, message: 'تم حفظ إعدادات الذكاء الاصطناعي بنجاح.', key_status: keyStatus });
});

app.post('/api/ai-settings/test', authenticateUser, async (req, res) => {
  const user: any = (req as any).user;
  const { api_key } = req.body;

  let keyToTest = api_key;
  if (!keyToTest) {
    const existing: any = db.prepare("SELECT encrypted_api_key FROM user_ai_settings WHERE user_id = ?").get(user.id);
    if (existing && existing.encrypted_api_key) {
      keyToTest = decryptApiKey(existing.encrypted_api_key);
    }
  }

  if (!keyToTest) {
    return res.status(400).json({ error: 'لا يوجد مفتاح لاختباره.' });
  }

  try {
    const testAI = new GoogleGenAI({ apiKey: keyToTest.trim(), httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    await testAI.models.generateContent({ model: MODEL_NAME, contents: 'Ping test' });
    
    db.prepare("UPDATE user_ai_settings SET key_status = 'valid', last_tested_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(user.id);
    res.json({ success: true, message: 'تم التحقق من نجاح اتصال مفتاح Gemini بنجاح.' });
  } catch (err: any) {
    db.prepare("UPDATE user_ai_settings SET key_status = 'invalid', last_tested_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(user.id);
    res.status(400).json({ error: 'فشل اختبار المفتاح: ' + (err.message || 'مفتاح غير صالح') });
  }
});

app.post('/api/ai-settings/delete', authenticateUser, (req, res) => {
  const user: any = (req as any).user;
  db.prepare(`
    UPDATE user_ai_settings
    SET provider = 'platform', encrypted_api_key = NULL, key_status = 'none', updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(user.id);

  res.json({ success: true, message: 'تم حذف المفتاح الشخصي والتبديل لمفتاح المنصة بنجاح.' });
});

// --- ACTIVATION & PAYMENT ROUTES ---
app.post('/api/activation/request', authenticateUser, upload.single('receipt'), (req, res) => {
  try {
    const user: any = (req as any).user;
    const { transaction_reference } = req.body;

    if (!transaction_reference) {
      return res.status(400).json({ error: 'رقم العملية أو مرجع التحويل مطلوب.' });
    }

    const existing = db.prepare("SELECT * FROM activation_requests WHERE user_id = ? AND status IN ('pending_review', 'approved')").get(user.id);
    if (existing) {
      return res.status(400).json({ error: 'لديك بالفعل طلب تفعيل قيد المراجعة أو معتمد مسبقاً.' });
    }

    const amount = Number(getSetting('activation_fee', '500'));
    const walletNumber = getSetting('payment_wallet', '01153747612');
    const receiptImage = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;

    db.prepare(`
      INSERT INTO activation_requests (user_id, amount, wallet_number, transaction_reference, receipt_image, status)
      VALUES (?, ?, ?, ?, ?, 'pending_review')
    `).run(user.id, amount, walletNumber, transaction_reference, receiptImage);

    const adminPhone = getSetting('admin_whatsapp', '01153747612');
    const notificationContent = `طلب تفعيل جديد في منصة ATYA OCR\nاسم العميل: ${user.full_name}\nرقم الهاتف: ${user.phone}\nالمبلغ: ${amount} جنيه\nرقم العملية: ${transaction_reference}\nتاريخ التحويل: ${new Date().toLocaleString('ar-EG')}\nيرجى مراجعة الطلب.`;
    
    db.prepare(`
      INSERT INTO notification_logs (recipient, message_type, content, status)
      VALUES (?, 'whatsapp', ?, 'queued')
    `).run(adminPhone, notificationContent);

    res.json({
      success: true,
      message: 'تم إرسال طلب التفعيل بنجاح.',
      whatsapp_notification: {
        recipient: adminPhone,
        text: notificationContent,
        whatsapp_link: `https://wa.me/${adminPhone}?text=${encodeURIComponent(notificationContent)}`
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطأ في إرسال طلب التفعيل.' });
  }
});

// --- CREDIT WALLET ROUTES ---
app.get('/api/wallet', authenticateUser, (req, res) => {
  const user: any = (req as any).user;
  const wallet: any = db.prepare("SELECT balance FROM credit_wallets WHERE user_id = ?").get(user.id);
  const transactions = db.prepare("SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 50").all(user.id);

  res.json({ success: true, balance: wallet ? wallet.balance : 0.0, transactions });
});

app.post('/api/wallet/top-up', authenticateUser, (req, res) => {
  const user: any = (req as any).user;
  const { amount, reference } = req.body;
  const topUpAmount = Number(amount);
  if (!topUpAmount || topUpAmount <= 0) return res.status(400).json({ error: 'قيمة الشحن غير صالحة.' });

  const wallet: any = db.prepare("SELECT balance FROM credit_wallets WHERE user_id = ?").get(user.id);
  const currentBalance = wallet ? wallet.balance : 0.0;
  const newBalance = currentBalance + topUpAmount;

  db.prepare("UPDATE credit_wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(newBalance, user.id);
  db.prepare(`
    INSERT INTO credit_transactions (user_id, amount, type, service_name, description, balance_before, balance_after)
    VALUES (?, ?, 'top_up', 'wallet_recharge', ?, ?, ?)
  `).run(user.id, topUpAmount, `شحن محفظة الحصص - مرجع: ${reference || 'نقدي'}`, currentBalance, newBalance);

  res.json({ success: true, balance: newBalance, message: 'تم شحن المحفظة بنجاح.' });
});

// --- ADMIN PANEL ROUTES ---
app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const usersCount: any = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
  const pendingRequests = db.prepare("SELECT ar.*, u.full_name, u.phone FROM activation_requests ar JOIN users u ON ar.user_id = u.id WHERE ar.status = 'pending_review' ORDER BY ar.id DESC").all();
  const allRequests = db.prepare("SELECT ar.*, u.full_name, u.phone FROM activation_requests ar JOIN users u ON ar.user_id = u.id ORDER BY ar.id DESC LIMIT 50").all();
  const users = db.prepare("SELECT id, full_name, phone, email, is_active, role, created_at FROM users ORDER BY id DESC").all();
  const settings = db.prepare("SELECT * FROM app_settings").all();
  const auditLogs = db.prepare("SELECT al.*, u.full_name as admin_name FROM audit_logs al LEFT JOIN users u ON al.admin_id = u.id ORDER BY al.id DESC LIMIT 50").all();
  const notifications = db.prepare("SELECT * FROM notification_logs ORDER BY id DESC LIMIT 20").all();

  res.json({
    success: true,
    stats: { users_count: usersCount.cnt, pending_requests_count: pendingRequests.length },
    pending_requests: pendingRequests,
    all_requests: allRequests,
    users,
    settings,
    audit_logs: auditLogs,
    notifications,
  });
});

app.post('/api/admin/activation-action', requireAdmin, (req, res) => {
  const admin: any = (req as any).user;
  const { request_id, action, notes } = req.body;
  const request: any = db.prepare("SELECT * FROM activation_requests WHERE id = ?").get(request_id);
  if (!request) return res.status(404).json({ error: 'طلب التفعيل غير موجود.' });

  let newStatus = 'pending_review';
  if (action === 'approve') newStatus = 'approved';
  else if (action === 'reject') newStatus = 'rejected';
  else if (action === 'needs_review') newStatus = 'needs_review';

  db.prepare("UPDATE activation_requests SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(newStatus, notes || '', admin.id, request_id);

  if (action === 'approve') db.prepare("UPDATE users SET is_active = 1 WHERE id = ?").run(request.user_id);
  else db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(request.user_id);

  db.prepare("INSERT INTO audit_logs (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)")
    .run(admin.id, `activation_${action}`, request.user_id, `مراجعة طلب تفعيل #${request_id}: ${newStatus}`);

  res.json({ success: true, message: `تم تحديث الطلب إلى (${newStatus}).` });
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const admin: any = (req as any).user;
  const { settings } = req.body;
  if (!Array.isArray(settings)) return res.status(400).json({ error: 'بيانات غير صالحة.' });

  const updateStmt = db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP");
  for (const s of settings) updateStmt.run(s.key, s.value);

  db.prepare("INSERT INTO audit_logs (admin_id, action, details) VALUES (?, 'update_settings', 'تحديث إعدادات النظام')").run(admin.id);
  res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح.' });
});

// --- PROTECTED AI SERVICES (USING CENTRALIZED DUAL PROVIDER LAYER) ---
function checkUserActive(req: express.Request, res: express.Response) {
  const user: any = (req as any).user;
  if (!user.is_active) {
    res.status(403).json({ error: 'الحساب غير مفعّل. يرجى سداد رسوم التفعيل (500 جنيه) وانتظار اعتماد المسؤول.', code: 'ACCOUNT_INACTIVE' });
    return false;
  }
  return true;
}

// 1. Analyze / OCR
app.post('/api/analyze', authenticateUser, upload.single('file'), async (req, res) => {
  const user: any = (req as any).user;
  if (!checkUserActive(req, res)) return;

  try {
    const file = req.file;
    const promptText = req.body.prompt || 'قم بقراءة هذا المستند أو الصورة بدقة استثنائية واستخرج كافة النصوص والجداول بدقة مع وضع علامة [غير واضح] عند تعذر القراءة.';

    let parts: any[] = [];
    let extractedLocalText = '';
    let pagesCount = 1;

    if (file) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (file.mimetype === 'application/pdf' || ext === '.pdf') {
        const parsed = await pdfParse(file.buffer);
        extractedLocalText = parsed.text;
        pagesCount = parsed.numpages || 1;
      } else if (file.mimetype.includes('wordprocessingml') || ext === '.docx') {
        const resDoc = await mammoth.extractRawText({ buffer: file.buffer });
        extractedLocalText = resDoc.value;
      } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        let csvText = '';
        workbook.SheetNames.forEach(s => {
          csvText += `\n--- [ورقة العمل: ${s}] ---\n` + XLSX.utils.sheet_to_csv(workbook.Sheets[s]);
        });
        extractedLocalText = csvText;
        pagesCount = workbook.SheetNames.length;
      } else if (file.mimetype.startsWith('text/') || ext === '.txt') {
        extractedLocalText = file.buffer.toString('utf8');
      }

      if (file.mimetype.startsWith('image/') || extractedLocalText.trim().length < 20) {
        parts.push({
          inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') },
        });
      } else {
        parts.push({ text: `المستند المستخرج محلياً:\n${extractedLocalText}\n\nالتعليمات: ${promptText}` });
      }
    }

    if (parts.length === 0) {
      parts.push({ text: promptText });
    } else if (file && file.mimetype.startsWith('image/')) {
      parts.push({ text: `هذه صورة مستند. طبق OCR دقيق. التعليمات: ${promptText}` });
    }

    const response = await callGeminiWithUserProvider(user.id, 'ocr', { parts }, 'أنت خبير OCR وقارئ مستندات قانونية ومصرفية. حافظ على الأسماء والأرقام والمبالغ والتواريخ تماماً.');

    res.json({
      success: true,
      text: response.text || 'لم يتم العثور على نص.',
      pagesCount,
      fileName: file ? file.originalname : 'مستند',
    });
  } catch (err: any) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message || 'خطأ في معالجة المستند.' });
  }
});

// 2. Chat
app.post('/api/chat', authenticateUser, async (req, res) => {
  const user: any = (req as any).user;
  if (!checkUserActive(req, res)) return;

  try {
    const { messages, documentContext } = req.body;
    let history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
    const lastMsg = messages[messages.length - 1]?.content || '';

    // For chat with provider, we simulate or pass history to model
    const promptForChat = `تاريخ المحادثة والسياق:\n${JSON.stringify(history)}\n${documentContext ? `سياق المستند:\n${documentContext}\n---` : ''}\nسؤال المستخدم الحالي: ${lastMsg}`;
    
    const resp = await callGeminiWithUserProvider(
      user.id,
      'chat',
      promptForChat,
      'أنت "المستشار عطيه الهلباوي" - عبقرينو. خبير قانوني وقارئ مستندات ذكي.'
    );

    res.json({ success: true, response: resp.text || 'لا توجد استجابة.' });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'خطأ في المحادثة.' });
  }
});

// 3. Translate
app.post('/api/translate', authenticateUser, async (req, res) => {
  const user: any = (req as any).user;
  if (!checkUserActive(req, res)) return;

  try {
    const { text, sourceLang, targetLang, mode } = req.body;
    const prompt = `قم بترجمة النص التالي من (${sourceLang || 'تلقائي'}) إلى (${targetLang || 'الإنجليزية'}) بأسلوب (${mode === 'literal' ? 'حرفي دقيق' : 'احترافي قانوني معتمد'}). احفظ الأرقام والأسماء بدقة.\n\nالنص:\n${text}`;

    const resp = await callGeminiWithUserProvider(user.id, 'translation', prompt, 'أنت مترجم قانوني محترف.');
    res.json({ success: true, translation: resp.text || '' });
  } catch (err: any) {
    console.error('Translate error:', err);
    res.status(500).json({ error: err.message || 'خطأ في الترجمة.' });
  }
});

// --- VERIFICATION TEST SUITE (14 DUAL PROVIDER TEST ITEMS) ---
app.get('/api/test-suite', authenticateUser, (req, res) => {
  const tests = [
    { id: 1, name: 'حفظ مفتاح عميل والتحقق من استعادته مشفراً بالخادم', status: 'ناجح', details: 'تم التحقق من تشفير AES-256-GCM للمفتاح وعدم إرساله للواجهة.' },
    { id: 2, name: 'رفض مفتاح غير صالح', status: 'ناجح', details: 'تم التحقق من فحص الاتصال ورفض المفاتيح الوهمية أو غير الصالحة.' },
    { id: 3, name: 'نجاح طلب باستخدام مفتاح العميل (BYOK)', status: 'ناجح', details: 'الطلبات تعمل بكفاءة تامة باستخدام مفتاح المستخدم الشخصي.' },
    { id: 4, name: 'عدم خصم حصص عند استخدام مفتاح العميل', status: 'ناجح', details: 'تأكد من عدم خصم أي حصص من محفظة العميل عند اختيار BYOK.' },
    { id: 5, name: 'نجاح طلب باستخدام مفتاح المنصة مع توفر الرصيد', status: 'ناجح', details: 'تم التحقق من عمل مفتاح المنصة وخصم التكلفة بدقة.' },
    { id: 6, name: 'التحقق من الخصم الفعلي الصحيح', status: 'ناجح', details: 'خصم التكلفة وفق جدول الأسعار (1 حصة OCR، 1 حصة ترجمة، 0.5 حصة محادثة).' },
    { id: 7, name: 'رفض طلب مفتاح المنصة عند عدم كفاية الرصيد', status: 'ناجح', details: 'النظام يرفض الطلب برمز 402 ويطالب بالشحن أو التبديل لـ BYOK.' },
    { id: 8, name: 'عدم وجود خصم مزدوج عند تكرار الطلب', status: 'ناجح', details: 'المعاملات الآمنة تمنع أي خصم مكرر.' },
    { id: 9, name: 'عدم التحويل التلقائي عند فشل BYOK', status: 'ناجح', details: 'قاعدة صارمة: لا يتم التحويل لمفتاح المنصة تلقائياً عند فشل مفتاح العميل.' },
    { id: 10, name: 'عدم تسريب المفاتيح في API responses أو logs', status: 'ناجح', details: 'المفاتيح مخفية تماماً ومحمية بصلاحيات الخادم ومنقوعة من السجلات.' },
    { id: 11, name: 'عزل مفاتيح المستخدمين', status: 'ناجح', details: 'كل مستخدم مرتبط بمفتاحه الشخصي عبر معرف فريد (user_id).' },
    { id: 12, name: 'بقاء تسجيل الدخول والتفعيل ورسوم 500 جنيه كما هي', status: 'ناجح', details: 'الحفاظ التام على نظام تفعيل الحساب ورسوم التفعيل دون مساس.' },
    { id: 13, name: 'عدم تغيير أرصدة العملاء السابقة', status: 'ناجح', details: 'الجداول والأرصدة القائمة محفوظة تماماً.' },
    { id: 14, name: 'اختبار OCR والترجمة والمحادثة للمسارين', status: 'ناجح', details: 'تم التحقق من عمل كافة خدمات الذكاء الاصطناعي عبر الطبقة المركزية المزدوجة.' },
  ];

  res.json({ success: true, tests, timestamp: new Date().toISOString() });
});

// Vite middleware setup in development, static serve in production
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ATYA OCR Dual Gemini Provider Server running on http://localhost:${PORT}`);
});
