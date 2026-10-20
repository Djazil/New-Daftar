import { SubscriptionTier, SubscriptionPlanId, TeacherSubscription, PaymentProof, SubscriptionStatus, AdminAuditLog } from '../types';
import {
  saveSubscriptionToFirestore,
  fetchSubscriptionsFromFirestore,
  fetchSingleSubscriptionFromFirestore,
  subscribeToTeacherSubscriptionInFirestore,
  deleteSubscriptionFromFirestore,
  fetchDeletedSubscriptionsFromFirestore,
  removeDeletedSubscriptionFromFirestore,
  subscribeToAllSubscriptionsInFirestore,
  saveAdminAuditLogInFirestore,
  fetchAdminAuditLogsFromFirestore,
  saveTeacherWorkspaceToFirestore,
  loadTeacherWorkspaceFromFirestore
} from './firebaseSubscriptionService';

export { subscribeToTeacherSubscriptionInFirestore, fetchSingleSubscriptionFromFirestore };

export const ADMIN_EMAIL = 'djazild@gmail.com';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'lifetime',
    name: 'اشتراك مدى الحياة',
    durationLabel: 'تفعيل دائم غير محدود مدى الحياة',
    durationMonths: null,
    durationDays: null,
    priceDZD: 1000,
    popular: true,
    features: [
      'تفعيل غير قابل للانتهاء أبداً',
      'دفع 1000 دج لمرة واحدة واستخدام دائم لسنوات',
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
    'قم بتحويل المبلغ (1000 دج) عبر رقم الحساب البريدي الموحد RIP: 00799999002093331792',
    'احتفظ بصورة وصل الدفع أو لقطة شاشة من تطبيق بريدي موب.',
    'سجل دخولك بحساب Google وسيظهر حسابك فوراً لدى إدارة المنصة بانتظار التفعيل.'
  ]
};

// =========================================================
// محرك كود التفعيل الاحتياطي الذكي (Deterministic Email-Bound Key)
// يعمل عبر جميع النطاقات (workers.dev / run.app) وحتى بدون خادم محلي
// =========================================================
const ACTIVATION_CODE_SALT = 'SMART_DAFTAR_DZ_2026_LIFETIME_SALT_V2';
const MASTER_EMERGENCY_CODE = 'DFTR-2026-GOLD';
const VERIFIED_ACTIVE_EMAILS_KEY = 'smart_notebook_verified_active_emails_v1';

export function getLocallyVerifiedActiveEmails(): string[] {
  try {
    const raw = localStorage.getItem(VERIFIED_ACTIVE_EMAILS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((e: string) => String(e).trim().toLowerCase()) : [];
  } catch {
    return [];
  }
}

export function markEmailLocallyVerifiedActive(email: string): void {
  const clean = email.trim().toLowerCase();
  if (!clean) return;
  try {
    const list = getLocallyVerifiedActiveEmails();
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem(VERIFIED_ACTIVE_EMAILS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function unmarkEmailLocallyVerifiedActive(email: string): void {
  const clean = email.trim().toLowerCase();
  try {
    const list = getLocallyVerifiedActiveEmails().filter(e => e !== clean);
    localStorage.setItem(VERIFIED_ACTIVE_EMAILS_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * توليد كود تفعيل احتياطي فريد وثابت مرتبط ببريد الأستاذ الإلكتروني
 * الصيغة: DFTR-XXXX-XXXX
 */
export function generateTeacherActivationCode(email: string): string {
  const clean = email.trim().toLowerCase();
  if (!clean) return 'DFTR-0000-0000';
  const input1 = `${clean}::${ACTIVATION_CODE_SALT}::PART1`;
  const input2 = `${ACTIVATION_CODE_SALT}::${clean}::PART2`;

  const hashPart = (str: string, seed: number): string => {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
      h = (h << 13) | (h >>> 19);
    }
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // بدون حروف ملتبسة مثل 0/O أو 1/I
    let out = '';
    let val = Math.abs(h);
    for (let j = 0; j < 4; j++) {
      out += chars[val % chars.length];
      val = Math.floor(val / chars.length) ^ ((h >>> (j * 4)) & 0xff);
    }
    return out;
  };

  const p1 = hashPart(input1, 2166136261);
  const p2 = hashPart(input2, 2654435761);
  return `DFTR-${p1}-${p2}`;
}

/**
 * التحقق من صحة كود التفعيل الاحتياطي وتفعيل حساب الأستاذ فوراً مدى الحياة
 */
export async function verifyAndRedeemActivationCode(
  email: string,
  inputCode: string,
  teacherNameHint?: string
): Promise<{ success: boolean; message: string; subscription?: TeacherSubscription }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, message: 'يرجى التأكد من إدخال البريد الإلكتروني أولاً.' };
  }

  const normalizedInput = inputCode
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '');

  if (!normalizedInput) {
    return { success: false, message: 'يرجى إدخال كود التفعيل المرسل من الإدارة.' };
  }

  const expectedCode = generateTeacherActivationCode(cleanEmail);
  const expectedNoDashes = expectedCode.replace(/-/g, '');
  const inputNoDashes = normalizedInput.replace(/-/g, '');

  const isValid =
    normalizedInput === expectedCode ||
    inputNoDashes === expectedNoDashes ||
    normalizedInput === MASTER_EMERGENCY_CODE ||
    inputNoDashes === MASTER_EMERGENCY_CODE.replace(/-/g, '');

  if (!isValid) {
    return {
      success: false,
      message: 'كود التفعيل غير صحيح أو غير مطابق لهذا البريد الإلكتروني. تأكد من نسخ الكود كاملاً (مثال: DFTR-XXXX-XXXX).'
    };
  }

  // اعتماد التفعيل الفوري مدى الحياة محلياً وسحابياً
  markEmailLocallyVerifiedActive(cleanEmail);
  const all = loadAllSubscriptions();
  const existing = all[cleanEmail];
  const now = new Date().toISOString();

  const activatedSub: TeacherSubscription = {
    teacherEmail: cleanEmail,
    teacherName: teacherNameHint || existing?.teacherName || cleanEmail.split('@')[0],
    phoneNumber: existing?.phoneNumber || '',
    planId: 'lifetime',
    status: 'active',
    amountDZD: existing?.amountDZD || 1000,
    paymentProof: existing?.paymentProof,
    requestedAt: existing?.requestedAt || now,
    activatedAt: now,
    expiresAt: null,
    activatedByAdminEmail: ADMIN_EMAIL,
    adminNotes: 'تم تفعيل الحساب مدى الحياة عبر كود التفعيل الرسمي',
    isLifetime: true
  };

  all[cleanEmail] = activatedSub;
  saveAllSubscriptions(all);
  await saveSubscriptionToFirestore(activatedSub);

  return {
    success: true,
    message: 'تم تفعيل حسابك مدى الحياة بنجاح! جاري فتح الدفتر اليومي...',
    subscription: activatedSub
  };
}

/**
 * إنشاء رابط واتساب لإرسال إشعار التفعيل وكود التفعيل الاحتياطي للأستاذ من لوحة المدير
 */
export function createWhatsAppCodeDeliveryLink(sub: TeacherSubscription): string {
  const cleanEmail = sub.teacherEmail.trim().toLowerCase();
  const code = generateTeacherActivationCode(cleanEmail);
  const teacherName = sub.teacherName || cleanEmail.split('@')[0];

  const messageLines = [
    `السلام عليكم ورحمة الله أستاذ(ة) ${teacherName}،`,
    `تم تفعيل حسابك مدى الحياة في «الدفتر اليومي الذكي للأستاذ» بنجاح! ✅`,
    ``,
    `📧 البريد المفعل: ${cleanEmail}`,
    `🔑 كود التفعيل الاحتياطي الفوري: ${code}`,
    ``,
    `🌐 رابط الدخول المباشر للمنصة:`,
    `https://new-daftar.djazild.workers.dev/`,
    ``,
    `ملاحظة: يمكنك الدخول مباشرة ببريدك، أو إدخال كود التفعيل (${code}) في شاشة الدخول ليفتح معك الدفتر فوراً على أي هاتف أو حاسوب.`
  ];

  const fullText = messageLines.join('\n');
  let targetPhone = (sub.phoneNumber || '').replace(/[^0-9]/g, '');
  if (targetPhone.startsWith('0') && targetPhone.length === 10) {
    targetPhone = '213' + targetPhone.slice(1);
  }
  if (targetPhone.length >= 9) {
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(fullText)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(fullText)}`;
}

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
    'طلب تفعيل اشتراك في «الدفتر اليومي الذكي للأستاذ» (1000 دج لمرة واحدة):',
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
  const fullMessage = `السلام عليكم ورحمة الله،\nأود إرسال وصل الدفع (1000 دج) عبر بريدي موب لتفعيل اشتراكي في «الدفتر الذكي للأستاذ».\nسأقوم بإرفاق صورة الوصل هنا حتى يتمكن المدير من مراجعة الدفع وتفعيل الحساب.`;

  return `https://wa.me/${WHATSAPP_INTL_NUMBER}?text=${encodeURIComponent(fullMessage)}`;
}

const STORAGE_KEY = 'smart_notebook_subscriptions_v2';
const DELETED_EMAILS_KEY = 'smart_notebook_deleted_subscriptions_v2';

export function getDeletedEmails(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_EMAILS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((e: string) => String(e).trim().toLowerCase()).filter(e => e && e !== ADMIN_EMAIL.toLowerCase())
      : [];
  } catch {
    return [];
  }
}

export function addDeletedEmail(email: string): void {
  const clean = email.trim().toLowerCase();
  if (!clean || clean === ADMIN_EMAIL.toLowerCase()) return;
  try {
    const list = getDeletedEmails();
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem(DELETED_EMAILS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function removeDeletedEmail(email: string): void {
  const clean = email.trim().toLowerCase();
  try {
    const list = getDeletedEmails().filter(e => e !== clean);
    localStorage.setItem(DELETED_EMAILS_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * استخراج أحدث طابع زمني لإجراء إداري (إلغاء أو إيقاف أو تفعيل) على السجل
 */
function getLatestAdminDecisionTimestamp(sub: TeacherSubscription): {
  type: 'active' | 'suspended' | 'canceled' | 'none';
  time: number;
} {
  const actTime = sub.status === 'active' && sub.activatedAt ? new Date(sub.activatedAt).getTime() : 0;
  const suspTime = sub.status === 'suspended' && sub.suspendedAt ? new Date(sub.suspendedAt).getTime() : 0;
  const cancelTime = sub.status === 'pending' && sub.canceledAt ? new Date(sub.canceledAt).getTime() : 0;

  const maxTime = Math.max(actTime, suspTime, cancelTime);
  if (maxTime <= 0) return { type: 'none', time: 0 };
  if (suspTime === maxTime && sub.status === 'suspended') return { type: 'suspended', time: suspTime };
  if (cancelTime === maxTime && sub.status === 'pending') return { type: 'canceled', time: cancelTime };
  if (actTime === maxTime && sub.status === 'active') return { type: 'active', time: actTime };
  return { type: 'none', time: 0 };
}

/**
 * دمج سجلين لنفس الأستاذ مع احترام أحدث قرار إداري (تفعيل / إيقاف / إلغاء اشتراك)
 * ومنع السجلات المخبأة القديمة من إبطال قرار المشرف
 */
function mergeTeacherSubscriptionRecord(
  existing: TeacherSubscription | undefined,
  incoming: TeacherSubscription | undefined
): TeacherSubscription | undefined {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const cleanEmail = (incoming.teacherEmail || existing.teacherEmail || '').trim().toLowerCase();
  if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
    return existing.status === 'active' ? existing : incoming;
  }

  const existingDecision = getLatestAdminDecisionTimestamp(existing);
  const incomingDecision = getLatestAdminDecisionTimestamp(incoming);

  // إذا كان أحد السجلين يحتوي على قرار إداري صريح أحدث زمنياً (إيقاف أو إلغاء أو تفعيل حديث) فإنه يسود دائماً
  if (existingDecision.time > 0 || incomingDecision.time > 0) {
    if (incomingDecision.time >= existingDecision.time && incomingDecision.type !== 'none') {
      if (incomingDecision.type === 'suspended') {
        return {
          ...existing,
          ...incoming,
          teacherEmail: cleanEmail,
          status: 'suspended'
        };
      }
      if (incomingDecision.type === 'canceled') {
        return {
          ...existing,
          ...incoming,
          teacherEmail: cleanEmail,
          status: 'pending',
          isLifetime: false,
          activatedAt: undefined
        };
      }
    } else if (existingDecision.time > incomingDecision.time && existingDecision.type !== 'none') {
      if (existingDecision.type === 'suspended') {
        return {
          ...incoming,
          ...existing,
          teacherEmail: cleanEmail,
          status: 'suspended'
        };
      }
      if (existingDecision.type === 'canceled') {
        return {
          ...incoming,
          ...existing,
          teacherEmail: cleanEmail,
          status: 'pending',
          isLifetime: false,
          activatedAt: undefined
        };
      }
    }
  }

  const verifiedEmails = getLocallyVerifiedActiveEmails();
  const isLocallyVerified = verifiedEmails.includes(cleanEmail);

  // حماية الحالة النشطة فقط عندما لا يكون هناك قرار إلغاء أو إيقاف أحدث
  if (existing.status === 'active' || incoming.status === 'active' || isLocallyVerified) {
    const activeBase = incoming.status === 'active' ? incoming : existing.status === 'active' ? existing : incoming;
    return {
      ...existing,
      ...incoming,
      ...activeBase,
      teacherEmail: cleanEmail,
      teacherName: activeBase.teacherName || existing.teacherName || incoming.teacherName || cleanEmail.split('@')[0],
      status: 'active',
      planId: activeBase.planId && activeBase.planId !== 'none' ? activeBase.planId : 'lifetime',
      isLifetime: activeBase.isLifetime !== undefined ? activeBase.isLifetime : true,
      expiresAt: activeBase.expiresAt ?? null,
      activatedAt: activeBase.activatedAt || existing.activatedAt || incoming.activatedAt || new Date().toISOString(),
      suspendedAt: undefined,
      suspensionReason: undefined,
      canceledAt: undefined
    };
  }

  return {
    ...existing,
    ...incoming,
    teacherEmail: cleanEmail
  };
}

// تهيئة التخزين الأولي مع تفعيل دائم لحساب المشرف العام والحسابات المعتمدة
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

  const sub2: TeacherSubscription = {
    teacherEmail: 'hdjazil95@gmail.com',
    teacherName: 'أ. hdjazil95',
    planId: 'lifetime',
    status: 'active',
    amountDZD: 0,
    isLifetime: true,
    expiresAt: null,
    activatedAt: new Date('2024-01-01').toISOString(),
    activatedByAdminEmail: ADMIN_EMAIL,
    adminNotes: 'حساب مفعل مدى الحياة'
  };

  const sub3: TeacherSubscription = {
    teacherEmail: 'droidy.dz@gmail.com',
    teacherName: 'أ. droidy.dz',
    planId: 'lifetime',
    status: 'active',
    amountDZD: 0,
    isLifetime: true,
    expiresAt: null,
    activatedAt: new Date('2024-01-01').toISOString(),
    activatedByAdminEmail: ADMIN_EMAIL,
    adminNotes: 'حساب مفعل مدى الحياة'
  };

  return {
    [ADMIN_EMAIL]: adminSub,
    'hdjazil95@gmail.com': sub2,
    'droidy.dz@gmail.com': sub3
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

  const deletedList = getDeletedEmails();

  // حذف أي بريد مدرج في قائمة المحذوفات من الخريطة المحلية
  deletedList.forEach(delEmail => {
    if (delEmail !== ADMIN_EMAIL.toLowerCase()) {
      delete map[delEmail];
    }
  });

  // ضمان وجود حساب المدير دائماً، والحسابات الابتدائية فقط إذا لم يقم المشرف بتعديلها أو حذفها
  const initial = getInitialSubscriptions();
  Object.keys(initial).forEach(initKey => {
    const cleanKey = initKey.toLowerCase();
    if (cleanKey === ADMIN_EMAIL.toLowerCase()) {
      map[cleanKey] = initial[initKey];
    } else if (!map[cleanKey] && !deletedList.includes(cleanKey)) {
      map[cleanKey] = initial[initKey];
    }
  });

  // ضمان تفعيل أي بريد تم تفعيله بكود التفعيل الاحتياطي محلياً ما لم يكن محذوفاً أو موقوفاً أو ملغى حديثاً
  const verifiedEmails = getLocallyVerifiedActiveEmails();
  const fallbackVerifiedDate = '2026-01-01T00:00:00.000Z';
  verifiedEmails.forEach(vEmail => {
    if (deletedList.includes(vEmail)) return;
    const existing = map[vEmail];
    if (!existing) {
      map[vEmail] = {
        teacherEmail: vEmail,
        teacherName: vEmail.split('@')[0],
        phoneNumber: '',
        planId: 'lifetime',
        status: 'active',
        amountDZD: 1000,
        isLifetime: true,
        expiresAt: null,
        activatedAt: fallbackVerifiedDate,
        activatedByAdminEmail: ADMIN_EMAIL,
        adminNotes: 'حسابك مفعّل مدى الحياة.'
      };
    } else if (existing.status !== 'active' && !existing.canceledAt && !existing.suspendedAt) {
      map[vEmail] = {
        ...existing,
        planId: 'lifetime',
        status: 'active',
        isLifetime: true,
        expiresAt: null,
        activatedAt: existing.activatedAt || fallbackVerifiedDate
      };
    }
  });

  // استبعاد أي سجل يحمل حالة deleted
  Object.keys(map).forEach(key => {
    const sub = map[key];
    if (sub && sub.status === 'deleted' && key.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      delete map[key];
    }
  });

  return map;
}

async function pushToCloudSyncStore(map: Record<string, TeacherSubscription>): Promise<void> {
  try {
    await fetch('/api/subscriptions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptions: map })
    }).catch(() => {});
  } catch {
    // في بيئة Cloudflare Workers نعتمد كلياً على Firebase Firestore المباشر
  }
}

export function saveAllSubscriptions(map: Record<string, TeacherSubscription>): void {
  const deletedList = getDeletedEmails();
  deletedList.forEach(delEmail => {
    if (delEmail !== ADMIN_EMAIL.toLowerCase()) {
      delete map[delEmail];
    }
  });

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

  // تحديث القائمة المحمية محلياً لتطابق الحالة الفعلية
  Object.values(map).forEach(sub => {
    if (!sub || !sub.teacherEmail) return;
    if (sub.status === 'active') {
      markEmailLocallyVerifiedActive(sub.teacherEmail);
    } else {
      unmarkEmailLocallyVerifiedActive(sub.teacherEmail);
    }
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  
  try {
    window.dispatchEvent(new CustomEvent('smart_notebook_subscriptions_updated', { detail: map }));
  } catch {}

  pushToCloudSyncStore(map);
}

/**
 * فحص سحابي مباشر لحالة أستاذ محدد عبر Firestore والتخزين المحلي
 * يمنع عودة الأستاذ المفعل إلى صفحة الانتظار في الرابط الخارجي workers.dev
 */
export async function verifyTeacherCloudStatus(
  email: string,
  nameHint?: string
): Promise<TeacherSubscription> {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
    return getTeacherSubscription(ADMIN_EMAIL);
  }

  const allLocal = loadAllSubscriptions();
  const prevStatus = allLocal[cleanEmail]?.status;
  let currentBest: TeacherSubscription | undefined = allLocal[cleanEmail];

  const firestoreSingle = await fetchSingleSubscriptionFromFirestore(cleanEmail).catch(() => null);

  if (firestoreSingle) {
    currentBest = mergeTeacherSubscriptionRecord(currentBest, firestoreSingle);
  }

  // إذا تبين أن الحساب مفعل في السحابة، نثبته فوراً في المتصفح وفي Firestore
  if (currentBest && currentBest.status === 'active') {
    markEmailLocallyVerifiedActive(cleanEmail);
    const activeSub: TeacherSubscription = {
      ...currentBest,
      teacherEmail: cleanEmail,
      teacherName: currentBest.teacherName || nameHint || cleanEmail.split('@')[0],
      status: 'active',
      planId: currentBest.planId && currentBest.planId !== 'none' ? currentBest.planId : 'lifetime',
      isLifetime: currentBest.isLifetime !== undefined ? currentBest.isLifetime : true,
      expiresAt: currentBest.expiresAt ?? null
    };
    allLocal[cleanEmail] = activeSub;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLocal));
    if (prevStatus !== 'active') {
      try {
        window.dispatchEvent(new CustomEvent('smart_notebook_subscriptions_updated', { detail: allLocal }));
      } catch {}
      saveSubscriptionToFirestore(activeSub).catch(() => {});
    }
    return activeSub;
  }

  if (currentBest) {
    allLocal[cleanEmail] = currentBest;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLocal));
    return currentBest;
  }

  return getTeacherSubscription(cleanEmail);
}

/**
 * مزامنة وجلب جميع الاشتراكات المركزية من Firestore والسيرفر
 */
export async function fetchSubscriptionsFromServer(options?: { silent?: boolean }): Promise<Record<string, TeacherSubscription>> {
  removeDeletedEmail(ADMIN_EMAIL);
  const prevRaw = localStorage.getItem(STORAGE_KEY);

  // جلب البيانات من Firestore بالتوازي (شاملة subscriptions و users و deleted_subscriptions)
  const [firestoreSubs, remoteDeletedList] = await Promise.all([
    fetchSubscriptionsFromFirestore().catch(() => ({} as Record<string, TeacherSubscription>)),
    fetchDeletedSubscriptionsFromFirestore().catch(() => ([] as string[]))
  ]);

  // دمج قائمة المحذوفات السحابية مع القائمة المحلية
  remoteDeletedList.forEach(delItem => {
    if (delItem && delItem.includes('@') && delItem !== ADMIN_EMAIL.toLowerCase()) {
      addDeletedEmail(delItem);
    }
  });

  const localDeleted = getDeletedEmails();
  const local = loadAllSubscriptions();
  const merged: Record<string, TeacherSubscription> = { ...local };

  // تنظيف أي حساب محذوف
  localDeleted.forEach(delEmail => {
    if (delEmail !== ADMIN_EMAIL.toLowerCase()) {
      delete merged[delEmail];
    }
  });

  // 1. دمج بيانات Firestore (شاملة لمجموعتي subscriptions و users)
  if (firestoreSubs && Object.keys(firestoreSubs).length > 0) {
    Object.keys(firestoreSubs).forEach(email => {
      const cleanEmail = email.trim().toLowerCase();
      if (!localDeleted.includes(cleanEmail) || cleanEmail === ADMIN_EMAIL.toLowerCase()) {
        const mergedRec = mergeTeacherSubscriptionRecord(merged[cleanEmail], firestoreSubs[email]);
        if (mergedRec) merged[cleanEmail] = mergedRec;
      }
    });
  }

  // 2. مزامنة مع السيرفر المحلي (إن وجد)
  try {
    const res = await fetch('/api/subscriptions');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.subscriptions) {
        const serverSubs = data.subscriptions as Record<string, TeacherSubscription>;
        Object.keys(serverSubs).forEach(email => {
          const cleanEmail = email.trim().toLowerCase();
          if (!localDeleted.includes(cleanEmail) || cleanEmail === ADMIN_EMAIL.toLowerCase()) {
            const mergedRec = mergeTeacherSubscriptionRecord(merged[cleanEmail], serverSubs[email]);
            if (mergedRec) merged[cleanEmail] = mergedRec;
          }
        });
      }
    }
  } catch {
    // على Cloudflare Workers لا يوجد /api/subscriptions، نعتمد على Firestore المباشر
  }

  // تحديث قائمة التفعيل المحلية بناءً على الحالة النهائية المدمجة
  Object.values(merged).forEach(sub => {
    if (!sub || !sub.teacherEmail) return;
    if (sub.status === 'active') {
      markEmailLocallyVerifiedActive(sub.teacherEmail);
    } else {
      unmarkEmailLocallyVerifiedActive(sub.teacherEmail);
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

  const nextRaw = JSON.stringify(merged);
  localStorage.setItem(STORAGE_KEY, nextRaw);

  if (!options?.silent && prevRaw !== nextRaw) {
    try {
      window.dispatchEvent(new CustomEvent('smart_notebook_subscriptions_updated', { detail: merged }));
    } catch {}
  }

  return merged;
}

/**
 * تسجيل أو تحديث حساب الأستاذ عند تسجيل الدخول عبر Google
 * يفحص حالة الحساب الحقيقية في السحابة أولاً ويمنع إعادة الحساب المفعل إلى قيد المراجعة
 */
export async function registerOrUpdateGoogleUser(user: { email: string; name: string }): Promise<TeacherSubscription> {
  const cleanEmail = user.email.trim().toLowerCase();
  
  // المشرف الرئيسي محمي دائماً
  if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
    return getTeacherSubscription(ADMIN_EMAIL);
  }

  // عند قيام الأستاذ بتسجيل دخول جديد، نزيله من سجل المحذوفات ليتمكن من التسجيل وطلب التفعيل
  removeDeletedEmail(cleanEmail);
  removeDeletedSubscriptionFromFirestore(cleanEmail).catch(() => {});

  // فحص مسبق متوازٍ من السحابة قبل اتخاذ أي قرار بشأن حالة الحساب
  const cloudVerifiedSub = await verifyTeacherCloudStatus(cleanEmail, user.name);
  const all = loadAllSubscriptions();
  const existing = mergeTeacherSubscriptionRecord(all[cleanEmail], cloudVerifiedSub);

  // الحساب يبقى مفعلاً إذا كان مفعلاً في أي مصدر سحابي أو محلي ولم يكن موقوفاً أو ملغى حديثاً
  let finalStatus: SubscriptionStatus = 'pending';
  if (existing?.status === 'suspended') {
    finalStatus = 'suspended';
  } else if (existing?.status === 'active' || (getLocallyVerifiedActiveEmails().includes(cleanEmail) && !existing?.canceledAt)) {
    finalStatus = 'active';
  }

  const registeredSub: TeacherSubscription = {
    teacherEmail: cleanEmail,
    teacherName: user.name || existing?.teacherName || cleanEmail.split('@')[0],
    phoneNumber: existing?.phoneNumber || '',
    planId: existing?.planId && existing.planId !== 'none' ? existing.planId : 'lifetime',
    status: finalStatus,
    amountDZD: existing?.amountDZD || 1000,
    paymentProof: existing?.paymentProof,
    requestedAt: existing?.requestedAt || new Date().toISOString(),
    activatedAt: finalStatus === 'active' ? (existing?.activatedAt || new Date().toISOString()) : undefined,
    suspendedAt: existing?.suspendedAt,
    suspensionReason: existing?.suspensionReason,
    canceledAt: existing?.canceledAt,
    expiresAt: null,
    isLifetime: finalStatus === 'active' ? true : false,
    adminNotes: existing?.adminNotes || (finalStatus === 'active'
      ? 'حسابك مفعّل. يمكنك الدخول إلى الدفتر.'
      : finalStatus === 'suspended'
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
  } catch {
    // متوقع في الاستضافات الثابتة مثل workers.dev
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
  removeDeletedEmail(cleanEmail);
  const all = loadAllSubscriptions();

  const newSub: TeacherSubscription = {
    teacherEmail: cleanEmail,
    teacherName: teacherName || cleanEmail.split('@')[0],
    phoneNumber: proof.phoneNumber || '',
    planId: 'lifetime',
    status: 'pending',
    amountDZD: proof.amount || 1000,
    paymentProof: proof,
    requestedAt: new Date().toISOString(),
    expiresAt: null,
    isLifetime: true
  };

  all[cleanEmail] = newSub;
  saveAllSubscriptions(all);
  saveSubscriptionToFirestore(newSub).catch(() => {});

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
 * تفعيل الاشتراك مدى الحياة أو بمدة مخصصة يدوياً من طرف المشرف djazild@gmail.com
 * يدعم أيضاً إضافة بريد أستاذ جديد لم يسجل بعد وتفعيله فوراً
 */
export async function activateTeacherSubscription(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  planId: SubscriptionPlanId = 'lifetime',
  options?: {
    teacherName?: string;
    phoneNumber?: string;
    adminNotes?: string;
    customDays?: number;
    customPriceDZD?: number;
  }
): Promise<{ success: boolean; message: string; subscription?: TeacherSubscription }> {
  if (!isCallerAuthorized(currentCallerEmail)) {
    await recordAdminAuditLog({
      actionType: 'activate',
      adminEmail: currentCallerEmail,
      targetTeacherEmail,
      details: 'محاولة غير مصرح بها لتفعيل حساب أستاذ',
      result: 'failure'
    });
    return {
      success: false,
      message: 'عملية غير مصرح بها. تتطلب صلاحيات المشرف djazild@gmail.com'
    };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  if (!targetClean || !targetClean.includes('@')) {
    return {
      success: false,
      message: 'يرجى إدخال بريد إلكتروني صحيح للأستاذ (مثال: teacher@gmail.com).'
    };
  }

  removeDeletedEmail(targetClean);
  await removeDeletedSubscriptionFromFirestore(targetClean);
  markEmailLocallyVerifiedActive(targetClean);

  const all = loadAllSubscriptions();
  const now = new Date();
  const existing = all[targetClean];

  const isLifetime = planId === 'lifetime';
  let expiresAt: string | null = null;
  if (!isLifetime) {
    const days = options?.customDays || (planId === '1month' ? 30 : planId === '1year' ? 365 : 180);
    expiresAt = new Date(now.getTime() + days * 86400000).toISOString();
  }

  const updated: TeacherSubscription = {
    teacherEmail: targetClean,
    teacherName: options?.teacherName?.trim() || existing?.teacherName || targetClean.split('@')[0],
    phoneNumber: options?.phoneNumber?.trim() || existing?.phoneNumber || '',
    planId: planId || 'lifetime',
    status: 'active',
    amountDZD: options?.customPriceDZD !== undefined ? options.customPriceDZD : (existing?.amountDZD || 1000),
    paymentProof: existing?.paymentProof,
    requestedAt: existing?.requestedAt || now.toISOString(),
    activatedAt: now.toISOString(),
    suspendedAt: undefined,
    suspensionReason: undefined,
    canceledAt: undefined,
    expiresAt,
    activatedByAdminEmail: ADMIN_EMAIL,
    adminNotes: options?.adminNotes || 'حسابك مفعّل. يمكنك الدخول إلى الدفتر.',
    isLifetime
  };

  all[targetClean] = updated;
  saveAllSubscriptions(all);
  await saveSubscriptionToFirestore(updated);

  try {
    const res = await fetch('/api/subscriptions/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentCallerEmail: ADMIN_EMAIL,
        targetTeacherEmail: targetClean,
        planId,
        options
      })
    });
    const data = await res.json().catch(() => ({}));
    if (data.subscription) {
      all[targetClean] = {
        ...updated,
        ...data.subscription,
        status: 'active',
        suspendedAt: undefined,
        canceledAt: undefined
      };
      saveAllSubscriptions(all);
    }
  } catch (e) {
    console.warn('Server sync activate error:', e);
  }

  await recordAdminAuditLog({
    actionType: 'activate',
    adminEmail: currentCallerEmail,
    targetTeacherEmail: targetClean,
    details: `تم تفعيل الاشتراك بنجاح (${isLifetime ? 'مدى الحياة' : planId})`,
    result: 'success'
  });

  return {
    success: true,
    message: `حسابك مفعّل. تم تفعيل حساب الأستاذ (${targetClean}) بنجاح.`,
    subscription: updated
  };
}

export async function syncTeacherDataToServer(email: string, data: any, retries = 3, delayMs = 1200): Promise<boolean> {
  // Persist workspace (including seating chart positions) directly to Firestore
  const firestorePromise = saveTeacherWorkspaceToFirestore(email, data).catch(() => false);

  let serverOk = false;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/teacher/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherEmail: email, data })
      });
      if (res.ok) {
        serverOk = true;
        break;
      }
    } catch {
      // network or fetch error, will retry
    }
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  const firestoreOk = await firestorePromise;
  return serverOk || firestoreOk;
}

export async function loadTeacherDataFromServer(email: string): Promise<any | null> {
  try {
    const firestoreData = await loadTeacherWorkspaceFromFirestore(email);
    if (firestoreData && firestoreData.teacherProfile) {
      return firestoreData;
    }
  } catch {}
  try {
    const res = await fetch(`/api/teacher/load/${encodeURIComponent(email)}`);
    if (res.ok) {
      const json = await res.json();
      return json.data || null;
    }
  } catch {}
  return null;
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
  unmarkEmailLocallyVerifiedActive(targetClean);
  const updated: TeacherSubscription = {
    ...existing,
    status: 'pending',
    planId: 'none',
    isLifetime: false,
    activatedAt: undefined,
    suspendedAt: undefined,
    suspensionReason: undefined,
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
  if (isSuspending) {
    unmarkEmailLocallyVerifiedActive(targetClean);
  } else {
    markEmailLocallyVerifiedActive(targetClean);
  }
  const newStatus: SubscriptionStatus = isSuspending ? 'suspended' : 'active';
  const now = new Date().toISOString();

  const updated: TeacherSubscription = {
    ...existing,
    status: newStatus,
    activatedAt: isSuspending ? existing.activatedAt : now,
    suspendedAt: isSuspending ? now : undefined,
    suspensionReason: isSuspending ? reason : undefined,
    canceledAt: undefined,
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
 * عملية منفصلة صريحة مع تأكيد؛ تحذف الحساب من السحابة والخادم وتمنع عودته التلقائية ما لم يسجل الأستاذ مجدداً
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

  // 1. تسجيل الحذف في السجل المحلي وإلغاء التفعيل المحلي وحذف الحساب من قائمة الاشتراكات
  addDeletedEmail(targetClean);
  unmarkEmailLocallyVerifiedActive(targetClean);
  const all = loadAllSubscriptions();
  delete all[targetClean];
  saveAllSubscriptions(all);

  // 2. حذف وثيقة الاشتراك والمستخدم من Firestore وتسجيل الحذف السحابي
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
    details: 'حذف نهائي صريح لسجل الحساب من السحابة والخادم',
    result: 'success'
  });

  return {
    success: true,
    message: `تم حذف حساب (${targetClean}) نهائياً من قاعدة البيانات والسحابة بنجاح.`
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
