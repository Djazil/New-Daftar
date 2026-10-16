import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const DELETED_FILE = path.join(DATA_DIR, 'deleted_subscriptions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Manage deleted subscriptions blacklist
function getDeletedEmailsData(): string[] {
  try {
    if (!fs.existsSync(DELETED_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DELETED_FILE, 'utf-8');
    const list: string[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Error reading deleted subscriptions file:', err);
    return [];
  }
}

function saveDeletedEmailData(email: string): void {
  const list = getDeletedEmailsData();
  const clean = email.trim().toLowerCase();
  if (clean && !list.includes(clean)) {
    list.push(clean);
    try {
      fs.writeFileSync(DELETED_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving deleted email:', err);
    }
  }
}

function removeDeletedEmailData(email: string): void {
  const list = getDeletedEmailsData();
  const clean = email.trim().toLowerCase();
  const filtered = list.filter(e => e !== clean);
  try {
    fs.writeFileSync(DELETED_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error removing deleted email:', err);
  }
}

// Default initial subscriptions
const DEFAULT_SUBSCRIPTIONS = {
  'teacher@gmail.com': {
    teacherEmail: 'teacher@gmail.com',
    teacherName: 'أ. محمد العيد',
    wilaya: '16 - الجزائر',
    commune: 'الجزائر الوسطى',
    phone: '0555123456',
    schoolName: 'ثانوية العقيد لطفي',
    subject: 'علوم فزيائية',
    planId: 'annual_pro',
    status: 'active',
    startDate: '2025-09-01T08:00:00.000Z',
    expiryDate: '2026-08-31T23:59:59.000Z',
    paymentMethod: 'ccp',
    receiptNumber: 'CCP-2025-99881',
    amountPaid: 3500,
    requestedAt: '2025-08-30T10:00:00.000Z',
    activatedAt: '2025-09-01T08:00:00.000Z',
    notes: 'تفعيل سنوي للموسم الدراسي 2025-2026'
  },
  'prof.karim.dz@gmail.com': {
    teacherEmail: 'prof.karim.dz@gmail.com',
    teacherName: 'أ. كريم المنصوري',
    wilaya: '31 - وهران',
    commune: 'وهران',
    phone: '0661223344',
    schoolName: 'ثانوية حاسيبة بن بوعلي',
    subject: 'العلوم الفيزيائية والتكنولوجيا',
    planId: 'annual_pro',
    status: 'pending',
    paymentMethod: 'baridimob',
    receiptNumber: 'BM-2026-44120',
    amountPaid: 3500,
    requestedAt: new Date().toISOString(),
    notes: 'طلب جديد في انتظار المراجعة والتأكيد من المشرف'
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
  app.use(express.json());

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
    console.log(`[API] Subscription activated for: ${emailClean}`);
    res.json({ success: true, message: `تم تفعيل حساب الأستاذ ${emailClean} بنجاح`, subscription: subs[emailClean] });
  });

  // API Route: Expire / Revoke subscription
  app.post('/api/subscriptions/expire', (req, res) => {
    const { targetTeacherEmail, reason } = req.body;
    if (!targetTeacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }

    const emailClean = targetTeacherEmail.trim().toLowerCase();
    const subs = getSubscriptionsData();

    if (subs[emailClean]) {
      subs[emailClean] = {
        ...subs[emailClean],
        status: 'expired',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        adminNotes: `تم توقيف الاشتراك: ${reason || 'بواسطة المشرف'}`
      };
      saveSubscriptionsData(subs);
    }

    res.json({ success: true, message: 'تم إيقاف الاشتراك بنجاح', subscription: subs[emailClean] });
  });

  // API Route: Delete subscription/account permanently across all states
  app.post('/api/subscriptions/delete', (req, res) => {
    const { targetTeacherEmail } = req.body;
    if (!targetTeacherEmail) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني للأستاذ مطلوب' });
    }

    const emailClean = targetTeacherEmail.trim().toLowerCase();
    if (emailClean === 'djazild@gmail.com') {
      return res.status(403).json({ success: false, message: 'لا يمكن حذف حساب المشرف العام djazild@gmail.com' });
    }

    // Save to deleted emails blacklist permanently
    saveDeletedEmailData(emailClean);

    const subs = getSubscriptionsData();
    if (subs[emailClean]) {
      delete subs[emailClean];
      saveSubscriptionsData(subs);
    }

    console.log(`[API] Account deleted permanently and blacklisted: ${emailClean}`);
    return res.json({ success: true, message: `تم إلغاء الاشتراك وحذف حساب الأستاذ ${emailClean} نهائياً من السيرفر. يجب على الأستاذ إعادة التسجيل وطلب التفعيل من جديد.` });
  });

  // API Route: Suspend / Disable account temporarily
  app.post('/api/subscriptions/suspend', (req, res) => {
    const { targetTeacherEmail, reason, suspend } = req.body;
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

    subs[emailClean] = {
      ...existing,
      status: newStatus,
      adminNotes: isSuspending
        ? `حساب معطل مؤقتاً: ${reason || 'بقرار الإدارة'}`
        : `تم رفع التعطيل وإعادة التنشيط من لوحة المشرف`
    };

    saveSubscriptionsData(subs);
    console.log(`[API] Subscription suspension toggled for ${emailClean}: ${newStatus}`);
    res.json({
      success: true,
      message: isSuspending ? `تم تعطيل حساب الأستاذ ${emailClean} مؤقتاً` : `تم إلغاء تعطيل حساب الأستاذ ${emailClean} وإعادة تفعيله`,
      subscription: subs[emailClean]
    });
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
