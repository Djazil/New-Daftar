import { SubscriptionTier, SubscriptionPlanId, TeacherSubscription, PaymentProof, SubscriptionStatus } from '../types';
import {
  saveSubscriptionToFirestore,
  fetchSubscriptionsFromFirestore,
  deleteSubscriptionFromFirestore,
  fetchDeletedSubscriptionsFromFirestore,
  removeDeletedSubscriptionFromFirestore,
  subscribeToAllSubscriptionsInFirestore
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
  try {
    const raw = localStorage.getItem(DELETED_EMAILS_KEY);
    let list: string[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addDeletedEmail(email: string): void {
  const clean = email.trim().toLowerCase();
  if (!clean || clean === ADMIN_EMAIL.toLowerCase()) return;
  const list = getDeletedEmails();
  if (!list.includes(clean)) {
    list.push(clean);
    localStorage.setItem(DELETED_EMAILS_KEY, JSON.stringify(list));
  }
}

export function removeDeletedEmail(email: string): void {
  const clean = email.trim().toLowerCase();
  if (!clean) return;
  const list = getDeletedEmails().filter(e => e !== clean);
  localStorage.setItem(DELETED_EMAILS_KEY, JSON.stringify(list));
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

  // ضمان وجود حساب المدير دائماً
  const initial = getInitialSubscriptions();
  if (!map[ADMIN_EMAIL] || map[ADMIN_EMAIL].status !== 'active' || !map[ADMIN_EMAIL].isLifetime) {
    map[ADMIN_EMAIL] = initial[ADMIN_EMAIL];
  }

  // تطبيق القائمة السوداء للمحذوفات نهائياً
  const deleted = getDeletedEmails();
  deleted.forEach(delEmail => {
    if (delEmail !== ADMIN_EMAIL.toLowerCase()) {
      delete map[delEmail];
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
 */
export async function registerOrUpdateGoogleUser(user: { email: string; name: string }): Promise<TeacherSubscription> {
  const cleanEmail = user.email.trim().toLowerCase();
  
  if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
    return getTeacherSubscription(ADMIN_EMAIL);
  }

  const deleted = getDeletedEmails();
  // إذا كان الحساب محذوفاً سابقاً، يرجع كـ deleted للحد من إعادة الإنشاء التلقائية
  if (deleted.includes(cleanEmail)) {
    return {
      teacherEmail: cleanEmail,
      teacherName: user.name || cleanEmail.split('@')[0],
      planId: 'none',
      status: 'deleted',
      amountDZD: 0,
      expiresAt: null,
      isLifetime: false,
      adminNotes: 'حساب محذوف سابقاً من طرف الإدارة'
    };
  }

  const all = loadAllSubscriptions();
  const existing = all[cleanEmail];

  // الحساب المنسخ يبقى مفعل مدى الحياة إذا تم تفعيله مسبقاً من الإدارة
  const isAlreadyActive = existing && existing.status === 'active';
  const finalStatus: SubscriptionStatus = isAlreadyActive ? 'active' : 'pending';

  const registeredSub: TeacherSubscription = {
    teacherEmail: cleanEmail,
    teacherName: user.name || existing?.teacherName || cleanEmail.split('@')[0],
    phoneNumber: existing?.phoneNumber || '',
    planId: 'lifetime',
    status: finalStatus,
    amountDZD: existing?.amountDZD || 5000,
    paymentProof: existing?.paymentProof,
    requestedAt: existing?.requestedAt || new Date().toISOString(),
    activatedAt: finalStatus === 'active' ? (existing?.activatedAt || new Date().toISOString()) : undefined,
    expiresAt: null,
    isLifetime: true,
    adminNotes: existing?.adminNotes || 'تم إنشاء حساب الأستاذ. أرسل وصل الدفع عبر واتساب وانتظر تفعيل الحساب.'
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

  const deleted = getDeletedEmails();
  if (deleted.includes(cleanEmail)) {
    return {
      teacherEmail: cleanEmail,
      teacherName: '',
      planId: 'none',
      status: 'deleted',
      amountDZD: 0,
      expiresAt: null,
      isLifetime: false,
      adminNotes: 'هذا الحساب محذوف. يرجى التواصل مع الإدارة إذا كنت تريد استعادة الوصول.'
    };
  }

  const all = loadAllSubscriptions();
  const sub = all[cleanEmail];

  if (!sub) {
    return {
      teacherEmail: cleanEmail,
      teacherName: cleanEmail.split('@')[0],
      planId: 'none',
      status: 'none',
      amountDZD: 0,
      expiresAt: null,
      isLifetime: false
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
      reason: 'طلبك قيد المراجعة. ستتمكن من الدخول بعد تفعيل الحساب.',
      subscription: sub
    };
  }

  if (sub.status === 'suspended') {
    return {
      hasAccess: false,
      status: 'suspended',
      reason: 'حسابك موقوف مؤقتاً. يرجى التواصل مع الإدارة.',
      subscription: sub
    };
  }

  if (sub.status === 'deleted') {
    return {
      hasAccess: false,
      status: 'deleted',
      reason: 'هذا الحساب محذوف. يرجى التواصل مع الإدارة إذا كنت تريد استعادة الوصول.',
      subscription: sub
    };
  }

  return {
    hasAccess: false,
    status: 'none',
    reason: 'تم إنشاء حسابك. أرسل وصل الدفع عبر واتساب.',
    subscription: sub
  };
}

/**
 * حذف حساب الأستاذ نهائياً وتوقيف صلاحياته فوراً
 */
export async function deleteTeacherAccount(
  currentCallerEmail: string,
  targetTeacherEmail: string
): Promise<{ success: boolean; message: string }> {
  if (!isCallerAuthorized(currentCallerEmail)) {
    return { success: false, message: 'غير مصرح لك بحذف الحسابات.' };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  if (targetClean === ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'لا يمكن حذف حساب المشرف العام djazild@gmail.com' };
  }

  // 1. إضافة الحساب للقائمة السوداء للمحذوفات نهائياً
  addDeletedEmail(targetClean);

  // 2. حذف الحساب محلياً
  const all = loadAllSubscriptions();
  delete all[targetClean];
  saveAllSubscriptions(all);

  // 3. مسح المستند وإضافته لقائمة المحذوفات في Firestore
  await deleteSubscriptionFromFirestore(targetClean);

  // 4. مسح ملفات البيانات المحلية
  const cleanKey = targetClean.replace(/[^a-z0-9]/g, '_');
  try {
    localStorage.removeItem(`teacher_profile_${cleanKey}`);
    localStorage.removeItem(`teacher_classes_${cleanKey}`);
    localStorage.removeItem(`teacher_curriculum_${cleanKey}`);
    localStorage.removeItem(`teacher_timetable_${cleanKey}`);
    localStorage.removeItem(`teacher_pdfs_${cleanKey}`);
  } catch {}

  // 5. إشعار السيرفر
  fetch('/api/subscriptions/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetTeacherEmail: targetClean })
  }).catch(e => console.warn('Background sync delete failed:', e));

  return {
    success: true,
    message: `تم حذف الحساب نهائياً (${targetClean}) ولن يستطيع الدخول إلا بعد الاستعادة.`
  };
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
  removeDeletedEmail(targetClean);
  await removeDeletedSubscriptionFromFirestore(targetClean);

  const restoredSub: TeacherSubscription = {
    teacherEmail: targetClean,
    teacherName: targetClean.split('@')[0],
    planId: 'lifetime',
    status: 'pending',
    amountDZD: 5000,
    requestedAt: new Date().toISOString(),
    expiresAt: null,
    isLifetime: true,
    adminNotes: 'تم استعادة الحساب المحذوف من طرف المشرف بانتظار التفعيل'
  };

  const all = loadAllSubscriptions();
  all[targetClean] = restoredSub;
  saveAllSubscriptions(all);
  await saveSubscriptionToFirestore(restoredSub);

  return {
    success: true,
    message: `تمت استعادة حساب (${targetClean}) بنجاح وتحويله لوضعية بانتظار التفعيل.`
  };
}

/**
 * تعليق/إيقاف حساب أستاذ مؤقتاً
 */
export async function suspendTeacherAccount(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  reason: string = 'تعطيل مؤقت بقرار المشرف',
  suspend?: boolean
): Promise<{ success: boolean; message: string; subscription?: TeacherSubscription }> {
  if (!isCallerAuthorized(currentCallerEmail)) {
    return { success: false, message: 'غير مصرح لك بتعطيل الحسابات.' };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  if (targetClean === ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'لا يمكن تعطيل حساب المشرف العام djazild@gmail.com' };
  }

  const all = loadAllSubscriptions();
  const existing = all[targetClean];
  if (!existing) {
    return { success: false, message: 'الحساب غير موجود' };
  }

  const isSuspending = suspend !== undefined ? suspend : existing.status !== 'suspended';
  const newStatus: SubscriptionStatus = isSuspending ? 'suspended' : 'active';

  const updated: TeacherSubscription = {
    ...existing,
    status: newStatus,
    adminNotes: isSuspending ? `حسابك موقوف مؤقتاً. يرجى التواصل مع الإدارة.` : `حسابك مفعّل. يمكنك الدخول إلى الدفتر.`
  };

  all[targetClean] = updated;
  saveAllSubscriptions(all);
  await saveSubscriptionToFirestore(updated);

  return {
    success: true,
    message: isSuspending ? `تم إيقاف حساب (${targetClean}) مؤقتاً.` : `تمت إعادة تفعيل حساب (${targetClean}) بنجاح.`,
    subscription: updated
  };
}
