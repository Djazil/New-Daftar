import React, { useState } from 'react';
import {
  GraduationCap, BookOpen, Users, BarChart3, ShieldCheck,
  Sparkles, Search, CheckCircle2, AlertTriangle,
  ArrowRight, Award, Clock, FileText, Check,
  LogIn, Eye, X, Lock, KeyRound,
  HeartHandshake, MessageSquare, Phone, Copy, ExternalLink, Calendar,
  CreditCard, Send
} from 'lucide-react';
import { Student, ClassGroup, AuthUser } from './types';
import { ParentPortalSecurity } from './services/parentSecurityService';
import {
  BARIDIMOB_CONFIG, WHATSAPP_CONTACT_NUMBER, WHATSAPP_INTL_NUMBER,
  ADMIN_EMAIL, createWhatsAppDirectReceiptLink
} from './services/subscriptionService';
import { saveSubscriptionToFirestore } from './services/firebaseSubscriptionService';

interface LandingPageProps {
  classes: ClassGroup[];
  onGoogleSignIn: (user: AuthUser) => void;
}

export const ADMIN_USER: AuthUser = {
  email: 'djazild@gmail.com',
  name: 'الأستاذ المشرف djazild',
  isAdmin: true,
  isActive: true,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
};

export default function LandingPage({ classes, onGoogleSignIn }: LandingPageProps) {
  // التبويب الرئيسي: "قسم الأساتذة" أو "فضاء الأولياء"
  const [activeTab, setActiveTab] = useState<'teachers' | 'parents'>('teachers');

  // فضاء الأولياء
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<{ student: Student; classInfo: ClassGroup } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // نافذة تسجيل دخول الأستاذ عبر Google
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [copiedRip, setCopiedRip] = useState(false);

  // نافذة إشعار "حسابك قيد المراجعة" بعد التسجيل
  const [pendingModalUser, setPendingModalUser] = useState<{ email: string; name: string } | null>(null);

  // جهاز المشرف الأدمن
  const [isAdminDevice, setIsAdminDevice] = useState<boolean>(() => {
    return localStorage.getItem('smart_notebook_is_admin_device') === 'true';
  });
  const [showAdminUnlockModal, setShowAdminUnlockModal] = useState(false);
  const [adminEmailVerify, setAdminEmailVerify] = useState('');
  const [adminVerifyError, setAdminVerifyError] = useState<string | null>(null);

  // استخراج جميع التلاميذ مع معلومات القسم
  const allStudents = classes.flatMap(cls =>
    cls.students.map(st => ({ student: st, classInfo: cls }))
  );

  // البحث في فضاء الأولياء
  const handleParentSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lockout = ParentPortalSecurity.checkLockout();
    if (lockout.isLocked) {
      setLockoutTimer(lockout.remainingSeconds);
      setSearchError(`⚠️ تم حظر البحث مؤقتاً للحماية. يرجى الانتظار ${lockout.remainingSeconds} ثانية.`);
      setSearchedStudent(null);
      return;
    }

    const cleanQuery = ParentPortalSecurity.sanitizeCode(parentCodeInput);
    if (!cleanQuery) {
      setSearchError('يرجى إدخال الكود الموحد للتلميذ أولاً (مثال: BAC-8821)');
      setSearchedStudent(null);
      return;
    }

    const found = allStudents.find(
      item => item.student.parentCode.trim().toUpperCase() === cleanQuery ||
              `${item.student.lastName} ${item.student.firstName}`.toLowerCase().includes(cleanQuery.toLowerCase())
    );

    if (found) {
      ParentPortalSecurity.recordSuccessfulAttempt();
      setSearchedStudent(found);
      setSearchError(null);
    } else {
      const failStatus = ParentPortalSecurity.recordFailedAttempt();
      setSearchedStudent(null);
      if (failStatus.isNowLocked) {
        setLockoutTimer(failStatus.remainingSeconds);
        setSearchError(`⚠️ تجاوزت الحد المسموح به من المحاولات الخاطئة. تم التوقيف لمدة ${failStatus.remainingSeconds} ثانية.`);
      } else {
        setSearchError(`لم يتم العثور على تلميذ بهذا الكود (${cleanQuery}). تأكد من صحة الكود.`);
      }
    }
  };

  const handleCopyRip = () => {
    navigator.clipboard.writeText(BARIDIMOB_CONFIG.ripNumber);
    setCopiedRip(true);
    setTimeout(() => setCopiedRip(false), 2500);
  };

  const handleAdminLogin = () => {
    localStorage.setItem('smart_notebook_is_admin_device', 'true');
    setIsAdminDevice(true);
    onGoogleSignIn(ADMIN_USER);
  };

  const handleAdminUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = adminEmailVerify.trim().toLowerCase();
    if (clean === ADMIN_EMAIL.toLowerCase() || clean === 'admin' || clean === 'djazil') {
      localStorage.setItem('smart_notebook_is_admin_device', 'true');
      setIsAdminDevice(true);
      setShowAdminUnlockModal(false);
      setAdminVerifyError(null);
      onGoogleSignIn(ADMIN_USER);
    } else {
      setAdminVerifyError('البريد غير متطابق مع بريد الإدارة (djazild@gmail.com).');
    }
  };

  // التسجيل والمزامنة المباشرة مع Firestore
  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;

    setIsSubmittingGoogle(true);
    const cleanEmail = customEmail.trim().toLowerCase();
    const name = customName.trim() || cleanEmail.split('@')[0];
    const isAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();

    if (isAdmin) {
      localStorage.setItem('smart_notebook_is_admin_device', 'true');
      setIsAdminDevice(true);
      setIsSubmittingGoogle(false);
      setShowGoogleModal(false);
      onGoogleSignIn({
        email: cleanEmail,
        name: 'الأستاذ المشرف djazild',
        isAdmin: true,
        isActive: true
      });
      return;
    }

    // حفظ طلب التفعيل في Firestore مباشرة لظهوره اللحظي بكنترول الأدمن
    await saveSubscriptionToFirestore({
      teacherEmail: cleanEmail,
      teacherName: name,
      phoneNumber: '',
      planId: '1year',
      status: 'pending',
      amountDZD: 5000,
      isLifetime: false,
      requestedAt: new Date().toISOString(),
      expiresAt: null
    });

    setIsSubmittingGoogle(false);
    setShowGoogleModal(false);

    // إظهار نافذة الانتظار والتنبيه
    setPendingModalUser({ email: cleanEmail, name });
  };

  const handleProceedPendingLogin = () => {
    if (!pendingModalUser) return;
    onGoogleSignIn({
      email: pendingModalUser.email,
      name: pendingModalUser.name,
      isAdmin: false,
      isActive: false
    });
    setPendingModalUser(null);
  };

  const calcAverage = (student: Student, hasTP: boolean) => {
    const cc = Math.max(0, Math.min(20, 10 + student.bonusPoints));
    let total = 0;
    let coeffs = 0;
    if (hasTP) {
      total = cc * 1 + (student.tpScore || 10) * 1 + student.test1 * 2 + student.exam * 3;
      coeffs = 7;
    } else {
      total = cc * 1 + student.test1 * 2 + student.exam * 3;
      coeffs = 6;
    }
    return Number((total / coeffs).toFixed(2));
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      
      {/* شريط التنقل العلوي المنظم */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          
          {/* شعار التطبيق */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/20">
              د
            </div>
            <div>
              <span className="font-black text-base sm:text-lg text-white block leading-tight">الدفتر الذكي للأستاذ</span>
              <span className="text-[10px] text-slate-400 block">منظومة بيداغوجية متكاملة للتعليم الثانوي</span>
            </div>
          </div>

          {/* تبويبات التنقل الرئيسية + زر الدخول */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('teachers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'teachers'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>قسم الأساتذة</span>
              </button>
              <button
                onClick={() => setActiveTab('parents')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'parents'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>فضاء الأولياء (بدون تسجيل)</span>
              </button>
            </div>

            {isAdminDevice ? (
              <button
                onClick={handleAdminLogin}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">لوحة الأدمن</span>
              </button>
            ) : (
              <button
                onClick={() => setShowGoogleModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>تسجيل / دخول Google</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي حسب التبويب المختار */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
        
        {/* ======================= قسم الأساتذة ======================= */}
        {activeTab === 'teachers' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* الهيدر البسيط المبسط */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>المنصة البيداغوجية المتكاملة 2026/2027</span>
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                دفتر الأستاذ الذكي
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                تسيير الأقسام والنتائج، حساب المعدلات الفصلية، متابعة الغيابات، وتوفير كشوف وملاحظات مباشرة لأولياء التلاميذ بكل سهولة ودقة.
              </p>
            </div>

            {/* بطاقة الدفع بريدي موب الحصرية المبرزة */}
            <div className="max-w-xl mx-auto bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-6 border border-blue-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <CreditCard className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-white">تفعيل الاشتراك عبر بريدي موب (BaridiMob)</h3>
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                  تفعيل سريح ومباشر
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  قم بتحويل مبلغ الاشتراك عبر رقم الحساب البريدي الموحد (RIP)، ثم سجل دخولك عبر Google ليصل حسابك تلقائياً للإدارة:
                </p>

                {/* رقم RIP الموحد البارز */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/40 flex items-center justify-between gap-2 shadow-inner">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-bold">رقم الحساب البريدي RIP:</span>
                    <span className="font-mono text-base sm:text-lg font-black text-blue-400 tracking-wider dir-ltr block">
                      00799999002093331792
                    </span>
                  </div>
                  <button
                    onClick={handleCopyRip}
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                    title="نسخ رقم RIP"
                  >
                    {copiedRip ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>نسخ RIP</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">رقم الحساب CCP:</span>
                    <span className="font-bold text-slate-200">0020933317 (المفتاح 92)</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">متابعة وتأكيد الواتساب:</span>
                    <a
                      href={`https://wa.me/${WHATSAPP_INTL_NUMBER}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-400 hover:underline flex items-center justify-center gap-1 dir-ltr"
                    >
                      <span>0656636033</span>
                      <MessageSquare className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => setShowGoogleModal(true)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>تسجيل حساب أستاذ جديد / دخول بحسابك</span>
                </button>
              </div>
            </div>

            {/* الميزات الأساسية باختصار شديد */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  1
                </div>
                <h4 className="text-xs font-bold text-white">إدارة الأقسام والنتائج</h4>
                <p className="text-[11px] text-slate-400">حساب فوري للمعدلات، تصدير ملفات Excel والرقمنة الرسمية.</p>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  2
                </div>
                <h4 className="text-xs font-bold text-white">رادار اليقظة والغيابات</h4>
                <p className="text-[11px] text-slate-400">تتبع الغيابات وتنبيهات فورية للتلاميذ وتنسيق مباشر مع الأولياء.</p>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  3
                </div>
                <h4 className="text-xs font-bold text-white">فضاء خاص بالأولياء</h4>
                <p className="text-[11px] text-slate-400">كود موحد لكل تلميذ للبحث عن النتائج دون الحاجة لتسجيل حساب.</p>
              </div>
            </div>

          </div>
        )}

        {/* ======================= قسم الأولياء (بدون تسجيل) ======================= */}
        {activeTab === 'parents' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Eye className="w-3.5 h-3.5" />
                <span>فضاء المتابعة المباشرة لأولياء الأمور</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                البحث عن نتائج وغيابات التلميذ
              </h2>
              <p className="text-xs text-slate-400">
                أدخل كود التلميذ الموحد المسلم من الأستاذ (مثال: BAC-8821) للاطلاع الفوري على النتائج والغيابات.
              </p>
            </div>

            {/* نموذج البحث */}
            <form onSubmit={handleParentSearch} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={parentCodeInput}
                  onChange={e => {
                    setParentCodeInput(e.target.value);
                    if (searchError) setSearchError(null);
                  }}
                  placeholder="أدخل الكود الموحد (مثال: BAC-8821 أو اسم التلميذ)"
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs font-mono uppercase focus:outline-none focus:border-emerald-500 shadow-inner"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>بحث</span>
                </button>
              </div>

              {searchError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{searchError}</span>
                </div>
              )}
            </form>

            {/* نتيجة البحث */}
            {searchedStudent && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-white">
                      {searchedStudent.student.lastName} {searchedStudent.student.firstName}
                    </h3>
                    <p className="text-xs text-emerald-400">
                      القسم: {searchedStudent.classInfo.name} ({searchedStudent.classInfo.level})
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                    {searchedStudent.student.parentCode}
                  </span>
                </div>

                {/* شبكة النقط والمعدل */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">التقويم المستمر</span>
                    <span className="font-bold text-slate-200">
                      {Math.max(0, Math.min(20, 10 + searchedStudent.student.bonusPoints))} / 20
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">الفرض الأول</span>
                    <span className="font-bold text-slate-200">{searchedStudent.student.test1} / 20</span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">الاختبار الفصلي</span>
                    <span className="font-bold text-slate-200">{searchedStudent.student.exam} / 20</span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40">
                    <span className="text-emerald-400 text-[10px] block font-bold">المعدل الفصلي</span>
                    <span className="font-black text-emerald-300 text-sm">
                      {calcAverage(searchedStudent.student, searchedStudent.classInfo.hasTP)} / 20
                    </span>
                  </div>
                </div>

                {/* سجل الغيابات والملاحظة */}
                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">عدد الغيابات المسجلة:</span>
                    <span className={`font-bold ${searchedStudent.student.absencesCount >= 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {searchedStudent.student.absencesCount} غيابات
                    </span>
                  </div>

                  {searchedStudent.student.remark && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                      <strong className="text-xs text-white block mb-1">ملاحظة الأستاذ التربوية:</strong>
                      <p>{searchedStudent.student.remark}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* نافذة تسجيل الدخول للأستاذ عبر Google */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="text-sm font-bold text-white">تسجيل / دخول الأستاذ عبر Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGoogleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  البريد الإلكتروني لحساب Google:
                </label>
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={e => setCustomEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم الأستاذ(ة) الكامل:
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="الأستاذ(ة) بن عيسى"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* تذكير رقم RIP داخل نموذج التسجيل */}
              <div className="p-3 bg-slate-950 rounded-xl border border-blue-500/30 text-[11px] space-y-1">
                <span className="text-slate-400 block font-bold">💳 تحويل الاشتراك عبر بريدي موب RIP:</span>
                <span className="font-mono text-blue-400 font-bold block dir-ltr">00799999002093331792</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoogle}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{isSubmittingGoogle ? 'جاري التسجيل...' : 'تأكيد التسجيل والدخول'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة المنبثقة: "حسابك قيد المراجعة" بعد التسجيل الجديد */}
      {pendingModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn text-right">
            
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">حسابك قيد المراجعة والتدقيق</h3>
                <p className="text-[11px] text-slate-400">{pendingModalUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              مرحباً بك يا <strong className="text-white">{pendingModalUser.name}</strong>! تم إرسال معلومات حسابك بنجاح إلى قاعدة البيانات ولوحة تحكم المشرف بانتظار التفعيل.
            </p>

            {/* تفاصيل بريدي موب وواتساب للمتابعة */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-blue-500/30 space-y-2 text-xs">
              <span className="text-slate-400 block font-bold text-[10px]">💳 رقم حساب بريدي موب (RIP):</span>
              <span className="font-mono text-blue-400 text-sm font-black block dir-ltr">00799999002093331792</span>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">أرسل وصل الدفع للمشرف عبر واتساب:</span>
                <a
                  href={`https://wa.me/${WHATSAPP_INTL_NUMBER}?text=${encodeURIComponent(
                    `السلام عليكم، قمت بالتسجيل في المنصة بحساب: ${pendingModalUser.email} وأود تأكيد التفعيل عبر بريدي موب.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>متابعة واتساب</span>
                </a>
              </div>
            </div>

            <button
              onClick={handleProceedPendingLogin}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              متابعة إلى الصفحة الرئيسية
            </button>
          </div>
        </div>
      )}

      {/* مدخل المشرف djazild@gmail.com */}
      {showAdminUnlockModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">التحقق من حساب المشرف</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminUnlockModal(false);
                  setAdminVerifyError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminUnlockSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  البريد الإلكتروني المعتمد للمشرف:
                </label>
                <input
                  type="text"
                  required
                  value={adminEmailVerify}
                  onChange={e => {
                    setAdminEmailVerify(e.target.value);
                    if (adminVerifyError) setAdminVerifyError(null);
                  }}
                  placeholder="djazild@gmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {adminVerifyError && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2 rounded-xl">
                  {adminVerifyError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminUnlockModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md transition"
                >
                  تفعيل ودخول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* التذييل البسيط */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <span>دفتر الأستاذ الذكي للتعليم الثانوي الجزائري • إصدار 2026/2027</span>
          {isAdminDevice && (
            <span className="font-mono text-emerald-400 text-xs flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>djazild@gmail.com</span>
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
