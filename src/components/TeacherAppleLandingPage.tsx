import React, { useState } from 'react';
import {
  CheckCircle2, Sparkles, Smartphone, ShieldCheck, ArrowLeft,
  ChevronDown, ChevronUp, Copy, Check, MessageCircle, ExternalLink,
  Users, Award, AlertTriangle, Clock, X, Lock, CreditCard, Send, HeartHandshake, Eye
} from 'lucide-react';
import {
  BARIDIMOB_CONFIG,
  WHATSAPP_CONTACT_NUMBER,
  createWhatsAppActivationLink,
  createWhatsAppDirectReceiptLink
} from '../services/subscriptionService';
import { AuthUser, TeacherSubscription } from '../types';

import teacher3dHeroImg from '../assets/teacher_3d_hero.svg';
import happyTeacherNotebookImg from '../assets/happy_teacher_notebook.svg';
import previewTimetableImg from '../assets/preview_timetable.svg';
import previewAttendanceImg from '../assets/preview_attendance.svg';
import previewGradesImg from '../assets/preview_grades.svg';
import educationalBgImg from '../assets/educational_bg.svg';
import realisticTeacherDeskBgImg from '../assets/realistic_teacher_desk_bg.svg';
import BrandLogo from './BrandLogo';

export { teacher3dHeroImg, happyTeacherNotebookImg, previewTimetableImg, previewAttendanceImg, previewGradesImg, educationalBgImg, realisticTeacherDeskBgImg };

interface TeacherAppleLandingPageProps {
  currentUser: AuthUser | null;
  currentSubscription: TeacherSubscription | null;
  onRequestActivation: (phoneNumber: string, note?: string) => Promise<boolean>;
  onLogout: () => void;
  onRefreshSubscriptionStatus?: () => void;
}

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  icon?: React.ElementType;
}

function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackTitle,
  fallbackSubtitle,
  icon: IconComponent = Sparkles
}: ImageWithFallbackProps) {
  // تصحيح تلقائي لأي مسار يحتوي على /public/ ليكون مساراً عاماً صحيحاً مثل /assets/filename.ext
  const normalizePath = (s?: string) => {
    if (!s) return s;
    if (s.startsWith('/public/')) {
      return s.replace('/public/', '/');
    }
    if (s.startsWith('public/')) {
      return '/' + s.replace('public/', '');
    }
    return s;
  };

  const initialNormalized = normalizePath(src);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(initialNormalized);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!initialNormalized);
  const [retryAttempt, setRetryAttempt] = useState(0);

  // تحديث الصورة عند تغير المصدر
  React.useEffect(() => {
    const norm = normalizePath(src);
    setCurrentSrc(norm);
    setHasError(false);
    setIsLoading(!!norm);
    setRetryAttempt(0);
  }, [src]);

  const handleError = () => {
    if (retryAttempt === 0 && currentSrc && currentSrc.startsWith('/')) {
      // إعادة المحاولة بالمسار النسبي لتوافق بيئات Vite وقواعد الاستضافة
      setRetryAttempt(1);
      setCurrentSrc('.' + currentSrc);
    } else if (retryAttempt === 1 && currentSrc) {
      setRetryAttempt(2);
      setCurrentSrc(currentSrc.replace(/^\.\/?/, ''));
    } else {
      console.warn(`[ImageWithFallback] Failed to load image: ${src}`);
      setHasError(true);
      setIsLoading(false);
    }
  };

  if (!currentSrc || hasError) {
    return (
      <div className={`relative flex flex-col items-center justify-center p-4 rounded-3xl bg-gradient-to-br from-slate-900/95 via-indigo-950/60 to-slate-900/95 backdrop-blur-2xl border border-white/20 text-center overflow-hidden shadow-2xl ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/15 via-indigo-500/15 to-emerald-500/15 blur-xl pointer-events-none" />
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center mb-2 shadow-lg z-10">
          <IconComponent className="w-6 h-6 text-blue-300" />
        </div>
        <span className="text-xs font-black text-white z-10">{fallbackTitle}</span>
        {fallbackSubtitle && (
          <span className="text-[10px] text-slate-300/80 mt-1 z-10">{fallbackSubtitle}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-pulse flex items-center justify-center z-10 rounded-2xl">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        onLoad={() => setIsLoading(false)}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}

export default function TeacherAppleLandingPage({
  currentUser,
  currentSubscription,
  onRequestActivation,
  onLogout,
  onRefreshSubscriptionStatus
}: TeacherAppleLandingPageProps) {
  // حالات النوافذ المنبثقة
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeFeatureModal, setActiveFeatureModal] = useState<number | null>(null);

  // حالات تفاعلية
  const [phonePreviewTab, setPhonePreviewTab] = useState<'classes' | 'attendance' | 'grades'>('classes');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // حالة نموذج الطلب داخل النافذة المنبثقة
  const [phoneNumber, setPhoneNumber] = useState(currentSubscription?.phoneNumber || '');
  const [receiptNote, setReceiptNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopiedRip, setIsCopiedRip] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  const teacherName = currentUser?.name || 'الأستاذ الفاضل';
  const teacherEmail = currentUser?.email || '';
  const isPending = currentSubscription?.status === 'pending';

  const handleCopyRip = () => {
    navigator.clipboard.writeText(BARIDIMOB_CONFIG.ripNumber);
    setIsCopiedRip(true);
    setTimeout(() => setIsCopiedRip(false), 2500);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const ok = await onRequestActivation(phoneNumber, receiptNote);
      if (ok) {
        setSubmitSuccess(true);
        if (onRefreshSubscriptionStatus) onRefreshSubscriptionStatus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappUrl = createWhatsAppActivationLink({
    email: teacherEmail,
    fullName: teacherName,
    phone: phoneNumber,
    notes: receiptNote,
    planId: 'lifetime',
    planName: 'وصول دائم مدى الحياة',
    priceDZD: 1000
  });

  // قائمة الميزات الأربع
  const features = [
    {
      id: 1,
      title: 'أقسامك في مكان واحد',
      subtitle: 'نظّم قوائم تلاميذك بسهولة.',
      icon: Users,
      badge: 'إدارة متكاملة',
      color: 'blue',
      detailTitle: 'تنظيم القوائم والأفواج تلقائياً',
      detailDesc: 'استورد قائمة التلاميذ بملف Excel أو بصورة ورقية عبر الماسح الضوئي الذكي OCR. يتم تقسيم الأقسام إلى أفواج مع توزيع المقاعد ومخطط الجلوس بلمسة واحدة.'
    },
    {
      id: 2,
      title: 'حضور أسرع',
      subtitle: 'سجّل الحضور والغياب دون تعقيد.',
      icon: Clock,
      badge: 'أقل من 30 ثانية',
      color: 'emerald',
      detailTitle: 'واجهة لمس مخصصة للهاتف بـ 3 أزرار أليفة',
      detailDesc: 'أثناء الوقوف في القسم، يمكنك تسجيل الحضور والغياب وتأخر التلاميذ بأزرار عريضة ملونة تفاعلية مع رصد تنبيهات التجاوز القانوني للغياب (3 غيابات).'
    },
    {
      id: 3,
      title: 'علامات أوضح',
      subtitle: 'تابع نتائج تلاميذك في مادتك.',
      icon: Award,
      badge: 'تقويم مستمر دقيق',
      color: 'indigo',
      detailTitle: 'مصفوفة تنقيط سريعة ومحسوبة آلياً',
      detailDesc: 'سجّل الفروض، الأعمال التطبيقية، والاختبارات مباشرة. يحسب النظام المعدل الفصلي ونقطة التقويم المستمر آلياً دون الحاجة لآلة حاسبة.'
    },
    {
      id: 4,
      title: 'تحليل عملي',
      subtitle: 'اعرف من يحتاج إلى متابعة، واتخذ قرارك بسهولة.',
      icon: AlertTriangle,
      badge: 'تشخيص بيداغوجي',
      color: 'rose',
      detailTitle: 'كشف التلاميذ المحتاجين للدعم والتدارك',
      detailDesc: 'يحلل النظام نتائج مادتك فورياً ويحدد التلاميذ الذين قل معدلهم عن 10 أو تراجعت علاماتهم بين الفروض، مع تقديم أداة مقارنة بين تقييمين.'
    }
  ];

  // الأسئلة الشائعة
  const faqs = [
    {
      q: 'هل أدفع كل شهر أو كل سنة؟',
      a: 'لا. السعر هو 1000 دج فقط لمرة واحدة مقابل وصول دائم إلى الدفتر اليومي. لا توجد أي اشتراكات شهرية، سنوية، أو رسوم تجديد دورية.'
    },
    {
      q: 'كيف يتم تفعيل حسابي بعد الدفع؟',
      a: 'بعد الدفع عبر تطبيق BaridiMob أو مكتب البريد، تقوم بإرسال صورة وصل الدفع إلى محادثة WhatsApp المباشرة الخاصة بالإدارة، ليتم تفعيل حسابك فور مراجعة الوصل.'
    },
    {
      q: 'هل أحتاج إلى إدخال مفاتيح أو أكواد معقدة؟',
      a: 'لا. التفعيل يتم مباشرة على بريد Gmail الخاص بك المسجل بالمنصة. بمجرد تأكيد الإدارة، يفتح الدفتر تلقائياً عند تسجيل الدخول.'
    },
    {
      q: 'هل يمكنني استخدام الدفتر من الهاتف والحاسوب في نفس الوقت؟',
      a: 'نعم. الدفتر اليومي الذكي متوافق بالكامل مع جميع الشاشات (الهواتف المحمولة، الأجهزة اللوحية، والحواسيب) مع مزامنة سحابية لحفظ بياناتك.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans dir-rtl select-none relative overflow-x-hidden pb-24 sm:pb-12">
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

      {/* الهيدر العلوي الأنيق الأملس */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 transition-all">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <BrandLogo
            size="sm"
            showText={true}
            subtitle="للأستاذ في الطور الثانوي"
            theme="dark"
          />

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
              وصول دائم — 1000 دج
            </span>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/25 transition active:scale-95 whitespace-nowrap"
            >
              تفعيل الدفتر
            </button>

            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition text-xs font-bold"
              title="تسجيل الخروج"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 space-y-16 sm:space-y-24 pt-8 sm:pt-14">

        {/* =========================================================
            القسم الأول: رسالة ترحيب شخصية بأيقونة وشارة Apple
        ========================================================= */}
        <section className="text-center space-y-6 max-w-3xl mx-auto pt-2">
          {/* شارة الترحيب بالاسم ورقم التفعيل */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>أهلاً بك أستاذ <strong className="text-white">{teacherName}</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-blue-400 font-bold">وصول دائم — دفع مرة واحدة 1000 دج</span>
          </div>

          {/* العنوان الرئيسي والفرعي العريض بأسلوب Apple */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              أستاذ، دفترُك اليومي أصبح أسهل.
            </h1>
            <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
              نظّم أقسامك، سجّل الحضور، تابع العلامات، واعرف من يحتاج إلى دعم. كل ذلك في مكان واحد، دون تجديدات شهريّة أو سنوية.
            </p>
          </div>

          {/* أزرار الدعوة لاتخاذ القرار */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>أريد تفعيل دفتري الآن — 1000 دج</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <a
              href="#benefits"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs sm:text-sm transition text-center"
            >
              اكتشف ما ستحصل عليه ➔
            </a>
          </div>

          {/* شريط الأمان الصريح */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> لا توجد رسوم مخفية
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> تفعيل سريع عبر BaridiMob
            </span>
          </div>

          {/* =========================================================
              لوحة العرض البصرية 3D الفاخرة بأسلوب Apple مع بطاقات عائمة
          ========================================================= */}
          <div className="relative pt-6 pb-2 max-w-4xl mx-auto">
            {/* إضاءة خلفية هالة ناعمة */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-indigo-500/20 to-emerald-500/15 rounded-3xl blur-2xl transform -rotate-1 scale-95 pointer-events-none" />

            {/* الحاوية الرئيسية Glassmorphic 3D مع التأثير الحركي الانسيابي عند الحوم */}
            <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/15 p-6 sm:p-8 shadow-2xl overflow-hidden group transition-all duration-500 ease-out hover:scale-[1.015] hover:border-white/30 hover:shadow-blue-500/15 hover:bg-slate-900/90">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* العمود الأيمن: النص والمؤشرات الحية */}
                <div className="md:col-span-7 space-y-4 text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold shadow-inner">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
                    <span>تجربة مستوحاة من بساطة وإتقان Apple</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    دفترٌ بيداغوجي ذكي، يستجيب لأسلوب عملك اليومي.
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    تصفح أقسامك بلمس مرن، اضبط الغيابات والتأخرات في ثوانٍ معدودة، واستعرض التحليل الفوري لعلامات تلاميذك مع تصدير كشوف النقاط دون أخطاء.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-slate-200">مزامنة سحابية فورية</span>
                    </div>
                    <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      <span className="text-xs font-bold text-slate-200">عمل مباشر دون إنترنت</span>
                    </div>
                  </div>
                </div>

                {/* العمود الأيسر: الصورة الرئيسية 3D والبطاقات الشفافة العائمة */}
                <div className="md:col-span-5 relative flex items-center justify-center min-h-[300px]">
                  
                  {/* البطاقة الرئيسية الزجاجية 3D المحتوية على صورة الأستاذ المحلية */}
                  <div className="relative w-full max-w-[320px] aspect-[4/3] sm:aspect-square rounded-3xl bg-slate-900/90 border border-white/20 p-2.5 flex flex-col justify-between shadow-2xl backdrop-blur-xl group overflow-hidden transition-all duration-500 ease-out hover:scale-[1.03] hover:border-blue-400/40 hover:shadow-blue-500/20">
                    
                    {/* شريط الإطار العلوي الأنيق */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 px-2.5 pt-1 z-10 bg-slate-950/40 rounded-t-2xl">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-300"> 3D Educational Workspace</span>
                    </div>

                    {/* صورة الأستاذ السعيد وهو يستعمل الدفتر الذكي */}
                    <div className="relative my-auto w-full h-full min-h-[180px] rounded-2xl overflow-hidden mt-2 border border-white/10 shadow-inner group-hover:scale-[1.02] transition duration-500">
                      <ImageWithFallback
                        src={happyTeacherNotebookImg}
                        alt="أستاذ يستعمل الدفتر الذكي بسعادة داخل القسم"
                        className="w-full h-full object-cover rounded-2xl"
                        fallbackTitle="أستاذ يستعمل الدفتر الذكي بسعادة"
                        icon={Sparkles}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                      
                      <div className="absolute bottom-2 right-3 left-3 text-right">
                        <span className="text-xs font-black text-white tracking-wide block drop-shadow-md">أستاذ يستعمل الدفتر الذكي بسعادة</span>
                        <span className="text-[10px] text-emerald-300 font-bold block drop-shadow-sm">مسح ذكي OCR، مراجعة يدوية، وحضور فوري</span>
                      </div>
                    </div>

                    {/* شريط حالة سفلي */}
                    <div className="pt-2 px-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300 font-bold z-10">
                      <span>السرعة: مزامنة محليّة 100%</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> تم الحفظ المحلي
                      </span>
                    </div>
                  </div>

                  {/* البطاقة العائمة الأولى: معاينة واجهة الحضور والغياب (Top Right Floating) مع الحركة الانسيابية */}
                  <div 
                    onClick={() => setPreviewImageModal(previewAttendanceImg)}
                    className="absolute -top-4 -right-2 sm:-right-8 bg-slate-900/95 backdrop-blur-2xl border border-white/30 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2.5 cursor-pointer z-20 group max-w-[210px] transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-2 hover:border-blue-400 hover:shadow-blue-500/30 hover:bg-slate-900"
                    title="انقر لمعاينة واجهة الحضور والغياب بالحجم الكامل"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-blue-500/30 overflow-hidden shrink-0 relative">
                      <ImageWithFallback
                        src={previewAttendanceImg}
                        alt="معاينة واجهة الحضور"
                        className="w-full h-full object-cover"
                        fallbackTitle="الحضور"
                      />
                    </div>
                    <div className="text-right overflow-hidden">
                      <div className="text-[11px] font-black text-white group-hover:text-blue-300 transition flex items-center gap-1">
                        <span>واجهة الحضور</span>
                        <Eye className="w-3 h-3 text-blue-400 opacity-80" />
                      </div>
                      <div className="text-[9px] text-emerald-400 font-bold truncate">تسجيل الحضور والتأخر بلمسة</div>
                    </div>
                  </div>

                  {/* البطاقة العائمة الثانية: معاينة واجهة كشف النقاط والتقويم (Bottom Left Floating) مع الحركة الانسيابية */}
                  <div 
                    onClick={() => setPreviewImageModal(previewGradesImg)}
                    className="absolute -bottom-4 -left-2 sm:-left-8 bg-slate-900/95 backdrop-blur-2xl border border-white/30 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2.5 cursor-pointer z-20 group max-w-[210px] transition-all duration-300 ease-out hover:scale-110 hover:translate-y-2 hover:border-indigo-400 hover:shadow-indigo-500/30 hover:bg-slate-900"
                    title="انقر لمعاينة واجهة النقاط والتقويم بالحجم الكامل"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-indigo-500/30 overflow-hidden shrink-0 relative">
                      <ImageWithFallback
                        src={previewGradesImg}
                        alt="معاينة كشف النقاط"
                        className="w-full h-full object-cover"
                        fallbackTitle="النقاط"
                      />
                    </div>
                    <div className="text-right overflow-hidden">
                      <div className="text-[11px] font-black text-white group-hover:text-indigo-300 transition flex items-center gap-1">
                        <span>كشف النقاط الآلي</span>
                        <Eye className="w-3 h-3 text-indigo-400 opacity-80" />
                      </div>
                      <div className="text-[9px] text-indigo-300 font-bold truncate">حساب المعدلات و TP آلياً</div>
                    </div>
                  </div>

                  {/* البطاقة العائمة الثالثة: معاينة جدول التوقيت الأسبوعي الذكي */}
                  <div 
                    onClick={() => setPreviewImageModal(previewTimetableImg)}
                    className="hidden sm:flex absolute -bottom-4 -right-4 bg-slate-900/95 backdrop-blur-2xl border border-white/30 rounded-2xl p-2 sm:p-2.5 shadow-2xl items-center gap-2.5 cursor-pointer z-20 group max-w-[215px] transition-all duration-300 ease-out hover:scale-110 hover:translate-y-1 hover:border-emerald-400 hover:shadow-emerald-500/30"
                    title="انقر لمعاينة صورة جدول التوقيت الأسبوعي الذكي بالحجم الكامل"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-emerald-500/30 overflow-hidden shrink-0 relative">
                      <ImageWithFallback
                        src={previewTimetableImg}
                        alt="معاينة جدول التوقيت"
                        className="w-full h-full object-cover"
                        fallbackTitle="التوقيت"
                      />
                    </div>
                    <div className="text-right overflow-hidden">
                      <div className="text-[11px] font-black text-white group-hover:text-emerald-300 transition flex items-center gap-1">
                        <span>جدول التوقيت الذكي</span>
                        <Eye className="w-3 h-3 text-emerald-400 opacity-80" />
                      </div>
                      <div className="text-[9px] text-emerald-300 font-bold truncate">فتح القسم الحالي تلقائياً</div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>

          {/* شريط حالة الطلب إذا كان الأستاذ في انتظار المراجعة والتفعيل */}
          {isPending && (
            <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 text-right shadow-2xl space-y-4 max-w-2xl mx-auto my-6">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <BrandLogo size="sm" showText={false} />
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      في انتظار التفعيل الإداري
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">
                      دفترك جاهز ليجمع عملك في مكان واحد
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                نحن في انتظار تأكيد تفعيل حسابك. بعد التفعيل، ستتمكن من إعداد أقسامك وإضافة قوائم تلاميذك والبدء في استخدام الدفتر.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تأكيد الوصل أو الاستفسار عبر واتساب</span>
                </a>

                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition"
                >
                  تفاصيل الدفع عبر بريدي موب
                </button>
              </div>
            </div>
          )}

          {/* شريط تنبيه إذا كان الحساب موقوفاً بقرار الإدارة */}
          {currentSubscription?.status === 'suspended' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-rose-500/30 text-right shadow-2xl space-y-4 max-w-2xl mx-auto my-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    الحساب موقوف
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">
                    تنبيه إداري: حسابك موقوف بقرار الإدارة
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {currentSubscription.suspensionReason || currentSubscription.adminNotes || 'حسابك موقوف بقرار الإدارة. يرجى التواصل مع الدعم لمراجعة القرار.'}
              </p>

              <div className="pt-2">
                <a
                  href={createWhatsAppDirectReceiptLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>مراسلة الإدارة وطلب استرجاع الحساب عبر واتساب</span>
                </a>
              </div>
            </div>
          )}

          {/* شريط تنبيه إذا كان الحساب محذوفاً بقرار الإدارة */}
          {currentSubscription?.status === 'deleted' && (
            <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-rose-500/30 text-right shadow-2xl space-y-4 max-w-2xl mx-auto my-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    الحساب ملغى / محذوف
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">
                    تنبيه إداري: تم إلغاء تفعيل هذا الحساب
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {currentSubscription.adminNotes || 'تم إلغاء تفعيل هذا الحساب سابقاً. يمكنك مراسلة الإدارة عبر واتساب لإرسال وصل جديد أو طلب استرجاع الحساب.'}
              </p>

              <div className="pt-2">
                <a
                  href={createWhatsAppDirectReceiptLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>مراسلة الإدارة وطلب استرجاع الحساب عبر واتساب</span>
                </a>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================
            القسم الثاني (تم تقديمه للأعلى): تجربة تفاعلية قصيرة تمثل هاتف الأستاذ
        ========================================================= */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              تخيّل دفترَك بعد التفعيل
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              معاينة حية ومبسطة لطريقة العمل داخل الشاشات الثلاث الرئيسية.
            </p>
          </div>

          {/* محاكي شاشة الهاتف التفاعلية */}
          <div className="max-w-md mx-auto bg-slate-900 rounded-[38px] p-4 sm:p-5 border-4 border-slate-800 shadow-2xl space-y-4 relative">
            {/* كاميرا وسماعة الهاتف */}
            <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-2 opacity-80" />

            {/* أزرار التبديل بين النماذج */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-[11px] font-bold">
              <button
                onClick={() => setPhonePreviewTab('classes')}
                className={`py-2 rounded-xl transition ${
                  phonePreviewTab === 'classes' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                1. الأقسام
              </button>
              <button
                onClick={() => setPhonePreviewTab('attendance')}
                className={`py-2 rounded-xl transition ${
                  phonePreviewTab === 'attendance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                2. الحضور
              </button>
              <button
                onClick={() => setPhonePreviewTab('grades')}
                className={`py-2 rounded-xl transition ${
                  phonePreviewTab === 'grades' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                3. التحليل
              </button>
            </div>

            {/* شاشة العرض داخل محاكي الهاتف */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 min-h-[260px] space-y-3 text-right">
              {phonePreviewTab === 'classes' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-white">قسم 2 علوم تجريبية (2ع1)</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">38 تلميذ</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="font-bold text-white">1. بلقاسم محمد الأمين</span>
                      <span className="text-[10px] text-slate-400">فوج 1 • طاولة #1</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="font-bold text-white">2. بن علي فاطمة الزهراء</span>
                      <span className="text-[10px] text-slate-400">فوج 1 • طاولة #2</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="font-bold text-white">3. رحماني عبد القادر</span>
                      <span className="text-[10px] text-slate-400">فوج 2 • طاولة #3</span>
                    </div>
                  </div>
                </div>
              )}

              {phonePreviewTab === 'attendance' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="text-xs font-bold text-slate-300 flex justify-between items-center border-b border-slate-800 pb-2">
                    <span>تسجيل الحضور اليومي:</span>
                    <span className="text-[10px] text-emerald-400">حاضر: 36 | غائب: 2</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-white">التلميذ: رحماني عبد القادر</div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                      <span className="p-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-center">حاضر</span>
                      <span className="p-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-center">غائب</span>
                      <span className="p-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-center">متأخر</span>
                    </div>
                  </div>
                </div>
              )}

              {phonePreviewTab === 'grades' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="text-xs font-bold text-slate-300 flex justify-between items-center border-b border-slate-800 pb-2">
                    <span>معدل مادة الفيزياء:</span>
                    <span className="text-xs font-mono font-bold text-blue-400">13.45 / 20</span>
                  </div>
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-rose-300">⚠️ تنبيه متابعة: 7 تلاميذ</div>
                    <div className="text-[11px] text-slate-400">تراجع النقطة بـ 2.5 نقطة في أحدث فرض فصلي</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================
            القسم الثالث: اجعل الأستاذ يتخيّل سهولة عمله (4 بطاقات)
        ========================================================= */}
        <section id="benefits" className="space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              وقت أقل في التنظيم. وقت أكثر للتدريس.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              أربع أدوات صُمّمت خصيصاً لتناسب يوميات الأستاذ في الثانويات الجزائرية.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(f => {
              const IconComponent = f.icon;
              return (
                <div
                  key={f.id}
                  onClick={() => setActiveFeatureModal(f.id)}
                  className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-blue-500/40 hover:bg-slate-900/90 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 ease-out cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-blue-400 flex items-center justify-center group-hover:scale-110 transition border border-slate-700/50">
                      <IconComponent className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {f.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition">
                      {f.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                      {f.subtitle}
                    </p>
                  </div>

                  <div className="pt-2 text-xs font-bold text-blue-400 flex items-center gap-1 group-hover:underline">
                    <span>معاينة الميزة وتفاصيلها</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            القسم الرابع: عرض السعر الصريح والشفاف (1000 دج)
        ========================================================= */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-12 rounded-[36px] border border-slate-800 text-center space-y-8 relative overflow-hidden shadow-2xl">
          <div className="space-y-3 max-w-xl mx-auto">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
              سعر استثنائي شفاف — لا اشتراكات متكررة
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              دفترُك معك دائمًا.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              ادفع مرة واحدة، واحصل على وصول دائم إلى كافة الميزات والتحديثات المستقبلية.
            </p>
          </div>

          {/* كارت السعر الرئيسي 1000 دج */}
          <div className="p-6 sm:p-8 bg-slate-900/90 rounded-3xl border border-slate-800 max-w-md mx-auto space-y-6 shadow-xl relative">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold block">القيمة الإجمالية للوصول الدائم:</span>
              <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tight">
                1000 <span className="text-xl sm:text-2xl text-blue-400 font-sans">دج</span>
              </div>
              <span className="text-xs text-emerald-400 font-bold block pt-1">دفع لمرة واحدة مدى الحياة</span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 text-right border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>لا يوجد أي اشتراك شهري.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>لا توجد أي تجديدات سنوية.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>وصول دائم وفق شروط الخدمة المعلنة بالمنصة.</span>
              </div>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
              تفعيل الوصول الدائم — 1000 دج
            </button>

            <p className="text-[11px] text-slate-400">
              خطوات بسيطة، وتتابع طلب التفعيل بعد إرسال إثبات الدفع عبر بريدي موب.
            </p>
          </div>
        </section>

        {/* =========================================================
            القسم الخامس: كيف يتم التفعيل؟ (BaridiMob & WhatsApp)
        ========================================================= */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              كيف يتم التفعيل؟
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              ثلاث خطوات مرئية وسريعة لتنشيط دفترك اليومي.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-blue-500/30 hover:bg-slate-900/90 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-500/10 space-y-3 text-right">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 font-black flex items-center justify-center text-sm border border-blue-500/20">
                1
              </div>
              <h3 className="text-base font-bold text-white">1. أرسل طلب التفعيل</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                اضغط على زر التفعيل لتسجيل طلبك بحساب Gmail المعتمد لديك.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-indigo-500/30 hover:bg-slate-900/90 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/10 space-y-3 text-right">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 font-black flex items-center justify-center text-sm border border-indigo-500/20">
                2
              </div>
              <h3 className="text-base font-bold text-white">2. ادفع عبر BaridiMob</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                استخدم رقم الـ RIP الرسمية لحساب بريدي موب: <strong className="text-white font-mono">00799999002093331792</strong>.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-emerald-500/30 hover:bg-slate-900/90 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/10 space-y-3 text-right">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/20">
                3
              </div>
              <h3 className="text-base font-bold text-white">3. أرسل إثبات الدفع</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                افتح محادثة WhatsApp المباشرة مع إدارة المنصة وأرفق لقطة الشاشة أو وصل الدفع.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs text-center max-w-2xl mx-auto">
            ℹ️ <strong>توضيح مهم:</strong> فتح WhatsApp لا يعني أن حسابك قد فُعّل تلقائياً. يتم التفعيل مباشرة بعد مراجعة وصل الدفع وتأكيده من طرف الإدارة.
          </div>
        </section>

        {/* =========================================================
            القسم السادس: الأسئلة الشائعة (FAQ Accordion)
        ========================================================= */}
        <section className="space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              أسئلة قد تهمك
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-right flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-800/50 transition"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-blue-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="p-4 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/50 bg-slate-950/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            القسم السابع: دعوة أخيرة لاتخاذ القرار
        ========================================================= */}
        <section className="text-center space-y-6 py-8">
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              ابدأ بتنظيم عملك من اليوم.
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              خطوة واحدة تفصلك عن دفتر يجمع كل أعمالك اليومية والمدرسية في مكان واحد.
            </p>
          </div>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all"
          >
            تفعيل دفتري مقابل 1000 دج
          </button>
        </section>

      </main>

      {/* =========================================================
          شريط الدفع الثابت الزجاجي أسفل الشاشة للهواتف المحمولة
      ========================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 p-3 sm:hidden shadow-2xl">
        <div className="flex items-center justify-between gap-2.5 max-w-md mx-auto">
          <div>
            <span className="text-white font-black text-sm block">1000 دج</span>
            <span className="text-[10px] text-emerald-400 font-bold block">وصول دائم لمرة واحدة</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition"
            >
              تفعيل الدفتر
            </button>

            <a
              href={`https://wa.me/${WHATSAPP_CONTACT_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition"
              title="تواصل واتساب المباشر"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* =========================================================
          النافذة المنبثقة لتأكيد الدفع وإرسال الوصل (Apple-Inspired Paywall Modal)
      ========================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden my-auto animate-slideUp">
            
            {/* هيدر النافذة */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/20">
                  💳
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">تأكيد طلب التفعيل — 1000 دج</h3>
                  <span className="text-[10px] text-slate-400 block">وصل دائم ومدى الحياة دون تجديدات</span>
                </div>
              </div>

              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* جسم النافذة */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-right text-xs">

              {submitSuccess ? (
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center mx-auto text-xl shadow-lg">
                    ✓
                  </div>
                  <h4 className="text-base font-black text-white">تم تسجيل طلب التفعيل بنجاح!</h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    خطوة أخيرة: يرجى فتح محادثة WhatsApp وإرسال صورة وصل بريدي موب المقتطعة لتأكيد تفعيل حسابك مباشرة.
                  </p>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition mt-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>إرسال الوصل عبر WhatsApp الآن ➔</span>
                  </a>
                </div>
              ) : (
                <>
                  {/* ملخص العرض */}
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center text-slate-300 font-bold">
                      <span>البريد الإلكتروني المسجل:</span>
                      <span className="text-white font-mono">{teacherEmail}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300 font-bold">
                      <span>قيمة التفعيل الدائم:</span>
                      <span className="text-blue-400 font-mono text-sm font-black">1000 دج (مرة واحدة)</span>
                    </div>
                  </div>

                  {/* معلومات بريدي موب (BaridiMob) */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">معلومات تحويل بريدي موب (BaridiMob):</span>
                      <button
                        type="button"
                        onClick={handleCopyRip}
                        className="text-[10px] font-bold px-2 py-1 bg-slate-800 text-blue-300 hover:text-white rounded-lg flex items-center gap-1 transition"
                      >
                        {isCopiedRip ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopiedRip ? 'تم نسخ الـ RIP' : 'نسخ الـ RIP'}</span>
                      </button>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl font-mono text-center text-xs text-blue-300 border border-slate-800 font-bold tracking-wider">
                      {BARIDIMOB_CONFIG.ripNumber}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      حساب بريد الجزائر (CCP): <strong className="text-white">{BARIDIMOB_CONFIG.ccpAccount}</strong>
                    </p>
                  </div>

                  {/* نموذج إرسال الرقم */}
                  <form onSubmit={handleSubmitRequest} className="space-y-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">رقم هاتف الأستاذ (اختياري):</label>
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        placeholder="مثال: 0655123456"
                        className="w-full px-3.5 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">ملاحظة أو مرجع الدفع (إن وجد):</label>
                      <input
                        type="text"
                        value={receiptNote}
                        onChange={e => setReceiptNote(e.target.value)}
                        placeholder="مثال: تم تحويل 1000 دج عبر بريدي موب"
                        className="w-full px-3.5 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/25 hover:scale-[1.01] active:scale-95 transition disabled:opacity-50"
                    >
                      {isSubmitting ? 'جاري تسجيل الطلب...' : 'تأكيد إرسال طلب التفعيل ➔'}
                    </button>
                  </form>

                  {/* رابط الواتساب المباشر */}
                  <div className="pt-2 border-t border-slate-800 text-center">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>أو يمكنك فتح محادثة WhatsApp مباشرة لتمرير الوصل ➔</span>
                    </a>
                  </div>
                </>
              )}

            </div>

            {/* فوتير النافذة */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center shrink-0">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold py-1 px-4"
              >
                إغلاق والعودة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* النافذة المنبثقة لمعاينة الميزات الأربع تفصيلياً */}
      {activeFeatureModal !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          {(() => {
            const feat = features.find(f => f.id === activeFeatureModal);
            if (!feat) return null;
            return (
              <div className="bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85dvh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden my-auto animate-slideUp text-right">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <span className="font-bold text-xs text-blue-400">{feat.badge}</span>
                  <button onClick={() => setActiveFeatureModal(null)} className="p-1 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-3 overflow-y-auto">
                  <h3 className="text-base font-black text-white">{feat.detailTitle}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{feat.detailDesc}</p>
                </div>

                <div className="p-3 bg-slate-950 border-t border-slate-800 text-center shrink-0">
                  <button
                    onClick={() => setActiveFeatureModal(null)}
                    className="w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-500 transition"
                  >
                    فهمت، حسناً
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* نافذة معاينة الواجهات بالحجم الكامل بأسلوب أبل الزجاجي */}
      {previewImageModal && (
        <div 
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-white/20 rounded-3xl p-3 sm:p-5 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col space-y-4 text-right dir-rtl max-h-[90vh]"
          >
            {/* الهيدر */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="xs" showText={false} />
                <div>
                  <h3 className="text-sm font-black text-white">معاينة الواجهة التفاعلية الدقيقة</h3>
                  <p className="text-[10px] text-slate-400">الدفتر اليومي الذكي للأستاذ — استجابة فورية وسرعة فائقة</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى الصورة */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center min-h-[300px] max-h-[65vh]">
              <ImageWithFallback
                src={previewImageModal}
                alt="معاينة الواجهة"
                className="max-h-[60vh] w-auto object-contain rounded-xl"
                fallbackTitle="معاينة الواجهة التفاعلية"
                fallbackSubtitle="تم حفظ الصورة محلياً لضمان أقصى أداء وسرعة تحميل"
              />
            </div>

            {/* الفوتير */}
            <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-300">
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> صورة أصلية جودة عالية مخزنة محلياً
              </span>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
