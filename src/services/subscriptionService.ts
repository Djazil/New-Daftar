import { SubscriptionTier, SubscriptionPlanId, TeacherSubscription, PaymentProof, SubscriptionStatus } from '../types';

export const ADMIN_EMAIL = 'djazild@gmail.com';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: '1month',
    name: 'اشتراك شهر واحد',
    durationLabel: 'شهر تقويمي واحد (30 يوماً)',
    durationMonths: 1,
    durationDays: 30,
    priceDZD: 800,
    features: [
      'الوصول الكامل إلى جميع الأقسام والطلبة',
      'دفتر الملاحظات والمتابعة اليومية',
      'حساب المعدلات والرقمنة الفورية',
      'تصدير كشوف النقاط وExcel',
      'دعم فني وتحديثات مستمرة'
    ]
  },
  {
    id: '6months',
    name: 'اشتراك 6 أشهر',
    durationLabel: 'سداسي دراسي كامل (6 أشهر / 180 يوماً)',
    durationMonths: 6,
    durationDays: 180,
    priceDZD: 3000,
    popular: true,
    features: [
      'تغطية فصلين دراسيين كاملين',
      'توفير 1800 دج مقارنة بالاشتراك الشهري',
      'رادار اليقظة والغيابات والتقارير الذكية',
      'مخطط الجلوس والتوزيع بالأفواج',
      'نسخ احتياطي واسترجاع فوري للبيانات'
    ]
  },
  {
    id: '1year',
    name: 'اشتراك سنة كاملة',
    durationLabel: 'موسم دراسي كامل (12 شهراً / 365 يوماً)',
    durationMonths: 12,
    durationDays: 365,
    priceDZD: 5000,
    features: [
      'تغطية العام الدراسي بالكامل مع العطل',
      'توفير 4600 دج مقارنة بالشهري',
      'جميع ميزات الدفتر الذكي بدون أي قيود',
      'توليد تقارير مجالس الأقسام وتحليل البكالوريا',
      'أولوية الدعم الفني المباشر من الإدارة'
    ]
  },
  {
    id: 'lifetime',
    name: 'اشتراك مدى الحياة',
    durationLabel: 'تفعيل دائم غير محدود مدى الحياة',
    durationMonths: null,
    durationDays: null,
    priceDZD: 10000,
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
  ripNumber: '007 99999 0023456789 25',
  ccpAccount: '23456789 مفتاح 25',
  bankName: 'بريد الجزائر - Algérie Poste (بريدي موب)',
  whatsappNumber: WHATSAPP_CONTACT_NUMBER,
  instructions: [
    'افتح تطبيق بريدي موب (BaridiMob) في هاتفك أو توجه لأقرب مكتب بريد.',
    'قم بتحويل المبلغ المطابق للاشتراك المرغوب فيه عبر رقم الحساب البريدي الموحد (RIP).',
    'احتفظ بصورة وصل الدفع أو لقطة شاشة من تطبيق بريدي موب.',
    'املأ نموذج «تأكيد الدفع وتفعيل الاشتراك» أسفله، ثم اضغط على زر «إرسال طلب التفعيل عبر واتساب».',
    'أرفق وصل الدفع يدويًا داخل محادثة واتساب حتى يتمكن المدير من مراجعة الدفع وتفعيل حسابك.'
  ]
};

/**
 * تجهيز رابط واتساب الرسمي لطلب تفعيل الاشتراك بالترميز الصحيح
 */
export function createWhatsAppActivationLink(data: {
  planId: SubscriptionPlanId;
  planName: string;
  priceDZD: number;
  email: string;
  fullName: string;
  phone: string;
  notes?: string;
}): string {
  const message = `طلب تفعيل اشتراك في «الدفتر اليومي الذكي للأستاذ»:
- نوع الاشتراك: ${data.planName} (${data.priceDZD} دج)
- البريد الإلكتروني (Gmail): ${data.email}
- الاسم واللقب: ${data.fullName}
- رقم الهاتف: ${data.phone}
${data.notes ? `- ملاحظات إضافية: ${data.notes}\n` : ''}
(سأقوم بإرفاق صورة وصل الدفع عبر بريدي موب في هذه المحادثة حتى يتمكن المدير من مراجعة الدفع وتفعيل الحساب)`;

  return `https://wa.me/${WHATSAPP_INTL_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * رابط مباشر لفتح محادثة واتساب لإرسال وصل الدفع
 */
export function createWhatsAppDirectReceiptLink(planName?: string, priceDZD?: number): string {
  const planInfo = planName ? ` (${planName} — ${priceDZD} دج)` : '';
  const message = `السلام عليكم ورحمة الله،
أود إرسال وصل الدفع عبر بريدي موب لتفعيل اشتراكي في «الدفتر الذكي للأستاذ»${planInfo}.
سأقوم بإرفاق صورة الوصل هنا حتى يتمكن المدير من مراجعة الدفع وتفعيل الحساب.`;

  return `https://wa.me/${WHATSAPP_INTL_NUMBER}?text=${encodeURIComponent(message)}`;
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

// تهيئة التخزين الأولي مع تفعيل دائم لحساب المدير
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

  const sampleTeacherSub: TeacherSubscription = {
    teacherEmail: 'prof.ahmed@gmail.com',
    teacherName: 'أ. أحمد بلحاج',
    planId: '1year',
    status: 'active',
    amountDZD: 5000,
    isLifetime: false,
    requestedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    activatedAt: new Date(Date.now() - 29 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 335 * 86400000).toISOString(),
    activatedByAdminEmail: ADMIN_EMAIL,
    paymentProof: {
      transactionRef: 'BM-2026-98124',
      senderName: 'أحمد بلحاج',
      phoneNumber: '0661223344',
      ripNumber: '007 99999 0023456789 25',
      amount: 5000,
      paidAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      receiptNote: 'تم الدفع عبر بريدي موب بنجاح'
    }
  };

  const pendingTeacherSub: TeacherSubscription = {
    teacherEmail: 'prof.karim.dz@gmail.com',
    teacherName: 'أ. كريم المنصوري',
    phoneNumber: '0655443322',
    planId: '6months',
    status: 'pending',
    amountDZD: 3000,
    isLifetime: false,
    requestedAt: new Date().toISOString(),
    expiresAt: null,
    paymentProof: {
      transactionRef: 'BM-2026-44892',
      senderName: 'كريم المنصوري',
      phoneNumber: '0655443322',
      ripNumber: '007 99999 0023456789 25',
      amount: 3000,
      paidAt: new Date().toISOString(),
      receiptNote: 'حوالة بريدي موب - بانتظار التأكيد',
      sentViaWhatsApp: true
    }
  };

  return {
    [ADMIN_EMAIL]: adminSub,
    ['prof.ahmed@gmail.com']: sampleTeacherSub,
    ['prof.karim.dz@gmail.com']: pendingTeacherSub
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

  // ضمان وجود حساب المدير وتفعيله الدائم
  const initial = getInitialSubscriptions();
  if (!map[ADMIN_EMAIL] || map[ADMIN_EMAIL].status !== 'active' || !map[ADMIN_EMAIL].isLifetime) {
    map[ADMIN_EMAIL] = initial[ADMIN_EMAIL];
  }

  return map;
}

export function saveAllSubscriptions(map: Record<string, TeacherSubscription>): void {
  // الحماية الصارمة لحساب المدير قبل الحفظ
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
}

/**
 * مزامنة وجلب جميع الاشتراكات المركزية من السيرفر وتحديث التخزين المحلي
 */
export async function fetchSubscriptionsFromServer(): Promise<Record<string, TeacherSubscription>> {
  try {
    const res = await fetch('/api/subscriptions');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.subscriptions) {
        const serverSubs = data.subscriptions as Record<string, TeacherSubscription>;
        const local = loadAllSubscriptions();
        let localDeleted = getDeletedEmails();

        const merged: Record<string, TeacherSubscription> = { ...local };

        Object.keys(serverSubs).forEach(email => {
          const cleanEmail = email.toLowerCase();
          merged[cleanEmail] = serverSubs[email];
          localDeleted = localDeleted.filter(e => e !== cleanEmail);
        });

        localStorage.setItem(DELETED_EMAILS_KEY, JSON.stringify(localDeleted));

        // حماية حساب المدير
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
          adminNotes: 'حساب المشرف العام والمدير الرئيسي - صلاحيات كاملة وتفعيل دائم مجاني'
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        try {
          window.dispatchEvent(new CustomEvent('smart_notebook_subscriptions_updated', { detail: merged }));
        } catch {}
        return merged;
      }
    }
  } catch (err) {
    console.warn('Network sync with /api/subscriptions failed, using local cache:', err);
  }
  return loadAllSubscriptions();
}

/**
 * تسجيل أو تحديث حساب الأستاذ تلقائياً عند تسجيل الدخول عبر Google
 * يضمن ظهور الأستاذ فوراً في لوحة المدير وقسم التفعيل
 */
export async function registerOrUpdateGoogleUser(user: { email: string; name: string }): Promise<TeacherSubscription> {
  const cleanEmail = user.email.trim().toLowerCase();
  
  if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
    return getTeacherSubscription(ADMIN_EMAIL);
  }

  // Remove from deleted list if re-registering
  removeDeletedEmail(cleanEmail);

  const all = loadAllSubscriptions();
  const existing = all[cleanEmail];

  // إذا كان الحساب غير مفعل أو غير موجود، نسجله كطلب جديد للتفعيل حتى يظهر للمدير
  const finalStatus: SubscriptionStatus = existing?.status === 'active' ? 'active' : 'pending';

  const registeredSub: TeacherSubscription = {
    teacherEmail: cleanEmail,
    teacherName: user.name || existing?.teacherName || cleanEmail.split('@')[0],
    phoneNumber: existing?.phoneNumber || '',
    planId: existing?.planId || '6months',
    status: finalStatus,
    amountDZD: existing?.amountDZD || 3000,
    paymentProof: existing?.paymentProof,
    requestedAt: existing?.requestedAt || new Date().toISOString(),
    activatedAt: finalStatus === 'active' ? existing?.activatedAt : undefined,
    expiresAt: finalStatus === 'active' ? (existing?.expiresAt || null) : null,
    isLifetime: finalStatus === 'active' ? (existing?.isLifetime || false) : false,
    adminNotes: existing?.adminNotes || 'حساب أستاذ جديد تم تسجيله عبر Google بانتظار التفعيل'
  };

  all[cleanEmail] = registeredSub;
  saveAllSubscriptions(all);

  // إرسال تسجيل الحساب فوراً للسيرفر المركزي
  try {
    const res = await fetch('/api/subscriptions/register', {
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
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.subscription) {
        const latest = loadAllSubscriptions();
        latest[cleanEmail] = data.subscription;
        saveAllSubscriptions(latest);
        return data.subscription;
      }
    }
  } catch (err) {
    console.warn('Network auto-register to /api/subscriptions/register failed, local saved:', err);
  }

  return registeredSub;
}

/**
 * الحصول على حالة اشتراك الأستاذ الحالي مع فحص دقيق لتاريخ الانتهاء
 */
export function getTeacherSubscription(email: string): TeacherSubscription {
  const cleanEmail = email.trim().toLowerCase();
  
  // حساب المدير دائم التفعيل
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
      status: 'none',
      amountDZD: 0,
      expiresAt: null,
      isLifetime: false
    };
  }

  // التحقق الحقيقي من تاريخ الانتهاء
  if (sub.status === 'active' && !sub.isLifetime && sub.expiresAt) {
    const expireTime = new Date(sub.expiresAt).getTime();
    if (Date.now() > expireTime) {
      const expiredSub: TeacherSubscription = {
        ...sub,
        status: 'expired'
      };
      all[cleanEmail] = expiredSub;
      saveAllSubscriptions(all);
      return expiredSub;
    }
  }

  return sub;
}

/**
 * إرسال طلب اشتراك مع إثبات الدفع عبر بريدي موب من طرف الأستاذ
 */
export function submitSubscriptionRequest(
  teacherEmail: string,
  teacherName: string,
  planId: SubscriptionPlanId,
  proof: PaymentProof
): TeacherSubscription {
  const cleanEmail = teacherEmail.trim().toLowerCase();
  const tier = SUBSCRIPTION_TIERS.find(t => t.id === planId) || SUBSCRIPTION_TIERS[0];
  const all = loadAllSubscriptions();

  const newSub: TeacherSubscription = {
    teacherEmail: cleanEmail,
    teacherName: teacherName || cleanEmail.split('@')[0],
    phoneNumber: proof.phoneNumber || '',
    planId: tier.id,
    status: 'pending',
    amountDZD: tier.priceDZD,
    paymentProof: proof,
    requestedAt: new Date().toISOString(),
    expiresAt: null,
    isLifetime: tier.id === 'lifetime'
  };

  all[cleanEmail] = newSub;
  saveAllSubscriptions(all);

  // إرسال فوري للسيرفر المركزي عبر الشبكة
  fetch('/api/subscriptions/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teacherEmail: cleanEmail,
      teacherName: teacherName || cleanEmail.split('@')[0],
      planId: tier.id,
      proof
    })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.subscription) {
        const latest = loadAllSubscriptions();
        latest[cleanEmail] = data.subscription;
        saveAllSubscriptions(latest);
      }
    })
    .catch(e => console.warn('Background sync to /api/subscriptions/request failed:', e));

  return newSub;
}

/**
 * دالة مساعدة مع Promise لإرسال الطلب للسيرفر والانتظار لضمان الوصول
 */
export async function submitSubscriptionRequestAsync(
  teacherEmail: string,
  teacherName: string,
  planId: SubscriptionPlanId,
  proof: PaymentProof
): Promise<TeacherSubscription> {
  const sub = submitSubscriptionRequest(teacherEmail, teacherName, planId, proof);
  try {
    const res = await fetch('/api/subscriptions/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherEmail: sub.teacherEmail,
        teacherName: sub.teacherName,
        planId: sub.planId,
        proof
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.subscription) {
        const latest = loadAllSubscriptions();
        latest[sub.teacherEmail] = data.subscription;
        saveAllSubscriptions(latest);
        return data.subscription;
      }
    }
  } catch (err) {
    console.warn('Network submit failed, local copy saved:', err);
  }
  return sub;
}

/**
 * تفعيل الاشتراك يدوياً من طرف المشرف djazild@gmail.com حصراً
 */
export function activateTeacherSubscription(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  planId: SubscriptionPlanId,
  options?: {
    customDays?: number;
    customPriceDZD?: number;
    adminNotes?: string;
  }
): { success: boolean; message: string; subscription?: TeacherSubscription } {
  const callerClean = currentCallerEmail.trim().toLowerCase();
  if (callerClean !== ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      message: 'عذراً! لا تملك صلاحيات المشرف لتفعيل أو تعديل الاشتراكات. العملية محظورة أمنياً.'
    };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  const all = loadAllSubscriptions();
  const tier = SUBSCRIPTION_TIERS.find(t => t.id === planId) || SUBSCRIPTION_TIERS[0];
  const now = new Date();

  let expiresAt: string | null = null;
  const isLifetime = planId === 'lifetime';

  if (!isLifetime) {
    const nowMs = now.getTime();
    let daysToAdd = options?.customDays || tier.durationDays || 30;
    
    if (planId === '1month') {
      const future = new Date(now);
      future.setMonth(future.getMonth() + 1);
      expiresAt = future.toISOString();
    } else if (planId === '6months') {
      const future = new Date(now);
      future.setMonth(future.getMonth() + 6);
      expiresAt = future.toISOString();
    } else if (planId === '1year') {
      const future = new Date(now);
      future.setFullYear(future.getFullYear() + 1);
      expiresAt = future.toISOString();
    } else {
      expiresAt = new Date(nowMs + daysToAdd * 86400000).toISOString();
    }
  }

  const existing = all[targetClean];
  const updated: TeacherSubscription = {
    teacherEmail: targetClean,
    teacherName: existing?.teacherName || targetClean.split('@')[0],
    phoneNumber: existing?.phoneNumber || '',
    planId,
    status: 'active',
    amountDZD: options?.customPriceDZD !== undefined ? options.customPriceDZD : tier.priceDZD,
    paymentProof: existing?.paymentProof,
    requestedAt: existing?.requestedAt || now.toISOString(),
    activatedAt: now.toISOString(),
    expiresAt,
    activatedByAdminEmail: ADMIN_EMAIL,
    adminNotes: options?.adminNotes || 'تم التفعيل والتحقق من الحوالة البريدية بنجاح من طرف المشرف الرئيسي.',
    isLifetime
  };

  all[targetClean] = updated;
  saveAllSubscriptions(all);

  // تحديث السيرفر المركزي
  fetch('/api/subscriptions/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentCallerEmail: ADMIN_EMAIL,
      targetTeacherEmail: targetClean,
      planId,
      options
    })
  }).catch(e => console.warn('Background sync to /api/subscriptions/activate failed:', e));

  return {
    success: true,
    message: `تم تفعيل اشتراك الأستاذ (${targetClean}) بنجاح بنوع (${tier.name}).`,
    subscription: updated
  };
}

/**
 * إنهاء أو إلغاء تفعيل اشتراك أستاذ من طرف المشرف
 */
export function revokeOrExpireSubscription(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  reason: string = 'إنهاء يدوي من الإدارة'
): { success: boolean; message: string; subscription?: TeacherSubscription } {
  const callerClean = currentCallerEmail.trim().toLowerCase();
  if (callerClean !== ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      message: 'عملية غير مصرح بها. يتطلب صلاحيات المشرف العام.'
    };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  if (targetClean === ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      message: 'لا يمكن إلغاء تفعيل حساب المدير الرئيسي، فهو مفعل مدى الحياة.'
    };
  }

  const all = loadAllSubscriptions();
  const existing = all[targetClean];
  if (!existing) {
    return { success: false, message: 'لم يتم العثور على اشتراك لهذا الأستاذ.' };
  }

  const updated: TeacherSubscription = {
    ...existing,
    status: 'expired',
    expiresAt: new Date(Date.now() - 1000).toISOString(),
    adminNotes: `تم إنهاء الاشتراك: ${reason}`
  };

  all[targetClean] = updated;
  saveAllSubscriptions(all);

  // تحديث السيرفر المركزي
  fetch('/api/subscriptions/expire', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentCallerEmail: ADMIN_EMAIL,
      targetTeacherEmail: targetClean,
      reason
    })
  }).catch(e => console.warn('Background sync to /api/subscriptions/expire failed:', e));

  return {
    success: true,
    message: `تم إنهاء اشتراك (${targetClean}) بنجاح، وستطبق قيود الوصول فوراً مع الحفاظ التام على بياناته.`,
    subscription: updated
  };
}

/**
 * توليد طلب اشتراك تجريبي فوري للتحقق من وصول الاشتراكات إلى لوحة المدير
 */
export async function generateTestSubscription(): Promise<TeacherSubscription | null> {
  try {
    const res = await fetch('/api/subscriptions/generate-test-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.subscription) {
        const latest = loadAllSubscriptions();
        latest[data.subscription.teacherEmail] = data.subscription;
        saveAllSubscriptions(latest);
        return data.subscription;
      }
    }
  } catch (err) {
    console.error('Failed to generate test subscription:', err);
  }

  // مولد احتياطي محلي في حال عدم توفر الشبكة
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const testEmail = `prof.test${randomId}@gmail.com`;
  const sub = submitSubscriptionRequest(
    testEmail,
    `أ. تجريبي محلي (${randomId})`,
    '6months',
    {
      transactionRef: `BM-LOCAL-${randomId}`,
      senderName: `أ. تجريبي (${randomId})`,
      phoneNumber: '0655' + randomId,
      ripNumber: '007 99999 0023456789 25',
      amount: 3000,
      paidAt: new Date().toISOString(),
      receiptNote: 'حوالة تجريبية لاختبار لوحة تحكم المدير',
      sentViaWhatsApp: true
    }
  );
  return sub;
}

/**
 * فحص الصلاحيات الشاملة للأستاذ
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
      reason: 'يجب تسجيل الدخول بحساب Google أولاً للتحقق من الاشتراك.',
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

  const sub = getTeacherSubscription(clean);

  if (sub.status === 'active') {
    return {
      hasAccess: true,
      status: 'active',
      reason: sub.isLifetime ? 'اشتراك مدى الحياة مفعل.' : `اشتراك نشط حتى ${new Date(sub.expiresAt!).toLocaleDateString('ar-DZ')}`,
      subscription: sub
    };
  }

  if (sub.status === 'pending') {
    return {
      hasAccess: false,
      status: 'pending',
      reason: 'طلب الاشتراك قيد المراجعة والتحقق اليدوي من الإدارة عبر بريدي موب.',
      subscription: sub
    };
  }

  if (sub.status === 'suspended') {
    return {
      hasAccess: false,
      status: 'suspended',
      reason: 'تم تعطيل حسابك مؤقتاً بقرار من إدارة المنصة. يرجى التواصل مع الدعم الفني أو المشرف للاستفسار أو إعادة التنشيط.',
      subscription: sub
    };
  }

  if (sub.status === 'expired') {
    return {
      hasAccess: false,
      status: 'expired',
      reason: 'انتهت فترة اشتراكك في الدفتر الذكي. يرجى التجديد لمواصلة الاستفادة من الميزات المدفوعة مع بقاء بياناتك محفوظة بأمان.',
      subscription: sub
    };
  }

  return {
    hasAccess: false,
    status: 'none',
    reason: 'لا يوجد اشتراك نشط. يرجى اختيار أحد عروض الاشتراك وتأكيد الدفع للاستفادة من المنصة.',
    subscription: sub
  };
}

/**
 * حذف حساب الأستاذ نهائياً من التخزين المحلي والسيرفر
 */
export function deleteTeacherAccount(
  currentCallerEmail: string,
  targetTeacherEmail: string
): { success: boolean; message: string } {
  const callerClean = currentCallerEmail.trim().toLowerCase();
  if (callerClean !== ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'غير مصرح لك بحذف الحسابات.' };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  if (targetClean === ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'لا يمكن حذف حساب المشرف العام djazild@gmail.com' };
  }

  // إضافة الحساب للقائمة السوداء للمحذوفات نهائياً
  addDeletedEmail(targetClean);

  const all = loadAllSubscriptions();
  delete all[targetClean];
  saveAllSubscriptions(all);

  // مسح جميع الملفات والبيانات المعزولة للأستاذ محلياً
  const cleanKey = targetClean.replace(/[^a-z0-9]/g, '_');
  try {
    localStorage.removeItem(`teacher_profile_${cleanKey}`);
    localStorage.removeItem(`teacher_classes_${cleanKey}`);
    localStorage.removeItem(`teacher_curriculum_${cleanKey}`);
    localStorage.removeItem(`teacher_timetable_${cleanKey}`);
    localStorage.removeItem(`teacher_pdfs_${cleanKey}`);
  } catch {}

  fetch('/api/subscriptions/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetTeacherEmail: targetClean })
  }).catch(e => console.warn('Background sync delete failed:', e));

  return {
    success: true,
    message: `تم إلغاء اشتراك وحذف حساب الأستاذ (${targetClean}) نهائياً من السيرفر والمنصة. يتوجب على صاحب الحساب إعادة التسجيل بانتظار التفعيل.`
  };
}

/**
 * تعطيل حساب الأستاذ مؤقتاً أو رفع التعطيل عنه
 */
export function suspendTeacherAccount(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  reason: string = 'تعطيل مؤقت بقرار المشرف',
  suspend?: boolean
): { success: boolean; message: string; subscription?: TeacherSubscription } {
  const callerClean = currentCallerEmail.trim().toLowerCase();
  if (callerClean !== ADMIN_EMAIL.toLowerCase()) {
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
    adminNotes: isSuspending
      ? `حساب معطل مؤقتاً: ${reason}`
      : `تم رفع التعطيل وتفعيل الحساب مجدداً من المشرف`
  };

  all[targetClean] = updated;
  saveAllSubscriptions(all);

  fetch('/api/subscriptions/suspend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetTeacherEmail: targetClean,
      reason,
      suspend: isSuspending
    })
  }).catch(e => console.warn('Background sync suspend failed:', e));

  return {
    success: true,
    message: isSuspending
      ? `تم تعطيل حساب (${targetClean}) مؤقتاً وحجب الوصول.`
      : `تم إلغاء تعطيل حساب (${targetClean}) وإعادة تنشيطه بنجاح.`,
    subscription: updated
  };
}

/**
 * تمديد فترة الاشتراك بـ عدد معين من الأيام
 */
export function extendTeacherSubscription(
  currentCallerEmail: string,
  targetTeacherEmail: string,
  daysToAdd: number,
  reason: string = 'تمديد الاشتراك من طرف المشرف'
): { success: boolean; message: string; subscription?: TeacherSubscription } {
  const callerClean = currentCallerEmail.trim().toLowerCase();
  if (callerClean !== ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'غير مصرح لك بتمديد الاشتراكات.' };
  }

  const targetClean = targetTeacherEmail.trim().toLowerCase();
  const all = loadAllSubscriptions();
  const existing = all[targetClean];
  if (!existing) {
    return { success: false, message: 'الحساب غير موجود' };
  }

  const now = new Date();
  let currentExpiry = existing.expiresAt ? new Date(existing.expiresAt) : now;
  if (currentExpiry.getTime() < now.getTime()) {
    currentExpiry = now; // إذا كان منتهياً نبدأ التمديد من اليوم
  }

  const newExpiry = new Date(currentExpiry.getTime() + daysToAdd * 86400000);

  const updated: TeacherSubscription = {
    ...existing,
    status: 'active',
    expiresAt: newExpiry.toISOString(),
    adminNotes: `تم تمديد الاشتراك بـ ${daysToAdd} يوم: ${reason}`
  };

  all[targetClean] = updated;
  saveAllSubscriptions(all);

  fetch('/api/subscriptions/extend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetTeacherEmail: targetClean,
      daysToAdd,
      reason
    })
  }).catch(e => console.warn('Background sync extend failed:', e));

  return {
    success: true,
    message: `تم تمديد اشتراك (${targetClean}) بـ ${daysToAdd} يوم بنجاح (حتى ${newExpiry.toLocaleDateString('ar-DZ')}).`,
    subscription: updated
  };
}
