import React, { useState } from 'react';
import {
  GraduationCap, BookOpen, Users, BarChart3, ShieldCheck,
  Sparkles, Search, CheckCircle2, AlertTriangle,
  ArrowRight, Award, Clock, FileText, Check,
  LogIn, Eye, X, Lock, KeyRound,
  HeartHandshake, MessageSquare, Phone, Copy, ExternalLink, Calendar,
  CreditCard, Send, ChevronDown, ChevronUp, Maximize2, Minimize2
} from 'lucide-react';
import { Student, ClassGroup, AuthUser } from './types';
import { ParentPortalSecurity } from './services/parentSecurityService';
import realisticTeacherDeskBgImg from './assets/realistic_teacher_desk_bg.svg';
import happyTeacherNotebookImg from './assets/happy_teacher_notebook.svg';
import previewTimetableImg from './assets/preview_timetable.svg';
import previewAttendanceImg from './assets/preview_attendance.svg';
import previewGradesImg from './assets/preview_grades.svg';
import BrandLogo from './components/BrandLogo';
import {
  BARIDIMOB_CONFIG, WHATSAPP_CONTACT_NUMBER, WHATSAPP_INTL_NUMBER,
  ADMIN_EMAIL, createWhatsAppDirectReceiptLink,
  registerOrUpdateGoogleUser, verifyAndRedeemActivationCode
} from './services/subscriptionService';

interface LandingPageProps {
  classes: ClassGroup[];
  onGoogleSignIn: (user: AuthUser) => void;
  onOpenAdminPanel?: () => void;
}

export const ADMIN_USER: AuthUser = {
  email: 'djazild@gmail.com',
  name: 'الأستاذ المشرف djazild',
  isAdmin: true,
  isActive: true,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
};

export default function LandingPage({ classes, onGoogleSignIn, onOpenAdminPanel }: LandingPageProps) {
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
  const [loginActivationCode, setLoginActivationCode] = useState('');
  const [loginCodeError, setLoginCodeError] = useState<string | null>(null);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [copiedRip, setCopiedRip] = useState(false);

  // نافذة إشعار "حسابك قيد المراجعة" بعد التسجيل
  const [pendingModalUser, setPendingModalUser] = useState<{ email: string; name: string } | null>(null);
  const [pendingActivationCode, setPendingActivationCode] = useState('');
  const [pendingCodeFeedback, setPendingCodeFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isRedeemingPendingCode, setIsRedeemingPendingCode] = useState(false);

  // جهاز المشرف الأدمن
  const [isAdminDevice, setIsAdminDevice] = useState<boolean>(() => {
    return localStorage.getItem('smart_notebook_is_admin_device') === 'true';
  });
  const [showAdminUnlockModal, setShowAdminUnlockModal] = useState(false);
  const [adminEmailVerify, setAdminEmailVerify] = useState('');
  const [adminVerifyError, setAdminVerifyError] = useState<string | null>(null);

  // التحكم في فتح وإغلاق النوافذ التعريفية ومعاينة صور الدفتر
  const [showFloatingBadges, setShowFloatingBadges] = useState<boolean>(true);
  const [openWindows, setOpenWindows] = useState<Record<string, boolean>>({
    timetable: true,
    attendance: true,
    grades: true,
    ocr: true
  });
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string; subtitle: string } | null>(null);

  const toggleWindow = (key: string) => {
    setOpenWindows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllWindows = (open: boolean) => {
    setOpenWindows({
      timetable: open,
      attendance: open,
      grades: open,
      ocr: open
    });
  };

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

  const handleAdminButtonClick = () => {
    if (isAdminDevice) {
      if (onOpenAdminPanel) {
        onOpenAdminPanel();
      } else {
        onGoogleSignIn(ADMIN_USER);
      }
    } else {
      setShowAdminUnlockModal(true);
    }
  };

  const handleAdminLogin = () => {
    localStorage.setItem('smart_notebook_is_admin_device', 'true');
    setIsAdminDevice(true);
    onGoogleSignIn(ADMIN_USER);
  };

  const handleAdminUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = adminEmailVerify.trim().toLowerCase();
    if (clean === ADMIN_EMAIL.toLowerCase() || clean === 'admin' || clean === 'djazil' || clean === '2026') {
      localStorage.setItem('smart_notebook_is_admin_device', 'true');
      setIsAdminDevice(true);
      setShowAdminUnlockModal(false);
      setAdminVerifyError(null);
      if (onOpenAdminPanel) {
        onOpenAdminPanel();
      } else {
        onGoogleSignIn(ADMIN_USER);
      }
    } else {
      setAdminVerifyError('البريد غير متطابق مع بريد الإدارة (djazild@gmail.com).');
    }
  };

  // التسجيل والتحقق الذكي من حالة التفعيل في السحابة أو كود التفعيل الاحتياطي
  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;

    setLoginCodeError(null);
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

    // 1. إذا أدخل الأستاذ كود التفعيل الاحتياطي مباشرة في نافذة الدخول
    if (loginActivationCode.trim()) {
      const codeResult = await verifyAndRedeemActivationCode(cleanEmail, loginActivationCode, name);
      if (!codeResult.success) {
        setLoginCodeError(codeResult.message);
        setIsSubmittingGoogle(false);
        return;
      }
      setIsSubmittingGoogle(false);
      setShowGoogleModal(false);
      setLoginActivationCode('');
      onGoogleSignIn({
        email: cleanEmail,
        name: codeResult.subscription?.teacherName || name,
        isAdmin: false,
        isActive: true
      });
      return;
    }

    // 2. فحص حالة الأستاذ الحقيقية في السحابة (Firestore + Cloud Sync Store + Local) دون طمس حالة التفعيل السابقة
    const sub = await registerOrUpdateGoogleUser({
      email: cleanEmail,
      name
    });

    setIsSubmittingGoogle(false);
    setShowGoogleModal(false);

    // إذا كان الأستاذ مفعلاً مسبقاً، يدخل مباشرة إلى الدفتر اليومي دون نافذة الانتظار
    if (sub.status === 'active') {
      onGoogleSignIn({
        email: cleanEmail,
        name: sub.teacherName || name,
        isAdmin: false,
        isActive: true
      });
      return;
    }

    // إذا كان الحساب جديداً أو قيد المراجعة فعلياً، إظهار نافذة المتابعة
    setPendingActivationCode('');
    setPendingCodeFeedback(null);
    setPendingModalUser({ email: cleanEmail, name: sub.teacherName || name });
  };

  const handleRedeemCodeInPendingModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingModalUser || !pendingActivationCode.trim()) return;
    setIsRedeemingPendingCode(true);
    setPendingCodeFeedback(null);
    try {
      const res = await verifyAndRedeemActivationCode(
        pendingModalUser.email,
        pendingActivationCode,
        pendingModalUser.name
      );
      if (res.success) {
        setPendingCodeFeedback({ text: res.message, type: 'success' });
        const targetUser = pendingModalUser;
        setPendingModalUser(null);
        onGoogleSignIn({
          email: targetUser.email,
          name: res.subscription?.teacherName || targetUser.name,
          isAdmin: false,
          isActive: true
        });
      } else {
        setPendingCodeFeedback({ text: res.message, type: 'error' });
      }
    } finally {
      setIsRedeemingPendingCode(false);
    }
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
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between relative overflow-x-hidden">
      
      {/* صورة خلفية القسم الدراسي ومكتب الأستاذ محلية الصنع لضمان ظهورها دائماً بنسبة 100% دون حظر شبكي ودون التأثير على الكتابة والنوافذ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <img
          src={realisticTeacherDeskBgImg}
          alt="خلفية حقيقية لقسم دراسي ومكتب أستاذ منظم"
          className="w-full h-full object-cover object-center opacity-60 scale-100 transition-opacity duration-700"
        />
        {/* طبقات تدرج لوني داكنة مدروسة تضمن قراءة مثالية للنصوص وعدم التأثير على النوافذ المنبثقة */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(2,6,23,0.75)_100%)]" />
      </div>
      
      {/* شريط التنقل العلوي المتوافق كلياً مع شاشات الهاتف والحاسوب دون تكسير في الكلمات */}
      <header className="border-b border-white/10 bg-slate-950/85 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          
          {/* الصف العلوي في الهاتف: الشعار الرسمي يميناً + زر الدخول السريع يساراً */}
          <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
            <BrandLogo
              size="md"
              showText={true}
              subtitle="منظومة التعليم الثانوي بالجزائر"
              theme="dark"
            />

            {/* زر الدخول السريع في الهاتف */}
            <div className="flex sm:hidden items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-600/30 whitespace-nowrap cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>دخول الأستاذ</span>
              </button>
            </div>
          </div>

          {/* الصف الثاني في الهاتف (أو الجانب الأيسر في الحاسوب): تبويبات واضحة بعرض متناسق دون تكسير النصوص */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <div className="bg-slate-900/95 p-1 rounded-xl border border-slate-800 grid grid-cols-2 sm:flex items-center gap-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('teachers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'teachers'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>قسم الأساتذة</span>
              </button>
              <button
                onClick={() => setActiveTab('parents')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'parents'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>فضاء الأولياء</span>
              </button>
            </div>

            {/* زر الدخول على الشاشات المتوسطة والكبيرة */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-600/30 whitespace-nowrap cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>تسجيل / دخول Google</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي حسب التبويب المختار */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
        
        {/* ======================= قسم الأساتذة (مرتب بعناية مع صورة الأستاذ السعيد) ======================= */}
        {activeTab === 'teachers' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* 1. القسم الترحيبي الرئيسي (Hero Split Layout): النص والأزرار يميناً + صورة الأستاذ يستعمل الدفتر الذكي بسعادة يساراً */}
            <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 border border-white/10 bg-slate-900/65 backdrop-blur-2xl shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* العمود الأيمن: العنوان، الوصف، وأزرار الانطلاق السريع */}
                <div className="lg:col-span-7 text-right space-y-5">
                  <div className="inline-flex items-center gap-2 text-blue-400 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>المنظومة البيداغوجية للتعليم الثانوي بالجزائر · 2026/2027</span>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                      الدفتر اليومي الذكي للأستاذ — درّس بسعادة وربح للوقت
                    </h1>
                    <p className="text-xs sm:text-base text-slate-300 leading-relaxed font-normal max-w-xl">
                      وداعاً لعناء الأوراق والحسابات اليدوية. استخرج قوائم تلاميذك بالمسح الضوئي الذكي (OCR) مع مراجعة يدوية فورية، رتّب مقاعد القسم بالسحب والإفلات، وارصد النقاط والغيابات بلمسة واحدة.
                    </p>
                  </div>

                  {/* الزران الرئيسيان البارزان */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 max-w-lg">
                    <button
                      type="button"
                      onClick={() => setShowGoogleModal(true)}
                      className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 border border-blue-400/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer min-h-[52px]"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>دخول الأستاذ عبر Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('parents')}
                      className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 border border-emerald-400/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer min-h-[52px]"
                    >
                      <Eye className="w-5 h-5 shrink-0 text-emerald-200" />
                      <span>فضاء ولي الأمر بالكود</span>
                    </button>
                  </div>

                  {/* مؤشرات الثقة النصية النظيفة */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
                    <span className="text-emerald-400 font-bold">✓ مسح ذكي للقوائم OCR</span>
                    <span aria-hidden="true">·</span>
                    <span>مخطط جلوس بالسحب والإفلات</span>
                    <span aria-hidden="true">·</span>
                    <span>حفظ سحابي فوري Firestore</span>
                  </div>
                </div>

                {/* العمود الأيسر: صورة الأستاذ السعيد مع إمكانية إظهار/إخفاء البطاقات العائمة */}
                <div className="lg:col-span-5 relative py-3 sm:py-5 px-1 sm:px-3">
                  <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-slate-950/85 shadow-2xl group">
                    <img
                      src={happyTeacherNotebookImg}
                      onClick={() => setLightboxImage({
                        src: happyTeacherNotebookImg,
                        title: 'الدفتر الذكي للأستاذ داخل القسم',
                        subtitle: 'مسح القوائم OCR، جدول التوقيت الأسبوعي، ومخطط المقاعد التفاعلي'
                      })}
                      alt="أستاذ يستعمل الدفتر الذكي بسعادة وراحة داخل القسم"
                      className="w-full h-auto object-cover cursor-pointer group-hover:scale-[1.02] transition-transform duration-500"
                    />
                    <div className="p-3 bg-slate-900/95 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-white truncate">أستاذ يستعمل الدفتر الذكي بسعادة</span>
                      <button
                        type="button"
                        onClick={() => setShowFloatingBadges(prev => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-300 font-bold text-[10px] transition flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {showFloatingBadges ? (
                          <>
                            <Minimize2 className="w-3 h-3" />
                            <span>إخفاء البطاقات</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3 h-3" />
                            <span>إظهار البطاقات</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* نافذة عائمة زجاجية 1 (أعلى اليمين) قابلة للفتح والإغلاق */}
                  {showFloatingBadges && (
                    <div className="hidden sm:flex absolute -top-3 -right-2 z-20 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/25 p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] items-center gap-2.5 max-w-[235px] transition-all duration-300 hover:scale-105 hover:border-emerald-400/50">
                      <div
                        onClick={() => setLightboxImage({
                          src: previewTimetableImg,
                          title: 'جدول التوقيت الأسبوعي الذكي',
                          subtitle: 'ربط آلي بالحصة الجارية وتنبيه قبل نهاية الحصة'
                        })}
                        className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 font-black text-xs cursor-pointer"
                      >
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div
                        onClick={() => setLightboxImage({
                          src: previewTimetableImg,
                          title: 'جدول التوقيت الأسبوعي الذكي',
                          subtitle: 'ربط آلي بالحصة الجارية وتنبيه قبل نهاية الحصة'
                        })}
                        className="text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[11px] font-black text-white">جدول التوقيت الذكي</span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-0.5">الأحد 08:00 • 3 ع ت 1 (قاعة 12)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFloatingBadges(false)}
                        className="text-slate-400 hover:text-white p-1"
                        title="إغلاق البطاقة العائمة"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* نافذة عائمة زجاجية 2 (أسفل اليسار) قابلة للفتح والإغلاق */}
                  {showFloatingBadges && (
                    <div className="hidden sm:flex absolute -bottom-3 -left-2 z-20 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/25 p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] items-center gap-2.5 max-w-[245px] transition-all duration-300 hover:scale-105 hover:border-blue-400/50">
                      <div
                        onClick={() => setLightboxImage({
                          src: previewGradesImg,
                          title: 'كشف النقاط والتقويم المستمر الآلي',
                          subtitle: 'حساب المعدلات الفورية والأعمال المخبرية TP'
                        })}
                        className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 font-mono font-black text-xs cursor-pointer"
                      >
                        16.5
                      </div>
                      <div
                        onClick={() => setLightboxImage({
                          src: previewGradesImg,
                          title: 'كشف النقاط والتقويم المستمر الآلي',
                          subtitle: 'حساب المعدلات الفورية والأعمال المخبرية TP'
                        })}
                        className="text-right cursor-pointer"
                      >
                        <div className="text-[11px] font-black text-white">بن عيسى أمين • الفرض 1</div>
                        <p className="text-[10px] text-emerald-300 font-bold mt-0.5">+2 مشاركة • كود الولي: BAC-8821</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFloatingBadges(false)}
                        className="text-slate-400 hover:text-white p-1"
                        title="إغلاق البطاقة العائمة"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* 1.5 معرض صور ونوافذ الدفتر التفاعلية (تفتح وتغلق بحرية + تكبير الصور مثل جدول التوقيت والحضور والنقاط) */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <span className="text-[11px] font-bold text-blue-400 block">صور ونوافذ تعريفية من داخل الدفتر</span>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    استعرض صور جدول التوقيت، الحضور، كشف النقاط، ومراجعة OCR (تفتح وتغلق)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllWindows(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30 text-blue-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>فتح كل النوافذ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllWindows(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>طي الكل</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* النافذة التعريفية 1: صورة جدول التوقيت الأسبوعي الذكي */}
                <div className="rounded-3xl bg-slate-900/70 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden transition-all duration-300 hover:border-blue-400/40">
                  <div
                    onClick={() => toggleWindow('timetable')}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-slate-900/50 hover:bg-slate-900/80 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <Calendar className="w-4 h-4 text-blue-400 mr-1" />
                      <h3 className="text-xs sm:text-sm font-black text-white">1. جدول التوقيت الأسبوعي الذكي</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-300 bg-blue-500/15 border border-blue-400/30 px-2 py-0.5 rounded-md">
                        {openWindows.timetable ? 'مفتوحة' : 'مغلقة'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWindow('timetable');
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 transition"
                        title={openWindows.timetable ? 'إغلاق النافذة' : 'فتح النافذة'}
                      >
                        {openWindows.timetable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {openWindows.timetable && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-white/10 space-y-3 animate-fadeIn">
                      <div
                        onClick={() => setLightboxImage({
                          src: previewTimetableImg,
                          title: 'صورة جدول التوقيت الأسبوعي الذكي من الدفتر',
                          subtitle: 'يتعرف الدفتر تلقائياً على الحصة الجارية ويفتح قائمة القسم الموافق للتوقيت'
                        })}
                        className="relative rounded-2xl overflow-hidden border border-white/15 bg-slate-950 cursor-pointer group"
                      >
                        <img
                          src={previewTimetableImg}
                          alt="صورة جدول التوقيت الأسبوعي من الدفتر"
                          className="w-full h-48 sm:h-56 object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                          <span className="text-[11px] font-bold text-white">انقر لتكبير صورة جدول التوقيت</span>
                          <span className="px-2.5 py-1 rounded-lg bg-blue-600/90 text-white text-[10px] font-bold flex items-center gap-1">
                            <Maximize2 className="w-3 h-3" />
                            <span>تكبير الصورة</span>
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        برمج جدول توقيتك الأسبوعي مرة واحدة (دروس، أعمال مخبرية TP ف1/ف2، واستدراك) ليفتح لك الدفتر القسم الحالي تلقائياً فور دخولك القاعة.
                      </p>
                    </div>
                  )}
                </div>

                {/* النافذة التعريفية 2: صورة واجهة الحضور ومخطط مقاعد القسم */}
                <div className="rounded-3xl bg-slate-900/70 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden transition-all duration-300 hover:border-emerald-400/40">
                  <div
                    onClick={() => toggleWindow('attendance')}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-slate-900/50 hover:bg-slate-900/80 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <Users className="w-4 h-4 text-emerald-400 mr-1" />
                      <h3 className="text-xs sm:text-sm font-black text-white">2. مخطط مقاعد القسم وتسجيل الحضور</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 rounded-md">
                        {openWindows.attendance ? 'مفتوحة' : 'مغلقة'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWindow('attendance');
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 transition"
                        title={openWindows.attendance ? 'إغلاق النافذة' : 'فتح النافذة'}
                      >
                        {openWindows.attendance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {openWindows.attendance && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-white/10 space-y-3 animate-fadeIn">
                      <div
                        onClick={() => setLightboxImage({
                          src: previewAttendanceImg,
                          title: 'صورة واجهة الحضور والغياب ومخطط الجلوس',
                          subtitle: 'سحب وإفلات لتبديل المقاعد مع تسجيل الغياب والمشاركة بلمسة واحدة'
                        })}
                        className="relative rounded-2xl overflow-hidden border border-white/15 bg-slate-950 cursor-pointer group"
                      >
                        <img
                          src={previewAttendanceImg}
                          alt="صورة واجهة الحضور ومخطط الجلوس من الدفتر"
                          className="w-full h-48 sm:h-56 object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                          <span className="text-[11px] font-bold text-white">انقر لتكبير صورة واجهة الحضور</span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1">
                            <Maximize2 className="w-3 h-3" />
                            <span>تكبير الصورة</span>
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        رتّب طاولات القسم بالسحب والإفلات (Drag & Drop) مع حفظ فوري في السحابة، وسجّل الغياب أو التأخر أو نقاط المشاركة الإضافية بلمسة واحدة.
                      </p>
                    </div>
                  )}
                </div>

                {/* النافذة التعريفية 3: صورة كشف النقاط والتقويم المستمر */}
                <div className="rounded-3xl bg-slate-900/70 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden transition-all duration-300 hover:border-indigo-400/40">
                  <div
                    onClick={() => toggleWindow('grades')}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-slate-900/50 hover:bg-slate-900/80 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <BarChart3 className="w-4 h-4 text-indigo-400 mr-1" />
                      <h3 className="text-xs sm:text-sm font-black text-white">3. كشف النقاط الآلي ومتابعة الأولياء</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-400/30 px-2 py-0.5 rounded-md">
                        {openWindows.grades ? 'مفتوحة' : 'مغلقة'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWindow('grades');
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 transition"
                        title={openWindows.grades ? 'إغلاق النافذة' : 'فتح النافذة'}
                      >
                        {openWindows.grades ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {openWindows.grades && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-white/10 space-y-3 animate-fadeIn">
                      <div
                        onClick={() => setLightboxImage({
                          src: previewGradesImg,
                          title: 'صورة كشف النقاط والتقويم المستمر الآلي',
                          subtitle: 'حساب آلي للمعدلات الفصلية وتصدير الكشوف الرسمية'
                        })}
                        className="relative rounded-2xl overflow-hidden border border-white/15 bg-slate-950 cursor-pointer group"
                      >
                        <img
                          src={previewGradesImg}
                          alt="صورة كشف النقاط من الدفتر"
                          className="w-full h-48 sm:h-56 object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                          <span className="text-[11px] font-bold text-white">انقر لتكبير صورة كشف النقاط</span>
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-600/90 text-white text-[10px] font-bold flex items-center gap-1">
                            <Maximize2 className="w-3 h-3" />
                            <span>تكبير الصورة</span>
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        حساب فوري للمعدلات حسب المعاملات الرسمية مع تحديد التلاميذ المحتاجين للاستدراك، ومشاركة النتائج مع الأولياء عبر كود التلميذ (`BAC-8821`).
                      </p>
                    </div>
                  )}
                </div>

                {/* النافذة التعريفية 4: واجهة المراجعة اليدوية لقوائم التلاميذ بعد المسح الضوئي OCR */}
                <div className="rounded-3xl bg-slate-900/70 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden transition-all duration-300 hover:border-amber-400/40">
                  <div
                    onClick={() => toggleWindow('ocr')}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-slate-900/50 hover:bg-slate-900/80 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <Sparkles className="w-4 h-4 text-amber-400 mr-1" />
                      <h3 className="text-xs sm:text-sm font-black text-white">4. المسح الضوئي OCR والمراجعة اليدوية</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-md">
                        {openWindows.ocr ? 'مفتوحة' : 'مغلقة'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWindow('ocr');
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 transition"
                        title={openWindows.ocr ? 'إغلاق النافذة' : 'فتح النافذة'}
                      >
                        {openWindows.ocr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {openWindows.ocr && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-white/10 space-y-3 animate-fadeIn">
                      <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-white/10 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="font-bold text-emerald-400">✓ تم استخراج 34 تلميذاً من الصورة</span>
                          <span className="text-[10px] text-slate-400">تعديل يدوي قبل الحفظ</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <div>
                            <span className="font-black text-white block">1. بوعلام سارة</span>
                            <span className="text-[10px] text-slate-400">تاريخ الميلاد: 2009/04/12</span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 border border-blue-400/30 px-2.5 py-1 rounded-lg">
                            فوج 1 ✎
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <div>
                            <span className="font-black text-white block">2. منصوري ياسين</span>
                            <span className="text-[10px] text-slate-400">تاريخ الميلاد: 2009/09/23</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-1 rounded-lg">
                            فوج 2 ✎
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        ارفع صورة قائمة القسم ليقرأها الذكاء الاصطناعي مع شريط تقدم تفاعلي، ثم راجع وعدّل الأسماء والأفواج يدوياً قبل اعتمادها في القسم.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. شريط الركائز البيداغوجية الثلاث (مرتبة بوضوح قبل تفاصيل الدفع) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 space-y-2 text-right">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">01. مسح القوائم OCR مع المراجعة اليدوية</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  صوّر قائمة القسم الورقية ليقرأها الذكاء الاصطناعي فوراً، ثم راجع وعدّل الأسماء والأفواج يدوياً قبل اعتمادها.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 space-y-2 text-right">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">02. مخطط جلوس تفاعلي بالسحب والإفلات</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  اسحب وأفلت بطاقة أي تلميذ لتغيير مقعده في القسم مع حفظ فوري في Firestore وتسجيل الغيابات بلمسة.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 space-y-2 text-right">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">03. تقويم مستمر وتنسيق مع الأولياء</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  حساب آلي للمعدلات، كشف التلاميذ المحتاجين للاستدراك، ومشاركة التقارير مع الأولياء عبر الكود الموحد.
                </p>
              </div>
            </div>

            {/* 3. بطاقة التفعيل والاشتراك عبر بريدي موب (BaridiMob) في أسفل الصفحة بترتيب هادئ */}
            <div className="rounded-3xl bg-slate-900/75 border border-slate-800 p-5 sm:p-7 text-right">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                    <CreditCard className="w-4 h-4" />
                    <span>تفعيل الحساب عبر بريدي موب (BaridiMob)</span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    خطوة واحدة لتفعيل دفترك اليومي مدى الحياة
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    انسخ رقم الحساب البريدي الموحد (RIP) وأرسل وصل الدفع عبر واتساب الإدارة ليتم تفعيل حسابك فوراً.
                  </p>
                </div>

                <div className="lg:col-span-7 space-y-3">
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-blue-500/30 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 block font-bold">رقم الحساب البريدي الموحد RIP:</span>
                      <span className="font-mono text-sm sm:text-base font-black text-blue-400 tracking-wider dir-ltr block">
                        {BARIDIMOB_CONFIG.ripNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyRip}
                      className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                      title="نسخ رقم RIP"
                    >
                      {copiedRip ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ RIP</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-center text-xs">
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">رقم الحساب CCP:</span>
                      <span className="font-bold text-slate-200">0020933317 (مفتاح 92)</span>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">تأكيد الوصل عبر WhatsApp:</span>
                      <a
                        href={`https://wa.me/${WHATSAPP_INTL_NUMBER}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-emerald-400 hover:underline flex items-center justify-center gap-1 dir-ltr text-xs"
                      >
                        <span>0656636033</span>
                        <MessageSquare className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ======================= قسم الأولياء (بدون تسجيل) ======================= */}
        {activeTab === 'parents' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <BrandLogo size="lg" showText={false} />
              </div>
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
              <div className="flex items-center gap-2.5 min-w-0">
                <BrandLogo size="sm" showText={false} />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white truncate">تسجيل / دخول الأستاذ عبر Google</h3>
                  <span className="text-[10px] text-slate-400 block truncate">الدفتر اليومي الذكي للأستاذ</span>
                </div>
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

              {/* حقل اختياري لإدخال كود التفعيل الاحتياطي للدخول الفوري */}
              <div className="p-3 bg-slate-950/90 rounded-xl border border-emerald-500/30 space-y-1.5">
                <label className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                  <span className="flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>لديك كود تفعيل من الإدارة؟ (اختياري)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">يفتح الدفتر فوراً</span>
                </label>
                <input
                  type="text"
                  value={loginActivationCode}
                  onChange={e => {
                    setLoginActivationCode(e.target.value.toUpperCase());
                    if (loginCodeError) setLoginCodeError(null);
                  }}
                  placeholder="DFTR-XXXX-XXXX"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-emerald-300 text-xs font-mono tracking-wider uppercase dir-ltr text-center focus:outline-none focus:border-emerald-500"
                />
                {loginCodeError && (
                  <p className="text-[11px] text-rose-400 font-bold">{loginCodeError}</p>
                )}
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
                  <span>{isSubmittingGoogle ? 'جاري التحقق من التفعيل...' : 'تأكيد التسجيل والدخول'}</span>
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
              <BrandLogo size="sm" showText={false} />
              <div className="min-w-0">
                <h3 className="text-base font-black text-white">حسابك قيد المراجعة والتدقيق</h3>
                <p className="text-[11px] text-slate-400 truncate font-mono">{pendingModalUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              مرحباً بك يا <strong className="text-white">{pendingModalUser.name}</strong>! تم تسجيل طلبك بنجاح. إذا استلمت كود التفعيل من الإدارة يمكنك إدخاله بالأسفل لفتح الدفتر فوراً.
            </p>

            {/* بطاقة التفعيل الفوري بالكود داخل نافذة المراجعة */}
            <form onSubmit={handleRedeemCodeInPendingModal} className="p-3.5 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <KeyRound className="w-3.5 h-3.5" />
                <span>تفعيل فوري بكود التفعيل الاحتياطي:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pendingActivationCode}
                  onChange={e => {
                    setPendingActivationCode(e.target.value.toUpperCase());
                    if (pendingCodeFeedback) setPendingCodeFeedback(null);
                  }}
                  placeholder="DFTR-XXXX-XXXX"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 text-xs font-mono uppercase tracking-wider dir-ltr text-center focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isRedeemingPendingCode || !pendingActivationCode.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isRedeemingPendingCode ? 'جارٍ...' : 'تفعيل الآن'}
                </button>
              </div>
              {pendingCodeFeedback && (
                <p className={`text-[11px] font-bold ${pendingCodeFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pendingCodeFeedback.text}
                </p>
              )}
            </form>

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
              متابعة إلى صفحة انتظار التفعيل
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

      {/* نافذة تكبير ومعاينة صور الدفتر بالحجم الكامل (جدول التوقيت، الحضور، النقاط) */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-white/20 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-0"
          >
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-950/60">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">{lightboxImage.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{lightboxImage.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
                <span>إغلاق المعاينة</span>
              </button>
            </div>
            <div className="p-3 sm:p-6 bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="w-full h-auto max-h-[68vh] object-contain rounded-2xl border border-white/10"
              />
            </div>
          </div>
        </div>
      )}

      {/* التذييل البسيط */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-900/60 backdrop-blur-md py-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <BrandLogo
            size="xs"
            showText={true}
            subtitle="للتعليم الثانوي الجزائري • إصدار 2026/2027"
            theme="dark"
          />
          <div className="text-[11px] text-slate-400">
            منصة الدفتر اليومي الذكي للأستاذ • جميع الحقوق محفوظة
          </div>
        </div>
      </footer>
    </div>
  );
}
