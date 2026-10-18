import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const DELETED_FILE = path.join(DATA_DIR, 'deleted_subscriptions.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'admin_audit_logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Automatically ensure no Gmail accounts are blocked or blacklisted
if (fs.existsSync(DELETED_FILE)) {
  try {
    fs.writeFileSync(DELETED_FILE, JSON.stringify([], null, 2), 'utf-8');
  } catch {}
}

function getDeletedEmailsData(): string[] {
  // Always return empty array so that no Gmail is permanently blocked from accessing or logging into the app
  return [];
}

function saveDeletedEmailData(_email: string): void {
  // Disabled: Do not permanently blacklist any email when deleted/canceled
}

function removeDeletedEmailData(_email: string): void {
  // Always clean deleted file
  try {
    if (fs.existsSync(DELETED_FILE)) {
      fs.writeFileSync(DELETED_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {}
}

// Audit Logs Management
function getAuditLogsData(): any[] {
  try {
    if (!fs.existsSync(AUDIT_LOGS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(AUDIT_LOGS_FILE, 'utf-8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Error reading audit logs file:', err);
    return [];
  }
}

function saveAuditLogData(log: any): void {
  try {
    const list = getAuditLogsData();
    list.unshift({
      ...log,
      id: log.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: log.timestamp || new Date().toISOString()
    });
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(list.slice(0, 500), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving audit log file:', err);
  }
}

// Check admin caller permissions on server-side
function isServerAdmin(callerEmail?: string): boolean {
  if (!callerEmail) return false;
  const clean = String(callerEmail).trim().toLowerCase();
  return clean === 'djazild@gmail.com' || clean === 'hdjazil95@gmail.com';
}

// Default initial subscriptions
const DEFAULT_SUBSCRIPTIONS = {
  'djazild@gmail.com': {
    teacherEmail: 'djazild@gmail.com',
    teacherName: 'الأستاذ المشرف djazild',
    planId: 'lifetime',
    status: 'active',
    amountDZD: 0,
    isLifetime: true,
    expiresAt: null,
    activatedAt: '2024-01-01T00:00:00.000Z',
    adminNotes: 'حساب المشرف العام والمدير الرئيسي'
  }
};

function getSubscriptionsData(): Record<string, any> {
  try {
    let rawData: Record<string, any> = {};
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
      rawData = { ...DEFAULT_SUBSCRIPTIONS };
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(rawData, null, 2), 'utf-8');
    } else {
      const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      rawData = JSON.parse(raw) || {};
    }

    return rawData;
  } catch (err) {
    console.error('Error reading subscriptions file:', err);
    return {};
  }
}

function saveSubscriptionsData(data: Record<string, any>): boolean {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving subscriptions file:', err);
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route: Get all subscriptions
  app.get('/api/subscriptions', (req, res) => {
    const subs = getSubscriptionsData();
    res.json({ success: true, subscriptions: subs, count: Object.keys(subs).length });
  });

  // API Route: Post new subscription request
  app.post('/api/subscriptions', (req, res) => {
    const sub = req.body;
    if (!sub || !sub.teacherEmail) {
      return res.status(400).json({ success: false, message: 'بيانات الاشتراك غير مكتملة (البريد مطلوب)' });
    }

    const emailClean = sub.teacherEmail.trim().toLowerCase();
    const subs = getSubscriptionsData();

    subs[emailClean] = {
      ...subs[emailClean],
      ...sub,
      teacherEmail: emailClean,
      requestedAt: sub.requestedAt || new Date().toISOString(),
      status: sub.status || 'pending'
    };

    saveSubscriptionsData(subs);
    console.log(`[API] Subscription updated for: ${emailClean}`);
    res.json({ success: true, message: 'تم تسجيل طلب الاشتراك بنجاح وصل للسيرفر', subscription: subs[emailClean] });
  });

  // API Route: Register new Google user
  app.post('/api/subscriptions/register', (req, res) => {
    const { teacherEmail, teacherName, status, planId, requestedAt, notes } = req.body;
    if (!teacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }

    const emailClean = teacherEmail.trim().toLowerCase();

    // If re-registering after deletion, un-blacklist
    removeDeletedEmailData(emailClean);

    const subs = getSubscriptionsData();
    const existing = subs[emailClean];

    // If user was previously active and not deleted, keep active. Otherwise default to pending
    const finalStatus = existing?.status === 'active' ? 'active' : 'pending';

    subs[emailClean] = {
      teacherEmail: emailClean,
      teacherName: teacherName || existing?.teacherName || emailClean.split('@')[0],
      planId: existing?.planId || planId || '6months',
      status: finalStatus,
      amountDZD: existing?.amountDZD || 3000,
      paymentProof: existing?.paymentProof,
      requestedAt: existing?.requestedAt || requestedAt || new Date().toISOString(),
      activatedAt: finalStatus === 'active' ? existing?.activatedAt : undefined,
      expiresAt: finalStatus === 'active' ? (existing?.expiresAt || null) : null,
      isLifetime: finalStatus === 'active' ? (existing?.isLifetime || false) : false,
      adminNotes: notes || existing?.adminNotes || 'حساب أستاذ جديد مسجل بانتظار التفعيل من طرف الإدارة'
    };

    saveSubscriptionsData(subs);
    console.log(`[API] User registered/re-registered via Google: ${emailClean} (status: ${finalStatus})`);
    res.json({ success: true, message: 'تم تسجيل الحساب الجديد بالسيرفر بنجاح بانتظار التفعيل', subscription: subs[emailClean] });
  });

  // API Route: Submit subscription request with payment proof
  app.post('/api/subscriptions/request', (req, res) => {
    const { teacherEmail, teacherName, planId, proof } = req.body;
    if (!teacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }

    const emailClean = teacherEmail.trim().toLowerCase();
    const subs = getSubscriptionsData();

    subs[emailClean] = {
      ...subs[emailClean],
      teacherEmail: emailClean,
      teacherName: teacherName || subs[emailClean]?.teacherName || emailClean.split('@')[0],
      phoneNumber: proof?.phoneNumber || subs[emailClean]?.phoneNumber || '',
      planId: planId || '6months',
      status: 'pending',
      amountDZD: proof?.amount || 3000,
      paymentProof: proof,
      requestedAt: new Date().toISOString(),
      isLifetime: planId === 'lifetime'
    };

    saveSubscriptionsData(subs);
    console.log(`[API] Payment proof request received for: ${emailClean}`);
    res.json({ success: true, message: 'تم إرسال طلب الاشتراك مع وصل بريدي موب بنجاح', subscription: subs[emailClean] });
  });

  // API Route: Activate subscription by Admin
  app.post('/api/subscriptions/activate', (req, res) => {
    const { currentCallerEmail, targetTeacherEmail, planId, options } = req.body;
    if (!targetTeacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني للأستاذ المستهدف مطلوب' });
    }

    const callerClean = (currentCallerEmail || '').trim().toLowerCase();
    const isAdmin = callerClean === 'djazild@gmail.com' || callerClean === 'hdjazil95@gmail.com';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتفعيل الحسابات. العملية تتطلب حساب المشرف العام djazild@gmail.com'
      });
    }

    const emailClean = targetTeacherEmail.trim().toLowerCase();
    const subs = getSubscriptionsData();
    const now = new Date();

    let expiresAt: string | null = null;
    const isLifetime = planId === 'lifetime';

    if (!isLifetime) {
      const days = options?.customDays || (planId === '1month' ? 30 : planId === '1year' ? 365 : 180);
      expiresAt = new Date(now.getTime() + days * 86400000).toISOString();
    }

    const existing = subs[emailClean];
    subs[emailClean] = {
      teacherEmail: emailClean,
      teacherName: existing?.teacherName || emailClean.split('@')[0],
      phoneNumber: existing?.phoneNumber || '',
      planId: planId || '6months',
      status: 'active',
      amountDZD: options?.customPriceDZD !== undefined ? options.customPriceDZD : (existing?.amountDZD || 3000),
      paymentProof: existing?.paymentProof,
      requestedAt: existing?.requestedAt || now.toISOString(),
      activatedAt: now.toISOString(),
      expiresAt,
      activatedByAdminEmail: currentCallerEmail || 'djazild@gmail.com',
      adminNotes: options?.adminNotes || 'تم التفعيل المباشر وتأكيد الاشتراك من لوحة التحكم',
      isLifetime
    };

    saveSubscriptionsData(subs);
    saveAuditLogData({
      actionType: 'activate',
      adminEmail: currentCallerEmail || 'djazild@gmail.com',
      targetTeacherEmail: emailClean,
      details: `تم تفعيل الاشتراك (${planId})`,
      result: 'success'
    });
    console.log(`[API] Subscription activated for: ${emailClean}`);
    res.json({ success: true, message: `تم تفعيل حساب الأستاذ ${emailClean} بنجاح`, subscription: subs[emailClean] });
  });

  // API Route: 1. إلغاء الاشتراك فقط (Cancel subscription -> status: pending)
  app.post('/api/subscriptions/cancel', (req, res) => {
    const { currentCallerEmail, targetTeacherEmail, reason } = req.body;
    if (!targetTeacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني للأستاذ مطلوب' });
    }

    const emailClean = targetTeacherEmail.trim().toLowerCase();
    if (emailClean === 'djazild@gmail.com') {
      return res.status(403).json({ success: false, message: 'لا يمكن إلغاء اشتراك المشرف العام djazild@gmail.com' });
    }

    const subs = getSubscriptionsData();
    const existing = subs[emailClean];

    if (!existing) {
      return res.status(404).json({ success: false, message: 'حساب الأستاذ غير مسجل' });
    }

    const now = new Date().toISOString();
    subs[emailClean] = {
      ...existing,
      status: 'pending',
      planId: 'none',
      isLifetime: false,
      canceledAt: now,
      adminNotes: `تم إلغاء الاشتراك من طرف المشرف: ${reason || 'بانتظار تجديد الاشتراك وإرسال وصل جديد'}`
    };

    saveSubscriptionsData(subs);
    saveAuditLogData({
      actionType: 'cancel_subscription',
      adminEmail: currentCallerEmail || 'djazild@gmail.com',
      targetTeacherEmail: emailClean,
      details: reason || 'إلغاء استحقاق الاشتراك وتحويله إلى قيد المراجعة',
      result: 'success'
    });

    console.log(`[API] Subscription canceled for: ${emailClean} (now pending)`);
    res.json({
      success: true,
      message: `تم إلغاء اشتراك الأستاذ (${emailClean}) بنجاح. الحساب مسجل وقيد المراجعة دون حظر.`,
      subscription: subs[emailClean]
    });
  });

  // API Route: 2. إيقاف / إعادة تنشيط الحساب (Suspend / Unsuspend)
  app.post('/api/subscriptions/suspend', (req, res) => {
    const { currentCallerEmail, targetTeacherEmail, reason, suspend } = req.body;
    if (!targetTeacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }

    const emailClean = targetTeacherEmail.trim().toLowerCase();
    if (emailClean === 'djazild@gmail.com') {
      return res.status(403).json({ success: false, message: 'لا يمكن تعطيل حساب المشرف العام djazild@gmail.com' });
    }

    const subs = getSubscriptionsData();
    const existing = subs[emailClean];

    if (!existing) {
      return res.status(404).json({ success: false, message: 'الحساب غير موجود' });
    }

    const isSuspending = suspend !== undefined ? Boolean(suspend) : existing.status !== 'suspended';
    const newStatus = isSuspending ? 'suspended' : 'active';
    const now = new Date().toISOString();

    subs[emailClean] = {
      ...existing,
      status: newStatus,
      suspendedAt: isSuspending ? now : undefined,
      suspensionReason: isSuspending ? (reason || 'بقرار إداري مؤقت') : undefined,
      adminNotes: isSuspending
        ? `حساب موقوف مؤقتاً: ${reason || 'بقرار الإدارة'}`
        : `تم رفع الإيقاف وإعادة تنشيط الحساب`
    };

    saveSubscriptionsData(subs);
    saveAuditLogData({
      actionType: isSuspending ? 'suspend' : 'unsuspend',
      adminEmail: currentCallerEmail || 'djazild@gmail.com',
      targetTeacherEmail: emailClean,
      details: reason || (isSuspending ? 'إيقاف مؤقت للحساب' : 'رفع الإيقاف وتنشيط الحساب'),
      result: 'success'
    });

    console.log(`[API] Suspension updated for ${emailClean}: ${newStatus}`);
    res.json({
      success: true,
      message: isSuspending
        ? `تم إيقاف حساب الأستاذ (${emailClean}) مؤقتاً مع الحفاظ على كافة سجلاته وهويته.`
        : `تم رفع الإيقاف عن حساب الأستاذ (${emailClean}) بنجاح.`,
      subscription: subs[emailClean]
    });
  });

  // API Route: 3. الحذف النهائي الصريح (Permanent Delete - without blacklisting Gmail)
  app.post('/api/subscriptions/permanent-delete', (req, res) => {
    const { currentCallerEmail, targetTeacherEmail, confirmation } = req.body;
    if (!targetTeacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني للأستاذ مطلوب' });
    }

    const emailClean = targetTeacherEmail.trim().toLowerCase();
    if (emailClean === 'djazild@gmail.com') {
      return res.status(403).json({ success: false, message: 'لا يمكن حذف حساب المشرف العام djazild@gmail.com' });
    }

    if (confirmation !== 'DELETE_CONFIRMED') {
      return res.status(400).json({ success: false, message: 'يرجى تأكيد الحذف الصريح' });
    }

    // Never blacklist the Gmail address!
    removeDeletedEmailData(emailClean);

    const subs = getSubscriptionsData();
    if (subs[emailClean]) {
      delete subs[emailClean];
      saveSubscriptionsData(subs);
    }

    saveAuditLogData({
      actionType: 'permanent_delete',
      adminEmail: currentCallerEmail || 'djazild@gmail.com',
      targetTeacherEmail: emailClean,
      details: 'حذف نهائي لسجل الحساب دون حظر البريد مستقبلاً',
      result: 'success'
    });

    console.log(`[API] Account permanently deleted (NOT blacklisted): ${emailClean}`);
    return res.json({
      success: true,
      message: `تم حذف حساب الأستاذ (${emailClean}) نهائياً من قاعدة البيانات، دون حظر بريده الإلكتروني.`
    });
  });

  // Legacy delete fallback - maps safely to non-blacklisting removal
  app.post('/api/subscriptions/delete', (req, res) => {
    const { currentCallerEmail, targetTeacherEmail } = req.body;
    if (!targetTeacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني للأستاذ مطلوب' });
    }

    const emailClean = targetTeacherEmail.trim().toLowerCase();
    if (emailClean === 'djazild@gmail.com') {
      return res.status(403).json({ success: false, message: 'لا يمكن حذف حساب المشرف العام djazild@gmail.com' });
    }

    removeDeletedEmailData(emailClean);

    const subs = getSubscriptionsData();
    if (subs[emailClean]) {
      delete subs[emailClean];
      saveSubscriptionsData(subs);
    }

    saveAuditLogData({
      actionType: 'permanent_delete',
      adminEmail: currentCallerEmail || 'djazild@gmail.com',
      targetTeacherEmail: emailClean,
      details: 'حذف الحساب عبر المسار القديم دون حظر البريد',
      result: 'success'
    });

    return res.json({
      success: true,
      message: `تم حذف الحساب بنجاح دون أي حظر لبريد Gmail.`
    });
  });

  // API Route: Get & Post Audit Logs
  app.get('/api/subscriptions/audit-logs', (_req, res) => {
    const logs = getAuditLogsData();
    res.json({ success: true, logs });
  });

  app.post('/api/subscriptions/audit-logs', (req, res) => {
    const log = req.body;
    if (log && log.actionType && log.targetTeacherEmail) {
      saveAuditLogData(log);
      res.json({ success: true, message: 'تم حفظ سجل التدقيق بنجاح' });
    } else {
      res.status(400).json({ success: false, message: 'بيانات السجل غير مكتملة' });
    }
  });

  // Persistent storage directory for teacher data (classes, students, marks, curriculum)
  const TEACHERS_DATA_DIR = path.join(DATA_DIR, 'teachers');
  if (!fs.existsSync(TEACHERS_DATA_DIR)) {
    fs.mkdirSync(TEACHERS_DATA_DIR, { recursive: true });
  }

  // API Route: Sync teacher data to server
  app.post('/api/teacher/sync', (req, res) => {
    const { teacherEmail, data } = req.body;
    if (!teacherEmail || !data) {
      return res.status(400).json({ success: false, message: 'البريد وبيانات الأستاذ مطلوبة' });
    }
    const cleanKey = teacherEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filePath = path.join(TEACHERS_DATA_DIR, `${cleanKey}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify({ ...data, lastSyncedAt: new Date().toISOString() }, null, 2), 'utf-8');
      res.json({ success: true, message: 'تم حفظ ومزامنة بيانات الأستاذ على السيرفر بنجاح' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'فشل حفظ بيانات الأستاذ: ' + err?.message });
    }
  });

  // API Route: Load teacher data from server
  app.get('/api/teacher/load/:email', (req, res) => {
    const email = req.params.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'البريد مطلوب' });
    }
    const cleanKey = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filePath = path.join(TEACHERS_DATA_DIR, `${cleanKey}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return res.json({ success: true, data: JSON.parse(content) });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: 'تعذر قراءة بيانات الأستاذ' });
      }
    }
    res.json({ success: true, data: null });
  });

  // API Route: Extend subscription
  app.post('/api/subscriptions/extend', (req, res) => {
    const { targetTeacherEmail, daysToAdd, reason } = req.body;
    if (!targetTeacherEmail || !daysToAdd) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني وعدد الأيام مطلوبة' });
    }

    const emailClean = targetTeacherEmail.trim().toLowerCase();
    const subs = getSubscriptionsData();
    const existing = subs[emailClean];

    if (!existing) {
      return res.status(404).json({ success: false, message: 'الحساب غير موجود' });
    }

    const days = parseInt(daysToAdd, 10);
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ success: false, message: 'عدد الأيام يجب أن يكون رقماً موجباً' });
    }

    const now = new Date();
    let currentExpiry = existing.expiresAt ? new Date(existing.expiresAt) : now;
    if (currentExpiry.getTime() < now.getTime()) {
      currentExpiry = now; // start from today if expired
    }

    const newExpiry = new Date(currentExpiry.getTime() + days * 86400000);

    subs[emailClean] = {
      ...existing,
      status: 'active',
      expiresAt: newExpiry.toISOString(),
      adminNotes: `تم تمديد الاشتراك بـ ${days} يوم: ${reason || 'تمديد بقرار المشرف'}`
    };

    saveSubscriptionsData(subs);
    console.log(`[API] Subscription extended for ${emailClean} by ${days} days until ${newExpiry.toISOString()}`);
    res.json({
      success: true,
      message: `تم تمديد اشتراك الأستاذ ${emailClean} بـ ${days} يوم بنجاح (حتى ${newExpiry.toLocaleDateString('ar-DZ')})`,
      subscription: subs[emailClean]
    });
  });

  // API Route: Generate test request for Admin testing
  app.post('/api/subscriptions/generate-test-request', (req, res) => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const testEmail = `prof.test${randomId}@gmail.com`;
    const subs = getSubscriptionsData();

    const testSub = {
      teacherEmail: testEmail,
      teacherName: `أ. تجريبي (${randomId})`,
      phoneNumber: '0655' + randomId,
      planId: '6months',
      status: 'pending',
      amountDZD: 3000,
      requestedAt: new Date().toISOString(),
      expiresAt: null,
      isLifetime: false,
      paymentProof: {
        transactionRef: `BM-2026-${randomId}`,
        senderName: `أ. تجريبي (${randomId})`,
        phoneNumber: '0655' + randomId,
        ripNumber: '007 99999 0023456789 25',
        amount: 3000,
        paidAt: new Date().toISOString(),
        receiptNote: 'طلب اشتراك جديد عبر Google وبريدي موب لاختبار اللوحة',
        sentViaWhatsApp: true
      }
    };

    subs[testEmail] = testSub;
    saveSubscriptionsData(subs);
    console.log(`[API] Test subscription generated: ${testEmail}`);
    res.json({ success: true, subscription: testSub });
  });

  // API Route: Activate or update subscription (PUT)
  app.put('/api/subscriptions', (req, res) => {
    const { teacherEmail, status, planId, expiryDate, notes, activatedAt } = req.body;
    if (!teacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني للطلب مطلوب' });
    }

    const emailClean = teacherEmail.trim().toLowerCase();
    const subs = getSubscriptionsData();

    if (!subs[emailClean]) {
      subs[emailClean] = {
        teacherEmail: emailClean,
        teacherName: req.body.teacherName || emailClean,
        status: status || 'active',
        planId: planId || 'annual_pro',
        requestedAt: new Date().toISOString()
      };
    }

    subs[emailClean] = {
      ...subs[emailClean],
      status: status || subs[emailClean].status || 'active',
      planId: planId || subs[emailClean].planId || 'annual_pro',
      expiryDate: expiryDate || subs[emailClean].expiryDate,
      notes: notes || subs[emailClean].notes,
      activatedAt: activatedAt || subs[emailClean].activatedAt || new Date().toISOString()
    };

    saveSubscriptionsData(subs);
    res.json({ success: true, message: 'تم تحديث حالة الاشتراك بنجاح', subscription: subs[emailClean] });
  });

  // API Route: Revoke/delete subscription (DELETE)
  app.delete('/api/subscriptions', (req, res) => {
    const { teacherEmail } = req.query;
    if (!teacherEmail || typeof teacherEmail !== 'string') {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }

    const emailClean = teacherEmail.trim().toLowerCase();
    const subs = getSubscriptionsData();

    if (subs[emailClean]) {
      subs[emailClean].status = 'expired';
      saveSubscriptionsData(subs);
    }

    res.json({ success: true, message: 'تم إلغاء الاشتراك بنجاح' });
  });

  // API Route: OCR Extract students from list image (supports up to 100+ students)
  app.post('/api/ocr/extract-students', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, message: 'صورة ورقة القائمة مطلوبة' });
      }

      // Initialize Gemini SDK with User-Agent telemetry and injected API Key
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Robustly strip any data url prefix (e.g. data:image/jpeg;base64, data:image/png;base64,)
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
      const resolvedMime = mimeType && mimeType.includes('/') ? mimeType : 'image/jpeg';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: resolvedMime
            }
          },
          {
            text: `أنت خبير قراءة واستخراج الوثائق المدرسية الرسمية لوزارة التربية الوطنية الجزائرية (قوائم تلاميذ الأقسام، كشوف النقاط، محاضر التنقيط).
المطلوب منك: قراءة الصورة المرفوعة واستخراج جميع أسماء وتلاميذ القائمة كما هي مكتوبة في الورقة تماماً وبكل أمانة ودقة.

قواعد صارمة جداً لا تحتمل أي خطأ:
1. استخرج حصراً الأسماء والألقاب الموجودة فعلياً في وثيقة القائمة المرفوعة.
2. ممنوع منعاً باتاً توليد أو تأليف أو تخمين أي اسم وهمي من عندك.
3. إذا كانت القائمة تحتوي على 5 أو 30 أو 60 أو 100 تلميذ، استخرج كل تلميذ بالترتيب الرقمي للقائمة.
4. افصل اللقب (Nom/lastName) عن الاسم (Prénom/firstName). في الوثائق الجزائرية يكون اللقب أولاً ثم الاسم. إذا كان الاسم مركباً مثل "محمد الأمين" أو "فاطمة الزهراء"، اجعل اللقب في lastName والاسم كاملاً في firstName.
5. إذا كانت الصورة رديئة تماماً أو بيضاء أو لا تحتوي على قائمة تلاميذ، أعد مصفوفة فارغة [] ولا تخترع شيئاً.`
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                lastName: {
                  type: Type.STRING,
                  description: 'لقب التلميذ كما هو مكتوب في الوثيقة'
                },
                firstName: {
                  type: Type.STRING,
                  description: 'اسم التلميذ كما هو مكتوب في الوثيقة'
                }
              },
              required: ['lastName', 'firstName']
            }
          }
        }
      });

      const text = response.text || '[]';
      let parsedStudents: any[] = [];
      try {
        parsedStudents = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedStudents = JSON.parse(jsonMatch[0]);
        }
      }

      if (!Array.isArray(parsedStudents) || parsedStudents.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'لم يتم العثور على أي أسماء تلاميذ واضحة في الصورة المرفوعة. يرجى التأكد من وضوح تصوير ورقة القائمة وإعادة المحاولة.'
        });
      }

      // Filter and sanitize actual extracted students
      const validStudents = parsedStudents
        .filter(s => s && (s.lastName || s.firstName))
        .map(s => ({
          lastName: (s.lastName || '').trim() || 'غير محدد',
          firstName: (s.firstName || '').trim() || 'تلميذ'
        }));

      if (validStudents.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'لم يتعرف النظام على أسماء مقروءة في الصورة. يرجى التقاط صورة واضحة للائحة الأسماء.'
        });
      }

      console.log(`[OCR] Extracted ${validStudents.length} real students from image.`);
      res.json({ success: true, students: validStudents });
    } catch (err: any) {
      console.error('OCR Extraction Error:', err);
      res.status(500).json({
        success: false,
        message: `تعذر استخراج الأسماء من الصورة: ${err.message || 'خطأ في معالجة الذكاء الاصطناعي'}. يرجى التأكد من وضوح الورقة والمحاولة مجدداً.`
      });
    }
  });

  // API Route: Seed default sample subscriptions
  app.post('/api/subscriptions/seed', (req, res) => {
    saveSubscriptionsData(DEFAULT_SUBSCRIPTIONS);
    res.json({ success: true, subscriptions: DEFAULT_SUBSCRIPTIONS });
  });

  // Mount Vite development server middleware or serve static dist
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Smart Notebook Applet running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start full-stack server:', err);
  process.exit(1);
});
