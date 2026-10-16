import React, { useState } from 'react';
import {
  GraduationCap, BookOpen, Users, BarChart3, ShieldCheck,
  Sparkles, Search, CheckCircle2, AlertTriangle, Printer,
  ArrowRight, Award, Clock, FileText, Check, HelpCircle,
  TrendingUp, Calendar, LogIn, Eye, X, Lock, KeyRound,
  HeartHandshake, MessageSquare, Phone
} from 'lucide-react';
import { Student, ClassGroup, AuthUser } from './types';
import { ParentPortalSecurity } from './services/parentSecurityService';

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
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<{ student: Student; classInfo: ClassGroup } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);
  const [showCustomGoogleModal, setShowCustomGoogleModal] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  // حالة التعرف على جهاز المشرف (يظهر للأدمن فقط)
  const [isAdminDevice, setIsAdminDevice] = useState<boolean>(() => {
    return localStorage.getItem('smart_notebook_is_admin_device') === 'true';
  });
  const [showAdminUnlockModal, setShowAdminUnlockModal] = useState(false);
  const [adminEmailVerify, setAdminEmailVerify] = useState('');
  const [adminVerifyError, setAdminVerifyError] = useState<string | null>(null);

  // استخراج قائمة جميع التلاميذ مع أقسامهم للبحث السريع
  const allStudents = classes.flatMap(cls =>
    cls.students.map(st => ({ student: st, classInfo: cls }))
  );

  // دالة البحث عن التلميذ بالكود مع الحماية من التخمين
  const handleParentSearch = (codeToSearch?: string) => {
    const lockout = ParentPortalSecurity.checkLockout();
    if (lockout.isLocked) {
      setLockoutTimer(lockout.remainingSeconds);
      setSearchError(`⚠️ تم حظر البحث مؤقتاً لحماية خصوصية التلاميذ بسبب تعدد المحاولات الخاطئة. يرجى الانتظار ${lockout.remainingSeconds} ثانية.`);
      setSearchedStudent(null);
      return;
    }

    const raw = codeToSearch || parentCodeInput;
    const cleanQuery = ParentPortalSecurity.sanitizeCode(raw);

    if (!cleanQuery) {
      setSearchError('يرجى إدخال الكود الموحد للتلميذ أولاً (مثال: BAC-8821)');
      setSearchedStudent(null);
      return;
    }

    const found = allStudents.find(
      item => item.student.parentCode.trim().toUpperCase() === cleanQuery
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
        setSearchError(`⚠️ تجاوزت الحد المسموح به من المحاولات الخاطئة (5 محاولات). تم تفعيل الحظر الأمني لمدة ${failStatus.remainingSeconds} ثانية لحماية بيانات التلاميذ.`);
      } else {
        setSearchError(`لم يتم العثور على تلميذ يحمل الكود (${cleanQuery}). تأكد من كتابة الكود بشكل صحيح.`);
      }
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
    if (clean === 'djazild@gmail.com' || clean === 'admin' || clean === 'djazil') {
      localStorage.setItem('smart_notebook_is_admin_device', 'true');
      setIsAdminDevice(true);
      setShowAdminUnlockModal(false);
      setAdminVerifyError(null);
      onGoogleSignIn(ADMIN_USER);
    } else {
      setAdminVerifyError('البريد الإلكتروني غير متطابق مع حساب الإدارة المعتمد.');
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    const cleanEmail = customEmail.trim().toLowerCase();
    const isAdmin = cleanEmail === 'djazild@gmail.com';
    if (isAdmin) {
      localStorage.setItem('smart_notebook_is_admin_device', 'true');
      setIsAdminDevice(true);
    }
    const name = customName.trim() || cleanEmail.split('@')[0];
    onGoogleSignIn({
      email: cleanEmail,
      name: isAdmin ? 'الأستاذ المشرف djazild' : name,
      isAdmin,
      isActive: true
    });
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
      {/* شريط التنقل العلوي المتجاوب للهواتف والحواسيب */}
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg sm:text-xl shadow-md shadow-blue-500/25 shrink-0">
              د
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm sm:text-lg text-white block truncate">دفتر الأستاذ الذكي</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block -mt-0.5 truncate hidden sm:block">التعليم الثانوي الجزائري</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={() => {
                const el = document.getElementById('parent-box');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-1 min-h-[38px]"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>فضاء الأولياء</span>
            </button>

            {isAdminDevice ? (
              <button
                onClick={handleAdminLogin}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] sm:text-xs font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer min-h-[38px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-200 shrink-0" />
                <span>دخول الأدمن</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCustomGoogleModal(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-bold px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer min-h-[38px]"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>دخول الأستاذ <span className="hidden sm:inline">عبر Google</span></span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي البسيط والمباشر */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10 flex-1">
        {/* هيدر بسيط وجذاب */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>الدفتر الرقمي المتكامل للأستاذ وأولياء الأمور</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            دفتر الأستاذ الذكي
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            إدارة شاملة للأقسام، حجز النقاط والغيابات وفق المعايير الوزارية، مع استعلام فوري ومجاني لأولياء الأمور عبر الكود السري.
          </p>
        </div>

        {/* البوكسين الأساسيين: بوابة الأولياء + بوابة الأستاذ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* البوكس 1: بوابة أولياء التلاميذ بالكود السري (مجانية ومباشرة) */}
          <div id="parent-box" className="bg-slate-900 rounded-3xl border border-emerald-500/30 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">بوابة فضاء الأولياء</h3>
                    <p className="text-[11px] text-slate-400">استعلام فوري مباشر دون حساب أو كلمة مرور</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  مجاني 100%
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                اكتب الكود الموحد للتلميذ المسلم من المؤسسة للاطلاع المباشر على النتائج، سجل المواظبة، وتوصيات الأستاذ:
              </p>

              {/* حقل إدخال الكود */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={parentCodeInput}
                      onChange={e => {
                        setParentCodeInput(e.target.value.toUpperCase());
                        if (searchError) setSearchError(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleParentSearch();
                      }}
                      placeholder="مثال: BAC-8821"
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-500 uppercase transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleParentSearch()}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>استعلام</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {searchError && (
                  <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{searchError}</span>
                  </div>
                )}

                {/* أكواد تجريبية جاهزة */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 block mb-1">أكواد تجريبية جاهزة للنقر المباشر:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { code: 'BAC-8821', name: 'أمين بن عيسى' },
                      { code: 'BAC-4910', name: 'سارة بلقاسم' },
                      { code: 'BAC-3319', name: 'ياسين مراد' }
                    ].map(item => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setParentCodeInput(item.code);
                          handleParentSearch(item.code);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 hover:text-emerald-300 font-mono transition flex items-center gap-1"
                      >
                        <span className="font-bold">{item.code}</span>
                        <span className="text-[10px] text-slate-400 font-sans">({item.name})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>دون أي رسوم أو تسجيل دخول</span>
              </span>
              <span>محمي برمز سري</span>
            </div>
          </div>

          {/* البوكس 2: بوابة دخول الأساتذة والاشتراكات */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                    <LogIn className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">دفتر الأستاذ البيداغوجي</h3>
                    <p className="text-[11px] text-slate-400">تسجيل الدخول وإدارة الفصول</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30">
                  Google SSO
                </span>
              </div>

              {/* بطاقة الأدمن إن كان جهاز المشرف */}
              {isAdminDevice && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>حساب المشرف العام المعتمد</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('smart_notebook_is_admin_device');
                        setIsAdminDevice(false);
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-400 transition underline"
                    >
                      إخفاء
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdminLogin}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-cyan-200" />
                    <span>⚡ الدخول الفوري بحساب الإدارة</span>
                  </button>
                </div>
              )}

              {/* زر دخول الأستاذ عبر Google */}
              <button
                type="button"
                onClick={() => setShowCustomGoogleModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/20 transition cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>تسجيل الدخول بحساب Google للأستاذ</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span>تفعيل آمن وتخزين دائم لبيانات الأستاذ</span>
              {!isAdminDevice && (
                <button
                  type="button"
                  onClick={() => setShowAdminUnlockModal(true)}
                  className="text-slate-500 hover:text-slate-300 text-[10px] flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>دخول الإدارة</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* عرض تفاصيل التلميذ للأولياء عند كتابة الكود */}
        {searchedStudent && (
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-md">
                  {searchedStudent.student.firstName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      {searchedStudent.student.lastName} {searchedStudent.student.firstName}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      كود: {searchedStudent.student.parentCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    القسم: <strong className="text-white">{searchedStudent.classInfo.name}</strong> • المستوى: {searchedStudent.classInfo.level} • الفوج: {searchedStudent.student.group} • طاولة #{searchedStudent.student.seatIndex + 1}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>طباعة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchedStudent(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1 border border-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>إغلاق</span>
                </button>
              </div>
            </div>

            {/* إحصائيات التلميذ السريعة */}
            {(() => {
              const avg = calcAverage(searchedStudent.student, searchedStudent.classInfo.hasTP);
              const cc = Math.max(0, Math.min(20, 10 + searchedStudent.student.bonusPoints));
              const isWarning = searchedStudent.student.absencesCount >= 3;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">المعدل الفصلي التقديري</span>
                    <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                      {avg} <span className="text-xs text-slate-400">/ 20</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">التقويم المستمر</span>
                    <div className="text-xl font-black text-blue-400 font-mono mt-0.5">
                      {cc} <span className="text-xs text-slate-400">/ 20</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">سجل الغيابات</span>
                    <div className={`text-xl font-black font-mono mt-0.5 ${isWarning ? 'text-rose-400' : 'text-slate-200'}`}>
                      {searchedStudent.student.absencesCount} غياب
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">حالة الحضور الراهنة</span>
                    <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> حاضر بالقسم
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* التنسيق مع الولي والتوصيات */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/30 space-y-3">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-indigo-400" />
                <span>توصيات وملاحظات الأستاذ الموجهة للولي في مادة القسم:</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-indigo-300 font-bold block text-[11px]">توصيات المتابعة في البيت:</span>
                  <p className="text-slate-300 leading-relaxed">
                    {searchedStudent.student.parentRecommendations || 'الحرص على حل التمارين التطبيقية بانتظام والمراجعة الأسبوعية لتثبيت المفاهيم.'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-blue-300 font-bold block text-[11px]">ملاحظات المستوى والسلوك:</span>
                  <p className="text-slate-300 leading-relaxed">
                    {searchedStudent.student.parentNotes || searchedStudent.student.remark || 'تلميذ مواظب، مشاركة إيجابية في الأنشطة الصفية.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4 مميزات رئيسية مختصرة وأنيقة فقط */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">دفتر المتابعة والتقويم</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              حجز النقاط، حساب المعدلات آلياً، ومطابقة تامة مع الرقمنة الوزارية.
            </p>
          </div>

          <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">التنسيق مع الأولياء</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              كود سري لكل تلميذ وتوصيات مباشرة للولي دون وسائط معقدة.
            </p>
          </div>

          <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">جدول التوقيت والحصص</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              جدول أسبوعي تفاعلي، عرض توقيت كل قسم لوحده، وتسجيل ملاحظات الحصص.
            </p>
          </div>

          <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">الرسومات البيانية</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              مدرج تكراري للنتائج، مقارنة الأفواج 1 و 2، ورادار متابعة الغيابات.
            </p>
          </div>
        </div>
      </main>

      {/* نافذة تسجيل الدخول للأستاذ عبر Google */}
      {showCustomGoogleModal && (
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
                <h3 className="text-sm font-bold text-white">تسجيل دخول الأستاذ عبر Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomGoogleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomGoogleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  البريد الإلكتروني لحساب Google:
                </label>
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={e => setCustomEmail(e.target.value)}
                  placeholder="teacher@gmail.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم الأستاذ(ة):
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="الأستاذ بن عيسى"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* حسابات سريعة للتجربة والتحقق */}
              <div className="pt-1 border-t border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 block">⚡ حسابات جاهزة لتجربة الاشتراك والتحقق:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomEmail('hdjazil95@gmail.com');
                      setCustomName('أ. عبد الجليل (hdjazil95)');
                    }}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-right text-[11px] transition col-span-2"
                  >
                    <strong className="block text-white flex items-center justify-between">
                      <span>أ. عبد الجليل (حساب مفعل جاهز)</span>
                      <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">مفعل 1 سنة</span>
                    </strong>
                    <span className="text-[10px] text-slate-400 font-mono">hdjazil95@gmail.com</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomEmail('prof.karim.dz@gmail.com');
                      setCustomName('أ. كريم المنصوري');
                    }}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-right text-[11px] transition"
                  >
                    <strong className="block text-white">أ. كريم (قيد المراجعة)</strong>
                    <span className="text-[10px] text-slate-400 font-mono">prof.karim.dz@gmail.com</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomEmail('droidy.dz@gmail.com');
                      setCustomName('أ. عبد الجليل');
                    }}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 text-right text-[11px] transition"
                  >
                    <strong className="block text-white">أ. عبد الجليل (تسجيل جديد)</strong>
                    <span className="text-[10px] text-slate-400 font-mono">droidy.dz@gmail.com</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = Math.floor(100 + Math.random() * 900);
                      setCustomEmail(`prof.new${id}@gmail.com`);
                      setCustomName(`أ. أستاذ جديد (${id})`);
                    }}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-blue-500/30 text-blue-300 text-right text-[11px] transition"
                  >
                    <strong className="block text-white">حساب أستاذ جديد عشوائي</strong>
                    <span className="text-[10px] text-slate-400">لاختبار الطلب والتفعيل</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomGoogleModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
                >
                  <span>متابعة الدخول</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
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
                <h3 className="text-sm font-bold text-white">بوابة التحقق الخاصة بالإدارة</h3>
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
      <footer className="border-t border-slate-800 bg-slate-900/40 py-5 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>دفتر الأستاذ الذكي للتعليم الثانوي الجزائري • إصدار 2026/2027</span>
          {isAdminDevice ? (
            <span className="font-mono text-emerald-400 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>حساب المشرف: djazild@gmail.com</span>
            </span>
          ) : (
            <span className="text-slate-500 text-xs">منظومة بيداغوجية متكاملة</span>
          )}
        </div>
      </footer>
    </div>
  );
}
