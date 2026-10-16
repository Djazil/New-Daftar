import React, { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle2, ShieldCheck, AlertTriangle, Clock,
  ArrowRight, Copy, Check, Sparkles, Building2, User, Phone,
  FileText, LogOut, Lock, MessageCircle, ExternalLink, Calendar,
  CheckCircle, RefreshCw
} from 'lucide-react';
import { AuthUser, SubscriptionPlanId, PaymentProof } from '../types';
import {
  SUBSCRIPTION_TIERS, BARIDIMOB_CONFIG, WHATSAPP_CONTACT_NUMBER,
  getTeacherSubscription, submitSubscriptionRequest, submitSubscriptionRequestAsync,
  fetchSubscriptionsFromServer, ADMIN_EMAIL,
  createWhatsAppActivationLink, createWhatsAppDirectReceiptLink
} from '../services/subscriptionService';

interface TeacherSubscriptionPageProps {
  user: AuthUser;
  onLogout: () => void;
  onRefreshStatus?: () => void;
  onOpenAdminPanel?: () => void;
}

export default function TeacherSubscriptionPage({
  user,
  onLogout,
  onRefreshStatus,
  onOpenAdminPanel
}: TeacherSubscriptionPageProps) {
  // حالة الاشتراك الحالي
  const [subscription, setSubscription] = useState(() => getTeacherSubscription(user.email));

  // استعلام دوري تلقائي من السيرفر لمعرفة ما إذا قام المدير بتفعيل الحساب
  useEffect(() => {
    let isMounted = true;
    
    // جلب أولي من السيرفر
    fetchSubscriptionsFromServer().then(() => {
      if (isMounted) {
        setSubscription(getTeacherSubscription(user.email));
      }
    });

    const interval = setInterval(() => {
      fetchSubscriptionsFromServer().then(() => {
        if (isMounted) {
          const latest = getTeacherSubscription(user.email);
          setSubscription(latest);
          if (latest.status === 'active' && onRefreshStatus) {
            onRefreshStatus();
          }
        }
      });
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user.email, onRefreshStatus]);

  // حقول نموذج تأكيد الدفع وطلب تفعيل الاشتراك
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('6months');
  const [gmailAddress, setGmailAddress] = useState(user.email || '');
  const [fullName, setFullName] = useState(user.name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // حالات الواجهة
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsAppDirectUrl, setWhatsAppDirectUrl] = useState<string | null>(null);

  const selectedTier = SUBSCRIPTION_TIERS.find(t => t.id === selectedPlanId) || SUBSCRIPTION_TIERS[1];

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // إرسال نموذج تأكيد الدفع وفتح محادثة واتساب
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // التحقق من الحقول الإلزامية
    if (!gmailAddress.trim()) {
      setFormError('حقل البريد الإلكتروني (Gmail) إلزامي.');
      return;
    }

    if (!fullName.trim()) {
      setFormError('حقل الاسم واللقب إلزامي.');
      return;
    }

    if (!phoneNumber.trim()) {
      setFormError('حقل رقم الهاتف إلزامي.');
      return;
    }

    setIsSubmitting(true);

    // حفظ الطلب في قاعدة البيانات المركزية على السيرفر ومحلياً
    const proof: PaymentProof = {
      senderName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      ripNumber: BARIDIMOB_CONFIG.ripNumber,
      amount: selectedTier.priceDZD,
      paidAt: new Date().toISOString(),
      receiptNote: additionalNotes.trim(),
      sentViaWhatsApp: true
    };

    // إرسال وتأكيد الحفظ على السيرفر
    const updatedSub = await submitSubscriptionRequestAsync(gmailAddress.trim(), fullName.trim(), selectedPlanId, proof);
    setSubscription(updatedSub);

    // تجهيز رابط واتساب الرسمي بالترميز الصحيح
    const waUrl = createWhatsAppActivationLink({
      planId: selectedPlanId,
      planName: selectedTier.name,
      priceDZD: selectedTier.priceDZD,
      email: gmailAddress.trim(),
      fullName: fullName.trim(),
      phone: phoneNumber.trim(),
      notes: additionalNotes.trim()
    });

    setWhatsAppDirectUrl(waUrl);
    setFormSubmitted(true);
    setIsSubmitting(false);
    if (onRefreshStatus) onRefreshStatus();

    // فتح محادثة واتساب بالرابط المباشر المشفر بالكامل
    try {
      window.open(waUrl, '_blank');
    } catch (e) {
      console.warn('Auto window.open failed:', e);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-600 selection:text-white flex flex-col justify-between">
      
      {/* شريط التنقل العلوي البسيط المتجاوب */}
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-base sm:text-lg shadow-md shadow-emerald-500/20 shrink-0">
              د
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-sm sm:text-lg text-white truncate">الدفتر اليومي الذكي</h1>
              <p className="text-[9px] sm:text-[11px] text-slate-400 truncate hidden sm:block">نظام اشتراكات الأساتذة في الطور الثانوي</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-200">{user.name}</p>
              <p className="text-[11px] font-mono text-slate-400">{user.email}</p>
            </div>

            {/* زر لوحة المدير يظهر حصراً لحساب الإدارة المحمي */}
            {user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && onOpenAdminPanel && (
              <button
                onClick={onOpenAdminPanel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition flex items-center gap-1 shadow-md shadow-emerald-600/30 cursor-pointer min-h-[38px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>المدير</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] sm:text-xs font-bold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition flex items-center gap-1 border border-slate-700 cursor-pointer min-h-[38px]"
              title="تسجيل الخروج والعودة للرئيسية"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10 flex-1">
        
        {/* تنبيه حالة الاشتراك الحالية إن وجدت */}
        {subscription.status === 'pending' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-3.5 shadow-sm">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <strong className="text-sm font-black text-amber-300 block">طلب تفعيل الاشتراك قيد المراجعة</strong>
              <p className="text-slate-300 leading-relaxed">
                تم تسجيل طلبك بنجاح. إذا قمت بإرسال وصل الدفع عبر واتساب، فسيتم التحقق من الحوالة وتفعيل حسابك يدوياً في أقرب وقت.
              </p>
              <a
                href={createWhatsAppDirectReceiptLink(selectedTier.name, selectedTier.priceDZD)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300 underline mt-1"
              >
                <span>متابعة إرسال وصل الدفع عبر واتساب ({WHATSAPP_CONTACT_NUMBER}) ←</span>
              </a>
            </div>
          </div>
        )}

        {subscription.status === 'expired' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 flex items-start gap-3.5 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <strong className="text-sm font-black text-rose-300 block">انتهت فترة اشتراكك في الدفتر الذكي</strong>
              <p className="text-slate-300 leading-relaxed">
                انتهت صلاحية اشتراكك السابق. جميع بياناتك وأفواجك وتلاميذك محفوظة بأمان تام وفق سياسة الحفظ. يرجى تجديد الاشتراك عبر بريدي موب وإرسال الوصل لإعادة التفعيل.
              </p>
            </div>
          </div>
        )}

        {/* 1. قائمة الأسعار */}
        <section className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-white">قائمة عروض الاشتراك</h2>
            <p className="text-xs text-slate-400">
              اختر المدة المناسبة لعملك اليومي كأستاذ في الطور الثانوي (بالدينار الجزائري DZD)
            </p>
          </div>

          {/* بطاقات أسعار بسيطة وأنيقة تحتوي فقط على: اسم الاشتراك، مدته، وسعره */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {SUBSCRIPTION_TIERS.map(tier => {
              const isSelected = selectedPlanId === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedPlanId(tier.id)}
                  className={`rounded-2xl p-5 border transition cursor-pointer flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">{tier.name}</span>
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-normal">{tier.durationLabel}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                        {tier.priceDZD.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-300 font-sans">دج</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanId(tier.id);
                        document.getElementById('activation-form')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{isSelected ? 'تم تحديد هذا العرض ✓' : 'تحديد العرض للتفعيل'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-[11px] text-slate-400">
            * اضغط على زر «تحديد العرض للتفعيل» للانتقال المباشر لنموذج تأكيد الدفع وإرسال طلب التفعيل عبر واتساب.
          </p>
        </section>

        {/* 2. طريقة الدفع وتأكيده */}
        <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 sm:p-7 space-y-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">طريقة الدفع عبر بريدي موب (BaridiMob)</h3>
                <p className="text-xs text-slate-400">يتم الدفع يدويًا عبر التحويل البريدي</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
              الدفع يدوي
            </span>
          </div>

          {/* بيانات الحساب المخصص للدفع فقط */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* رقم الحساب البريدي الموحد RIP */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">رقم الحساب البريدي الجاري (RIP):</span>
                <button
                  type="button"
                  onClick={() => handleCopy(BARIDIMOB_CONFIG.ripNumber.replace(/\s+/g, ''), 'rip')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedField === 'rip' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'rip' ? 'تم النسخ!' : 'نسخ RIP'}</span>
                </button>
              </div>
              <div className="text-base sm:text-lg font-mono font-black text-white tracking-wider bg-slate-900 p-2.5 rounded-xl border border-slate-800 select-all">
                {BARIDIMOB_CONFIG.ripNumber}
              </div>
              <p className="text-[11px] text-slate-400">مخصص للتحويل المباشر من تطبيق بريدي موب</p>
            </div>

            {/* إرشادات التحويل المباشرة */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-slate-300 block">خطوات التحويل البريدي:</span>
              <ol className="space-y-1.5 text-slate-400 list-decimal list-inside leading-relaxed">
                <li>افتح تطبيق بريدي موب (BaridiMob) في هاتفك.</li>
                <li>اختر تحويل الأموال وأدخل رقم RIP الموضح.</li>
                <li>أدخل المبلغ المطلوب: <strong className="text-emerald-400 font-mono">{selectedTier.priceDZD} دج</strong>.</li>
                <li>احتفظ بصورة وصل الدفع أو لقطة الشاشة للعملية.</li>
              </ol>
            </div>
          </div>

          {/* تعليمات إرسال الوصل عبر واتساب وزر الواتساب المباشر */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-black text-white">إرسال وصل الدفع عبر واتساب</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  بعد إتمام الدفع، يرسل الأستاذ وصل الدفع يدويًا عبر محادثة واتساب إلى الرقم: <strong className="text-emerald-400 font-mono text-sm tracking-wide">{WHATSAPP_CONTACT_NUMBER}</strong>
                </p>
              </div>

              {/* زر واتساب الواضح */}
              <a
                href={createWhatsAppDirectReceiptLink(selectedTier.name, selectedTier.priceDZD)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-[#25D366]/20 cursor-pointer shrink-0"
              >
                <MessageCircle className="w-4 h-4 fill-slate-950" />
                <span>إرسال وصل الدفع عبر واتساب</span>
              </a>
            </div>

            <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-slate-400 flex items-center gap-2">
              <span className="text-amber-400 font-bold">تنبيه هام:</span>
              <span>
                لا يتم إرسال الوصل تلقائيًا، بل يرفق الأستاذ صورة الوصل يدويًا داخل محادثة واتساب ليتمكن المدير من مراجعة الدفع والتفعيل.
              </span>
            </div>
          </div>
        </section>

        {/* 3. نموذج تأكيد الدفع وطلب تفعيل الاشتراك */}
        <section id="activation-form" className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-slate-800 pb-4 space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-white">
              تأكيد الدفع وتفعيل الاشتراك
            </h3>
            <p className="text-xs text-slate-400">
              يرجى ملء الحقول التالية بدقة لتجهيز طلب التفعيل وإرساله مباشرة عبر واتساب
            </p>
          </div>

          {formSubmitted && (
            <div className="p-5 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 text-emerald-100 text-xs space-y-3 shadow-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-base font-black text-emerald-300 block">تم تسجيل طلب التفعيل بنجاح وإرساله للوحة الإدارة!</strong>
                  <p className="text-slate-200 leading-relaxed">
                    تم حجز طلبك بنجاح في المنصة. يرجى الضغط على الزر المباشر أسفله لفتح محادثة واتساب الرسمية المعنونة بالرسالة المشفرة وإرسال وصل بريدي موب:
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-500/30">
                <a
                  href={whatsAppDirectUrl || createWhatsAppDirectReceiptLink(selectedTier.name, selectedTier.priceDZD)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition shadow-xl shadow-[#25D366]/30 cursor-pointer w-full text-center"
                >
                  <MessageCircle className="w-5 h-5 fill-slate-950 shrink-0" />
                  <span>📱 فتح محادثة واتساب وإرسال الطلب الآن ({WHATSAPP_CONTACT_NUMBER})</span>
                </a>
              </div>
            </div>
          )}

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            
            {/* الحقل 1: نوع الاشتراك */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                1. نوع الاشتراك: <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUBSCRIPTION_TIERS.map(tier => (
                  <label
                    key={tier.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                      selectedPlanId === tier.id
                        ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="planSelection"
                        value={tier.id}
                        checked={selectedPlanId === tier.id}
                        onChange={() => setSelectedPlanId(tier.id)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-slate-200">{tier.name}</span>
                    </div>
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      {tier.priceDZD} دج
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* الحقل 2: البريد الإلكتروني Gmail */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                2. حساب Google (Gmail): <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={gmailAddress}
                onChange={e => setGmailAddress(e.target.value)}
                placeholder="teacher@gmail.com"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition"
              />
              <p className="text-[11px] text-slate-400">
                يجب أن يكون هو البريد نفسه الذي تستعمله لتسجيل الدخول عبر Google إلى المنصة.
              </p>
            </div>

            {/* الحقل 3: الاسم واللقب */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                3. الاسم واللقب: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="الأستاذ(ة) فلان بن فلان"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* الحقل 4: رقم الهاتف */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                4. رقم الهاتف: <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="06 XX XX XX XX أو 05 / 07"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* الحقل 5: ملاحظات إضافية (اختياري) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                5. ملاحظات إضافية (اختياري):
              </label>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="أي ملاحظة أو استفسار تود إرفاقه مع طلب التفعيل..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition leading-relaxed"
              />
            </div>

            {/* زر إرسال طلب التفعيل عبر واتساب */}
            <div className="pt-3 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition shadow-xl shadow-[#25D366]/20 cursor-pointer transform active:scale-98 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>جاري تسجيل الطلب وإرساله إلى لوحة المدير...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5 fill-slate-950" />
                    <span>إرسال طلب التفعيل إلى لوحة المدير وعبر واتساب</span>
                  </>
                )}
              </button>

              {whatsAppDirectUrl && (
                <a
                  href={whatsAppDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition border border-emerald-500/30 text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح محادثة واتساب يدوياً إذا لم تفتح تلقائياً</span>
                </a>
              )}
            </div>

            <p className="text-center text-[11px] text-slate-400 leading-relaxed">
              عند الضغط على الزر، سيتم تسجيل طلبك مباشرة في لوحة تحكم المدير، وفتح محادثة واتساب رسمية مع الرقم <strong>{WHATSAPP_CONTACT_NUMBER}</strong> لإرفاق صورة وصل الدفع ليراجعها المدير ويفعل حسابك فورياً.
            </p>
          </form>
        </section>

      </main>

      {/* التذييل البسيط الخالي من أي بيانات شخصية */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-5 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>الدفتر اليومي الذكي للأستاذ في الطور الثانوي • 2026 / 2027</span>
          <span className="text-slate-400">الدعم الفني وخدمة الأساتذة عبر واتساب: {WHATSAPP_CONTACT_NUMBER}</span>
        </div>
      </footer>
    </div>
  );
}
