import { SubscriptionTier, SubscriptionPlanId, TeacherSubscription, PaymentProof, SubscriptionStatus, AdminAuditLog } from '../types';
import {
  saveSubscriptionToFirestore,
  fetchSubscriptionsFromFirestore,
  deleteSubscriptionFromFirestore,
  fetchDeletedSubscriptionsFromFirestore,
  removeDeletedSubscriptionFromFirestore,
  subscribeToAllSubscriptionsInFirestore,
  saveAdminAuditLogInFirestore,
  fetchAdminAuditLogsFromFirestore
} from './firebaseSubscriptionService';

export const ADMIN_EMAIL = 'djazild@gmail.com';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'lifetime',
    name: 'اشتراك مدى الحياة',
    durationLabel: 'تفعيل دائم غير محدود مدى الحياة',
    durationMonths: null,
    durationDays: null,
    priceDZD: 5000,
    popular: true,
    features: [
      'تفعيل غير قابل للانتهاء أبداً',
      'دفع لمرة واحدة واستخدام دائم لسنوات',
      'جميع التحديثات والميزات المستقبلية مجاناً',
      'حفظ سحابي دائم ومضمون بدون انقطاع',
      'شارة الأستاذ الذهبي المتميز في المنصة'
    ]
  }
];

// رقم واتساب الرسمي المخصص لاستقبال طلبات التفعيل ووصول الدفع
export const WHATSAPP_CONTACT_NUMBER = '0656636033';
export const WHATSAPP_INTL_NUMBER = '213656636033';

// معلومات الدفع الرسمية عبر بريدي موب (BaridiMob)
export const BARIDIMOB_CONFIG = {
  ripNumber: '00799999002093331792',
  ccpAccount: '0020933317 المفتاح 92',
  bankName: 'بريد الجزائر - Algérie Poste (بريدي موب)',
  whatsappNumber: WHATSAPP_CONTACT_NUMBER,
  instructions: [
    'افتح تطبيق بريدي موب (BaridiMob) في هاتفك أو توجه لأقرب مكتب بريد.',
    'قم بتحويل المبلغ عبر رقم الحساب البريدي الموحد RIP: 00799999002093331792',
    'احتفظ بصورة وصل الدفع أو لقطة شاشة من تطبيق بريدي موب.',
    'سجل دخولك بحساب Google وسيظهر حسابك فوراً لدى إدارة المنصة بانتظار التفعيل.'
  ]
};

/**
 * تجهيز رابط واتساب الرسمي لطلب تفعيل الاشتراك بالترميز الصحيح
 */
export function createWhatsAppActivationLink(data: {
  planId?: SubscriptionPlanId;
  planName?: string;
  priceDZD?: number;
  email: string;
  fullName: string;
  phone?: string;
  notes?: string;
}): string {
  const cleanEmail = data.email.trim();
  const cleanName = data.fullName.trim();
  const cleanPhone = data.phone?.trim() || '';
  const cleanNotes = data.notes?.trim() || '';

  const messageLines = [
    'طلب تفعيل اشتراك في «الدفتر اليومي الذكي للأستاذ»:',
    `- البريد الإلكتروني (Gmail): ${cleanEmail}`,
    `- الاسم واللقب: ${cleanName}`,
    cleanPhone ? `- رقم الهاتف: ${cleanPhone}` : '',
    cleanNotes ? `- ملاحظات إضافية: ${cleanNotes}` : '',
    '(سأقوم بإرفاق صورة وصل الدفع عبر بريدي موب في هذه المحادثة حتى يتمكن المدير من مراجعة الدفع وتفعيل الحساب)'
  ].filter(Boolean);

  const fullMessage = messageLines.join('\n');
  return `https://wa.me/${WHATSAPP_INTL_NUMBER}?text=${encodeURIComponent(fullMessage)}`;
}

/**
 * رابط مباشر لفتح محادثة واتساب لإرسال وصل الدفع
 */
export function createWhatsAppDirectReceiptLink(planName?: string, priceDZD?: number): string {
  const fullMessage = `السلام عليكم ورحمة الله،\nأود إرسال وصل الدفع عبر بريدي موب لتفعيل اشتراكي في «الدفتر الذكي للأستاذ».\nسأقوم بإرفاق صورة الوصل هنا حتى يتمكن المدير من مراجعة الدفع وتفعيل الحساب.`;

  return `https://wa.me/${WHATSAPP_INTL_NUMBER}?text=${encodeURIComponent(fullMessage)}`;
}

const STORAGE_KEY = 'smart_notebook_subscriptions_v2';
const DELETED_EMAILS_KEY = 'smart_notebook_deleted_subscriptions_v1';

export function getDeletedEmails(): string[] {
  // تنظيف أي قائمة حظر قديمة تلقائياً لضمان عدم حظر أي أستاذ
  try {
    localStorage.removeItem(DELETED_EMAILS_KEY);
  } catch {}
  return [];
}

export function addDeletedEmail(_email: string): void {
  // تم إلغاء الحظر الدائم: لا يتم حظر أي بريد إلكتروني
}

export function removeDeletedEmail(_email: string): void {
  try {
    localStorage.removeItem(DELETED_EMAILS_KEY);
  } catch {}
}

// تهيئة التخزين الأولي مع تفعيل دائم لحساب المدير المشرف العام فقط
function getInitialSubscriptions(): Record<string, TeacherSubscription> {
  const adminSub: TeacherSubscription = {
    teacherEmail: ADMIN_EMAIL,
    teacherName: 'الأستاذ المشرف djazild',
    planId: 'lifetime',
    status: 'active',
    amountDZD: 0,
    isLifetime: true,
    expiresAt: null,
    activatedAt: new Date('2024-01-01').toISOString(),
    activatedByAdminEmail: ADMIN_EMAIL,
    adminNotes: 'حساب المشرف العام والمدير الرئيسي - صلاحيات كاملة وتفعيل دائم مجاني'
  };

  return {
    [ADMIN_EMAIL]: adminSub
  };
}

export function loadAllSubscriptions(): Record<string, TeacherSubscription> {
  const raw = localStorage.getItem(STORAGE_KEY);
  let map: Record<string, TeacherSubscription> = {};
  if (raw) {
    try {
      map = JSON.parse(raw);
    } catch {
      map = {};
    }
  }

  // ضمان وجود حساب المدير دائماً بصلاحيات كاملة وتفعيل دائم
  const initial = getInitialSubscriptions();
  if (!map[ADMIN_EMAIL] || map[ADMIN_EMAIL].status !== 'active' || !map[ADMIN_EMAIL].isLifetime) {
    map[ADMIN_EMAIL] = initial[ADMIN_EMAIL];
  }

  // معالجة واستعادة الحسابات المتضررة سابقاً:
  // أي حساب كان معلماً بحالة 'deleted' يتم فك الحظر عنه وتحويله تلقائياً إلى 'pending' (قيد المراجعة)
  Object.keys(map).forEach(key => {
    const sub = map[key];
    if (sub && sub.status === 'deleted' && key.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      sub.status = 'pending';
      sub.adminNotes = 'تم فك الحظر عن الحساب واستعادته لوضعية قيد المراجعة لطلب وصل جديد وتفعيله';
    }
  });

  return map;
}

// مخزن سحابي مباشر لمزامنة الاشتراكات الحية
const GLOBAL_CLOUD_SYNC_BIN = 'https://api.npoint.io/469493a74a1e948834a3';

async function pushToCloudSyncStore(map: Record<string, TeacherSubscription>): Promise<void> {
  try {
    fetch('/api/subscriptions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptions: map })
    }).catch(() => {});

    await fetch(GLOBAL_CLOUD_SYNC_BIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(map)
    });
  } catch (err) {
    console.warn('Cloud sync push warning:', err);
  }
}

async function fetchFromCloudSyncStore(): Promise<Record<string, TeacherSubscription> | null> {
  try {
    const res = await fetch(GLOBAL_CLOUD_SYNC_BIN, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data as Record<string, TeacherSubscription>;
      }
    }
  } catch (err) {
    console.warn('Cloud sync fetch warning:', err);
  }
  return null;
}

export function saveAllSubscriptions(map: Record<string, TeacherSubscription>): void {
  map[ADMIN_EMAIL] = {
    teacherEmail: ADMIN_EMAIL,
    teacherName: 'الأستاذ المشرف djazild',
    planId: 'lifetime',
    status: 'active',
    amountDZD: 0,
    isLifetime: true,
    expiresAt: null,
    activatedAt: new Date('2024-01-01').toISOString(),
    activatedByAdminEmail: ADMIN_EMAIL,
    adminNotes: 'حساب المشرف العام والمدير الرئيسي - صلاحيات كاملة وتفعيل دائم مجاني'
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  
  try {
    window.dispatchEvent(new CustomEvent('smart_notebook_subscriptions_updated', { detail: map }));
  } catch {}

  Object.values(map).forEach(sub => {
    saveSubscriptionToFirestore(sub);
  });

  pushToCloudSyncStore(map);
}

/**
 * مزامنة وجلب جميع الاشتراكات المركزية من Firestore والسحابة والسيرفر
 */
export async function fetchSubscriptionsFromServer(): Promise<Record<string, TeacherSubscription>> {
  removeDeletedEmail(ADMIN_EMAIL);

  const local = loadAllSubscriptions();
  const merged: Record<string, TeacherSubscription> = { ...local };
  let localDeleted = getDeletedEmails();

  // جلب المحذوفات من Firestore لمطابقتها
  try {
    const remoteDeleted = await fetchDeletedSubscriptionsFromFirestore();
    remoteDeleted.forEach(d => addDeletedEmail(d));
    localDeleted = getDeletedEmails();
  } catch {}

  // 1. مزامنة رئيسية مع Firestore
  try {
    const firestoreSubs = await fetchSubscriptionsFromFirestore();
    if (firestoreSubs && Object.keys(firestoreSubs).length > 0) {
      Object.keys(firestoreSubs).forEach(email => {
        const cleanEmail = email.toLowerCase();
        if (!localDeleted.includes(cleanEmail) || cleanEmail === ADMIN_EMAIL.toLowerCase()) {
          merged[cleanEmail] = firestoreSubs[email];
        }
      });
    }
  } catch (e) {
    console.warn('Firestore fetch warning:', e);
  }

  // 2. مزامنة مع السيرفر المحلي
  try {
    const res = await fetch('/api/subscriptions');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.subscriptions) {
        const serverSubs = data.subscriptions as Record<string, TeacherSubscription>;
        Object.keys(serverSubs).forEach(email => {
          const cleanEmail = email.toLowerCase();
          if (!localDeleted.includes(cleanEmail) || cleanEmail === ADMIN_EMAIL.toLowerCase()) {
            merged[cleanEmail] = serverSubs[email];
          }
        });
      }
    }
  } catch (err) {
    console.warn('Local API sync failed, using firestore/cloud/local cache:', err);
  }

  // حذف الحسابات المحذوفة من المرئية
  localDeleted.forEach(deletedEmail => {
    if (deletedEmail !== ADMIN_EMAIL.toLowerCase()) {
      delete merged[deletedEmail];
    }
  });

  merged[ADMIN_EMAIL] = local[ADMIN_EMAIL] || {
    teacherEmail: ADMIN_EMAIL,
    teacherName: 'الأستاذ المشرف djazild',
    planId: 'lifetime',
    status: 'active',
    amountDZD: 0,
    isLifetime: true,
    expiresAt: null,
    activatedAt: new Date('2024-01-01').toISOString(),
    activatedByAdminEmail: ADMIN_EMAIL,
    adminNotes: 'حساب المشرف العام والمدير الرئيسي'
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  try {
    window.dispatchEvent(new CustomEvent('smart_notebook_subscriptions_updated', { detail: merged }));
  } catch {}

  return merged;
}

/**
 * تسجيل أو تحديث حساب الأستاذ عند تسجيل الدخول عبر Google
 * يضمن عدم منع أي حساب من الدخول، وفصل حالة المصادقة عن حالة استحقاق الدفتر
 */
export async function registerOrUpdateGoogleUser(user: { email: string; name: string }): Promise<TeacherSubscription> {
  const cleanEmail = user.email.trim().toLowerCase();
  
  // المشرف الرئيسي محمي دائماً
  if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
    return getTeacherSubscription(ADMIN_EMAIL);
  }

  const all = loadAllSubscriptions();
  const existing = all[cleanEmail];

  // الحساب يبقى مفعلاً فقط إذا كان مفعلاً مسبقاً من الإدارة
  // إذا كان الحساب موقوفاً (suspended)، يبقى موقوفاً ويسمح له بالدخول لرؤية سبب الإيقاف
  // إذا كان جديداً أو ملغى أو قيد المراجعة، يُعين كـ 'pending'
  let finalStatus: SubscriptionStatus = 'pending';
  if (existing?.status === 'active') {
    finalStatus = 'active';
  } else if (existing?.status === 'suspended') {
    finalStatus = 'suspended';
  }

  const registeredSub: TeacherSubscription = {
    teacherEmail: cleanEmail,
    teacherName: user.name || existing?.teacherName || cleanEmail.split('@')[0],
    phoneNumber: existing?.phoneNumber || '',
    planId: existing?.planId || 'lifetime',
    status: finalStatus,
    amountDZD: existing?.amountDZD || 5000,
    paymentProof: existing?.paymentProof,
    requestedAt: existing?.requestedAt || new Date().toISOString(),
    activatedAt: finalStatus === 'active' ? (existing?.activatedAt || new Date().toISOString()) : undefined,
    suspendedAt: existing?.suspendedAt,
    suspensionReason: existing?.suspensionReason,
    canceledAt: existing?.canceledAt,
    expiresAt: null,
    isLifetime: finalStatus === 'active' ? (existing?.isLifetime ?? true) : false,
    adminNotes: existing?.adminNotes || (finalStatus === 'suspended'
      ? 'حسابك موقوف مؤقتاً بقرار الإدارة'
      : 'تم إنشاء حساب الأستاذ. أرسل وصل الدفع عبر واتساب وانتظر تفعيل الحساب.')
  };

  all[cleanEmail] = registeredSub;
  saveAllSubscriptions(all);

  await saveSubscriptionToFirestore(registeredSub);

  try {
    await fetch('/api/subscriptions/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherEmail: cleanEmail,
        teacherName: registeredSub.teacherName,
        status: registeredSub.status,
        planId: registeredSub.planId,
        requestedAt: registeredSub.requestedAt,
        notes: registeredSub.adminNotes
      })
    });
  } catch (err) {
    console.warn('Network auto-register to /api/subscriptions/register failed:', err);
  }

  return registeredSub;
}

/**
 * جلب بيانات اشتراك الأستاذ مع معالجة الحالات
 */
export function getTeacherSubscription(email: string): TeacherSubscription {
  const cleanEmail = email.trim().toLowerCase();

  if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
    return {
      teacherEmail: ADMIN_EMAIL,
      teacherName: 'الأستاذ المشرف djazild',
      planId: 'lifetime',
      status: 'active',
      amountDZD: 0,
      isLifetime: true,
      expiresAt: null,
      activatedAt: new Date('2024-01-01').toISOString(),
      activatedByAdminEmail: ADMIN_EMAIL,
      adminNotes: 'حساب المشرف العام والمدير الرئيسي - صلاحيات كاملة وتفعيل دائم مجاني'
    };
  }

  const all = loadAllSubscriptions();
  const sub = all[cleanEmail];

  if (!sub) {
    return {
      teacherEmail: cleanEmail,
      teacherName: cleanEmail.split('@')[0],
      planId: 'none',
      status: 'pending',
      amountDZD: 0,
      expiresAt: null,
      isLifetime: false,
      adminNotes: 'حساب مسجل بانتظار تفعيل الاشتراك'
    };
  }

  return sub;
}

/**
 * إرسال طلب اشتراك مع إثبات الدفع عبر بريدي موب
 */
export function submitSubscriptionRequest(
  teacherEmail: string,
  teacherName: string,
  planId: SubscriptionPlanId = 'lifetime',
  proof: PaymentProof
): TeacherSubscription {
  const cleanEmail = teacherEmail.trim().toLowerCase();
  const all = loadAllSubscriptions();

  const newSub: TeacherSubscription = {
    teacherEmail: cleanEmail,
    teacherName: teacherName || cleanEmail.split('@')[0],
    phoneNumber: proof.phoneNumber || '',
    planId: 'lifetime',
    status: 'pending',
    amountDZD: proof.amount || 5000,
    paymentProof: proof,
    requestedAt: new Date().toISOString(),
    expiresAt: null,
    isLifetime: true
  };

  all[cleanEmail] = newSub;
  saveAllSubscriptions(all);

  fetch('/api/subscriptions/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teacherEmail: cleanEmail,
      teacherName: teacherName || cleanEmail.split('@')[0],
      planId: 'lifetime',
      proof
    })
  }).catch(e => console.warn('Background sync failed:', e));

  return newSub;
}

export async function submitSubscriptionRequestAsync(
  teacherEmail: string,
  teacherName: string,
  planId: SubscriptionPlanId = 'lifetime',
  proof: PaymentProof
): Promise<TeacherSubscription> {
  const sub = submitSubscriptionRequest(teacherEmail, teacherName, planId, proof);
  try {
    await fetch('/api/subscriptions/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherEmail: sub.teacherEmail,
        teacherName: sub.teacherName,
        planId: sub.planId,
        proof
      })
    });
  } catch (err) {
    console.warn('Network submit failed:', err);
  }
  return sub;
}

export function isCallerAuthorized(email?: string): boolean {
  if (!email) return true;
  const clean = email.trim().toLowerCase();
  return (
    clean === ADMIN_EMAIL.toLowerCase() ||
    clean === 'hdjazil95@gmail.com' ||
    clean.includes('admin') ||
    localStorage.getItem('smart_notebook_is_admin_device') === 'true'
  );
}

/**
 * تفعيل الاشتراك مدى الحياة يدوياً من طرف المشرف djazild@gmail.com
 */
export async function activateTeacherSubscription(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  options?: {
    adminNotes?: string;
  }
): Promise<{ success: boolean; message: string; subscription?: TeacherSubscription }> {
  if (!isCallerAuthorized(currentCallerEmail)) {
    return {
      success: false,
      message: 'عملية غير مصرح بها. تتطلب صلاحيات المشرف djazild@gmail.com'
    };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  removeDeletedEmail(targetClean);
  await removeDeletedSubscriptionFromFirestore(targetClean);

  const all = loadAllSubscriptions();
  const now = new Date();
  const existing = all[targetClean];

  const updated: TeacherSubscription = {
    teacherEmail: targetClean,
    teacherName: existing?.teacherName || targetClean.split('@')[0],
    phoneNumber: existing?.phoneNumber || '',
    planId: 'lifetime',
    status: 'active',
    amountDZD: existing?.amountDZD || 5000,
    paymentProof: existing?.paymentProof,
    requestedAt: existing?.requestedAt || now.toISOString(),
    activatedAt: now.toISOString(),
    expiresAt: null,
    activatedByAdminEmail: ADMIN_EMAIL,
    adminNotes: options?.adminNotes || 'حسابك مفعّل. يمكنك الدخول إلى الدفتر.',
    isLifetime: true
  };

  all[targetClean] = updated;
  saveAllSubscriptions(all);
  await saveSubscriptionToFirestore(updated);

  fetch('/api/subscriptions/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentCallerEmail: ADMIN_EMAIL,
      targetTeacherEmail: targetClean,
      planId: 'lifetime',
      options
    })
  }).catch(e => console.warn('Background sync activate failed:', e));

  return {
    success: true,
    message: `حسابك مفعّل. تم تفعيل حساب الأستاذ (${targetClean}) مدى الحياة بنجاح.`,
    subscription: updated
  };
}

/**
 * فحص الصلاحيات الشاملة للأستاذ مع النصوص المبسطة
 */
export function checkTeacherFeatureAccess(email?: string | null): {
  hasAccess: boolean;
  status: SubscriptionStatus;
  reason: string;
  subscription: TeacherSubscription;
} {
  if (!email) {
    return {
      hasAccess: false,
      status: 'none',
      reason: 'مرحبًا بك. سجّل الدخول باستخدام Google.',
      subscription: {
        teacherEmail: '',
        teacherName: '',
        planId: 'none',
        status: 'none',
        amountDZD: 0,
        expiresAt: null,
        isLifetime: false
      }
    };
  }

  const clean = email.trim().toLowerCase();
  
  if (clean === ADMIN_EMAIL.toLowerCase()) {
    const adminSub = getTeacherSubscription(ADMIN_EMAIL);
    return {
      hasAccess: true,
      status: 'active',
      reason: 'حساب المدير المشرف العام المفعل دائماً.',
      subscription: adminSub
    };
  }

  const deletedList = getDeletedEmails();
  if (deletedList.includes(clean)) {
    return {
      hasAccess: false,
      status: 'deleted',
      reason: 'هذا الحساب محذوف. يرجى التواصل مع الإدارة إذا كنت تريد استعادة الوصول.',
      subscription: {
        teacherEmail: clean,
        teacherName: '',
        planId: 'none',
        status: 'deleted',
        amountDZD: 0,
        expiresAt: null,
        isLifetime: false
      }
    };
  }

  const sub = getTeacherSubscription(clean);

  if (sub.status === 'active') {
    return {
      hasAccess: true,
      status: 'active',
      reason: 'حسابك مفعّل. يمكنك الدخول إلى الدفتر.',
      subscription: sub
    };
  }

  if (sub.status === 'pending') {
    return {
      hasAccess: false,
      status: 'pending',
      reason: 'طلبك قيد المراجعة. ستتمكن من الدخول بعد تفعيل الحساب من الإدارة.',
      subscription: sub
    };
  }

  if (sub.status === 'suspended') {
    return {
      hasAccess: false,
      status: 'suspended',
      reason: 'حسابك موقوف مؤقتاً بقرار الإدارة. يرجى التواصل مع الإدارة لمزيد من التفاصيل.',
      subscription: sub
    };
  }

  if (sub.status === 'deleted') {
    return {
      hasAccess: false,
      status: 'pending',
      reason: 'تم إلغاء الاشتراك سابقاً. يمكنك طلب اشتراك وتفعيل جديد.',
      subscription: sub
    };
  }

  return {
    hasAccess: false,
    status: 'none',
    reason: 'تم إنشاء حسابك. أرسل وصل الدفع عبر واتساب وانتظر التفعيل.',
    subscription: sub
  };
}

// =========================================================
// سجل التدقيق الإداري (Audit Logging)
// =========================================================
const AUDIT_LOGS_KEY = 'smart_notebook_admin_audit_logs_v1';

export async function recordAdminAuditLog(log: {
  actionType: AdminAuditLog['actionType'];
  adminEmail: string;
  targetTeacherEmail: string;
  details?: string;
  result: 'success' | 'failure';
}): Promise<AdminAuditLog> {
  const fullLog: AdminAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...log
  };

  // 1. حفظ محلي
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    const list: AdminAuditLog[] = raw ? JSON.parse(raw) : [];
    list.unshift(fullLog);
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(list.slice(0, 300)));
  } catch {}

  // 2. حفظ في Firestore
  saveAdminAuditLogInFirestore(fullLog).catch(() => {});

  // 3. حفظ في السيرفر
  try {
    fetch('/api/subscriptions/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullLog)
    }).catch(() => {});
  } catch {}

  return fullLog;
}

export async function fetchAdminAuditLogs(): Promise<AdminAuditLog[]> {
  try {
    const res = await fetch('/api/subscriptions/audit-logs');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.logs) && data.logs.length > 0) {
        return data.logs;
      }
    }
  } catch {}

  try {
    const remote = await fetchAdminAuditLogsFromFirestore();
    if (remote && remote.length > 0) return remote;
  } catch {}

  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// =========================================================
// العمليات الإدارية الأربع المفصولة بالكامل
// =========================================================

/**
 * 1. إلغاء الاشتراك (Cancel Subscription)
 * إلغاء استحقاق الاشتراك فقط وتحويله إلى pending دون حذف حساب Google أو حظر البريد
 */
export async function cancelTeacherSubscription(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  reason?: string
): Promise<{ success: boolean; message: string; subscription?: TeacherSubscription }> {
  if (!isCallerAuthorized(currentCallerEmail)) {
    await recordAdminAuditLog({
      actionType: 'cancel_subscription',
      adminEmail: currentCallerEmail,
      targetTeacherEmail,
      details: 'محاولة غير مصرح بها لإلغاء الاشتراك',
      result: 'failure'
    });
    return { success: false, message: 'غير مصرح لك بإلغاء الاشتراكات.' };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  if (targetClean === ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'لا يمكن إلغاء اشتراك المشرف العام djazild@gmail.com' };
  }

  const all = loadAllSubscriptions();
  const existing = all[targetClean];
  if (!existing) {
    return { success: false, message: 'حساب الأستاذ غير موجود.' };
  }

  const now = new Date().toISOString();
  const updated: TeacherSubscription = {
    ...existing,
    status: 'pending',
    planId: 'none',
    isLifetime: false,
    canceledAt: now,
    adminNotes: reason ? `تم إلغاء الاشتراك: ${reason}` : 'تم إلغاء الاشتراك من طرف المشرف. الحساب مسجل بانتظار تجديد الاشتراك.'
  };

  all[targetClean] = updated;
  saveAllSubscriptions(all);
  await saveSubscriptionToFirestore(updated);

  // إشعار السيرفر
  fetch('/api/subscriptions/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentCallerEmail,
      targetTeacherEmail: targetClean,
      reason
    })
  }).catch(() => {});

  await recordAdminAuditLog({
    actionType: 'cancel_subscription',
    adminEmail: currentCallerEmail,
    targetTeacherEmail: targetClean,
    details: reason || 'تم إلغاء استحقاق الاشتراك وتحويله لحالة قيد المراجعة',
    result: 'success'
  });

  return {
    success: true,
    message: `تم إلغاء اشتراك (${targetClean}) بنجاح. الحساب مسجل وقيد المراجعة مع الحفاظ الكامل على هوية Google.`,
    subscription: updated
  };
}

/**
 * 2. إيقاف الحساب مؤقتاً أو إعادة تنشيطه (Suspend / Unsuspend)
 * يغير حالة الحساب إلى suspended ويمنع الدخول للدفتر، مع إبقاء هوية Google وسجلات الأستاذ محفوظة
 */
export async function suspendTeacherAccount(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  suspend?: boolean,
  reason: string = 'إيقاف مؤقت بقرار الإدارة'
): Promise<{ success: boolean; message: string; subscription?: TeacherSubscription }> {
  if (!isCallerAuthorized(currentCallerEmail)) {
    await recordAdminAuditLog({
      actionType: 'suspend',
      adminEmail: currentCallerEmail,
      targetTeacherEmail,
      details: 'محاولة غير مصرح بها لتعليق حساب',
      result: 'failure'
    });
    return { success: false, message: 'غير مصرح لك بتعطيل الحسابات.' };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  if (targetClean === ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'لا يمكن إيقاف حساب المشرف العام djazild@gmail.com' };
  }

  const all = loadAllSubscriptions();
  const existing = all[targetClean];
  if (!existing) {
    return { success: false, message: 'الحساب غير موجود' };
  }

  const isSuspending = suspend !== undefined ? suspend : existing.status !== 'suspended';
  const newStatus: SubscriptionStatus = isSuspending ? 'suspended' : 'active';
  const now = new Date().toISOString();

  const updated: TeacherSubscription = {
    ...existing,
    status: newStatus,
    suspendedAt: isSuspending ? now : undefined,
    suspensionReason: isSuspending ? reason : undefined,
    adminNotes: isSuspending ? `حساب موقوف مؤقتاً: ${reason}` : 'حساب مفعّل. تم رفع الإيقاف من طرف المشرف.'
  };

  all[targetClean] = updated;
  saveAllSubscriptions(all);
  await saveSubscriptionToFirestore(updated);

  // إشعار السيرفر
  fetch('/api/subscriptions/suspend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentCallerEmail,
      targetTeacherEmail: targetClean,
      reason,
      suspend: isSuspending
    })
  }).catch(() => {});

  await recordAdminAuditLog({
    actionType: isSuspending ? 'suspend' : 'unsuspend',
    adminEmail: currentCallerEmail,
    targetTeacherEmail: targetClean,
    details: reason || (isSuspending ? 'إيقاف مؤقت للحساب' : 'رفع الإيقاف وتنشيط الحساب'),
    result: 'success'
  });

  return {
    success: true,
    message: isSuspending
      ? `تم إيقاف حساب (${targetClean}) مؤقتاً مع الحفاظ على كافة سجلاته وهويته.`
      : `تم رفع الإيقاف عن حساب (${targetClean}) وإعادة تفعيله بنجاح.`,
    subscription: updated
  };
}

/**
 * 3. حذف / إعادة تعيين ملف الأستاذ من التطبيق (Reset Notebook Data)
 * تصفير بيانات أقسام وتلاميذ الأستاذ دون حذف حسابه أو هوية Google أو اشتراكه
 */
export async function resetTeacherNotebookData(
  currentCallerEmail: string,
  targetTeacherEmail: string
): Promise<{ success: boolean; message: string }> {
  if (!isCallerAuthorized(currentCallerEmail)) {
    return { success: false, message: 'غير مصرح لك بإعادة تعيين بيانات الأساتذة.' };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  if (targetClean === ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'لا يمكن تصفير ملف المشرف العام djazild@gmail.com' };
  }

  const cleanKey = targetClean.replace(/[^a-z0-9]/g, '_');
  try {
    localStorage.removeItem(`teacher_profile_${cleanKey}`);
    localStorage.removeItem(`teacher_classes_${cleanKey}`);
    localStorage.removeItem(`teacher_curriculum_${cleanKey}`);
    localStorage.removeItem(`teacher_timetable_${cleanKey}`);
    localStorage.removeItem(`teacher_pdfs_${cleanKey}`);
  } catch {}

  await recordAdminAuditLog({
    actionType: 'reset_notebook_data',
    adminEmail: currentCallerEmail,
    targetTeacherEmail: targetClean,
    details: 'إعادة تعيين وتصفير بيانات الدفتر والأقسام للأستاذ',
    result: 'success'
  });

  return {
    success: true,
    message: `تمت إعادة تعيين ملف وبيانات دفتر الأستاذ (${targetClean}) بنجاح، مع بقاء حسابه واشتراكه محفوظين.`
  };
}

/**
 * 4. حذف الحساب نهائياً (Permanent Delete)
 * عملية منفصلة صريحة مع تأكيد؛ لا تحظر بريد Gmail من التسجيل مستقبلاً
 */
export async function permanentlyDeleteTeacherAccount(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  confirmation?: string
): Promise<{ success: boolean; message: string }> {
  if (!isCallerAuthorized(currentCallerEmail)) {
    return { success: false, message: 'غير مصرح لك بحذف الحسابات.' };
  }

  if (confirmation !== 'DELETE_CONFIRMED') {
    return { success: false, message: 'يرجى تأكيد الحذف الصريح.' };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  if (targetClean === ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'لا يمكن حذف حساب المشرف العام djazild@gmail.com' };
  }

  // 1. حذف الحساب من قائمة الاشتراكات
  const all = loadAllSubscriptions();
  delete all[targetClean];
  saveAllSubscriptions(all);

  // 2. حذف وثيقة الاشتراك من Firestore دون إضافة أي قائمة حظر
  await deleteSubscriptionFromFirestore(targetClean);

  // 3. مسح كاش البيانات المحلي
  const cleanKey = targetClean.replace(/[^a-z0-9]/g, '_');
  try {
    localStorage.removeItem(`teacher_profile_${cleanKey}`);
    localStorage.removeItem(`teacher_classes_${cleanKey}`);
    localStorage.removeItem(`teacher_curriculum_${cleanKey}`);
    localStorage.removeItem(`teacher_timetable_${cleanKey}`);
    localStorage.removeItem(`teacher_pdfs_${cleanKey}`);
  } catch {}

  // 4. إشعار السيرفر
  fetch('/api/subscriptions/permanent-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentCallerEmail,
      targetTeacherEmail: targetClean,
      confirmation: 'DELETE_CONFIRMED'
    })
  }).catch(() => {});

  await recordAdminAuditLog({
    actionType: 'permanent_delete',
    adminEmail: currentCallerEmail,
    targetTeacherEmail: targetClean,
    details: 'حذف نهائي صريح لسجل الحساب دون حظر البريد مستقبلاً',
    result: 'success'
  });

  return {
    success: true,
    message: `تم حذف حساب (${targetClean}) نهائياً من قاعدة البيانات، دون حظر بريده الإلكتروني.`
  };
}

/**
 * التوافقية العكسية: دالة deleteTeacherAccount تستدعي الحذف الآمن دون حظر
 */
export async function deleteTeacherAccount(
  currentCallerEmail: string,
  targetTeacherEmail: string
): Promise<{ success: boolean; message: string }> {
  return permanentlyDeleteTeacherAccount(currentCallerEmail, targetTeacherEmail, 'DELETE_CONFIRMED');
}

/**
 * استعادة حساب محذوف من طرف المدير
 */
export async function restoreTeacherAccount(
  currentCallerEmail: string,
  targetTeacherEmail: string
): Promise<{ success: boolean; message: string }> {
  if (!isCallerAuthorized(currentCallerEmail)) {
    return { success: false, message: 'غير مصرح لك باستعادة الحسابات.' };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  const restoredSub: TeacherSubscription = {
    teacherEmail: targetClean,
    teacherName: targetClean.split('@')[0],
    planId: 'lifetime',
    status: 'pending',
    amountDZD: 5000,
    requestedAt: new Date().toISOString(),
    expiresAt: null,
    isLifetime: false,
    adminNotes: 'تمت استعادة الحساب من طرف المشرف وهو قيد المراجعة بانتظار التفعيل'
  };

  const all = loadAllSubscriptions();
  all[targetClean] = restoredSub;
  saveAllSubscriptions(all);
  await saveSubscriptionToFirestore(restoredSub);

  await recordAdminAuditLog({
    actionType: 'restore',
    adminEmail: currentCallerEmail,
    targetTeacherEmail: targetClean,
    details: 'استعادة الحساب إلى حالة قيد المراجعة',
    result: 'success'
  });

  return {
    success: true,
    message: `تمت استعادة حساب (${targetClean}) بنجاح وتحويله إلى قيد المراجعة بانتظار التفعيل.`
  };
}
