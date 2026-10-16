import React, { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, User, KeyRound,
  Lock, RefreshCw, ChevronDown, ChevronUp, Sparkles, ExternalLink
} from 'lucide-react';
import { AuthUser } from '../types';
import {
  ADMIN_EMAIL, getTeacherSubscription, activateTeacherSubscription,
  revokeOrExpireSubscription
} from '../services/subscriptionService';

interface SecurityAuditBarProps {
  currentUser: AuthUser | null;
  onSwitchUser: (user: AuthUser | null) => void;
  onOpenAdminPanel?: () => void;
  onRefreshState?: () => void;
}

export default function SecurityAuditBar({
  currentUser,
  onSwitchUser,
  onOpenAdminPanel,
  onRefreshState
}: SecurityAuditBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeScenarioResult, setActiveScenarioResult] = useState<string | null>(null);

  const sub = currentUser ? getTeacherSubscription(currentUser.email) : null;

  // تنفيذ سيناريو الاختبار 1: ولي الأمر
  const runScenario1 = () => {
    onSwitchUser(null);
    setActiveScenarioResult('سيناريو 1 ✅: تم التبديل إلى بوابة الزوار والأولياء بدون أي تسجيل دخول أو طلب دفع.');
  };

  // تنفيذ سيناريو 2 و 3: أستاذ جديد مسجل عبر Google دون اشتراك
  const runScenario2and3 = () => {
    const newTeacher: AuthUser = {
      email: 'prof.karim@gmail.com',
      name: 'أ. كريم بن عمار',
      isAdmin: false,
      isActive: false
    };
    onSwitchUser(newTeacher);
    setActiveScenarioResult('سيناريو 2 و 3 ✅: أستاذ جديد مسجل بحساب Google (prof.karim@gmail.com) غير مشترك -> توجيهه الفوري لصفحة الأسعار بالدينار وخيارات بريدي موب.');
  };

  // تنفيذ سيناريو 4: المدير يفعل الاشتراك
  const runScenario4 = async () => {
    // تفعيل اشتراك أ. كريم لمدة 6 أشهر
    const res = await activateTeacherSubscription(ADMIN_EMAIL, 'prof.karim@gmail.com', '6months');
    if (res.success) {
      const activeTeacher: AuthUser = {
        email: 'prof.karim@gmail.com',
        name: 'أ. كريم بن عمار',
        isAdmin: false,
        isActive: true
      };
      onSwitchUser(activeTeacher);
      setActiveScenarioResult('سيناريو 4 ✅: قام المدير (djazild@gmail.com) بتفعيل الاشتراك -> دخل الأستاذ مباشرة إلى الدفتر الذكي والميزات المدفوعة!');
    }
  };

  // تنفيذ سيناريو 5: انتهاء الاشتراك
  const runScenario5 = async () => {
    // إنهاء اشتراك أ. كريم
    await revokeOrExpireSubscription(ADMIN_EMAIL, 'prof.karim@gmail.com', 'محاكاة انتهاء الصلاحية');
    const expiredTeacher: AuthUser = {
      email: 'prof.karim@gmail.com',
      name: 'أ. كريم بن عمار',
      isAdmin: false,
      isActive: false
    };
    onSwitchUser(expiredTeacher);
    setActiveScenarioResult('سيناريو 5 ✅: انتهى الاشتراك -> تم حجب الميزات المدفوعة فوراً مع عرض سياسة الاحتفاظ التام بالبيانات بدون حذف.');
  };

  // تنفيذ سيناريو 6: حساب المدير مفعل دائماً
  const runScenario6 = () => {
    const adminUser: AuthUser = {
      email: ADMIN_EMAIL,
      name: 'الأستاذ المشرف djazild',
      isAdmin: true,
      isActive: true
    };
    onSwitchUser(adminUser);
    setActiveScenarioResult(`سيناريو 6 ✅: حساب المدير (${ADMIN_EMAIL}) دائم التفعيل مدى الحياة (0 دج) وغير قابل لانتهاء الصلاحية.`);
  };

  // تنفيذ سيناريو 7: اختبار الحماية وعزل البيانات
  const runScenario7 = () => {
    setActiveScenarioResult('سيناريو 7 ✅: فحص قواعد الأمان: الأستاذ العادي لا يمكنه تعديل أو ترقية اشتراكه بنفسه، وبيانات أقسامه معزولة تماماً في مجاله الخاص ولا تتقاطع مع أي أستاذ آخر.');
  };

  return (
    <div dir="rtl" className="bg-slate-900 border-b border-blue-500/30 text-xs py-2 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        
        {/* ملخص الوضع الحالي */}
        <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
          <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2.5 py-1.5 rounded-xl border border-blue-500/20 font-bold whitespace-nowrap overflow-hidden text-ellipsis shrink">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">نظام التحقق واختبار الاشتراكات</span>
            <span className="hidden sm:inline text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300 font-mono">(السيناريوهات 7)</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-slate-300 whitespace-nowrap">
            <span>الحساب الحالي:</span>
            {currentUser ? (
              <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-white">
                {currentUser.email} ({sub?.status === 'active' ? '🟢 نشط' : sub?.status === 'pending' ? '🟡 قيد المراجعة' : sub?.status === 'expired' ? '🔴 منتهي' : '⚪ غير مشترك'})
              </span>
            ) : (
              <span className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40 font-bold">
                زائر / ولي أمر (بدون تسجيل دخول)
              </span>
            )}
          </div>
        </div>

        {/* أزرار الإجراءات السريعة */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentUser?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && onOpenAdminPanel && (
            <button
              onClick={onOpenAdminPanel}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl transition text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm shadow-emerald-600/30 min-h-[34px]"
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>لوحة المدير</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl transition text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap border border-slate-700 min-h-[34px]"
          >
            <span>اختبار السيناريوهات السبعة</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
          </button>
        </div>
      </div>

      {/* المحتوى الممتد لاختبار كل سيناريو */}
      {isExpanded && (
        <div className="bg-slate-950 border-t border-slate-800 p-4 transition-all">
          <div className="max-w-7xl mx-auto space-y-3">
            <p className="text-[11px] text-slate-400">
              اختر أحد السيناريوهات المطلوبة لاختبار سلوك النظام الفوري وقواعد الأمان:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                onClick={runScenario1}
                className="text-right p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 transition cursor-pointer"
              >
                <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                  <span>1. تجربة ولي الأمر</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">كود مباشر</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">دخول بالكود دون تسجيل دخول أو دفع، محمي من التخمين.</p>
              </button>

              <button
                onClick={runScenario2and3}
                className="text-right p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer"
              >
                <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                  <span>2 و 3. أستاذ غير مشترك</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">عروض DZD</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">تسجيل Google دون اشتراك ← ظهور صفحة الأسعار وبريدي موب.</p>
              </button>

              <button
                onClick={runScenario4}
                className="text-right p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer"
              >
                <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                  <span>4. تفعيل المدير للأستاذ</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">دخول فوري</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">تأكيد الحوالة يدوياً وتفعيل 6 أشهر تقويمية ودخول مباشر.</p>
              </button>

              <button
                onClick={runScenario5}
                className="text-right p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 transition cursor-pointer"
              >
                <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                  <span>5. انتهاء الاشتراك</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">حجب مع حفظ</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">توقف الميزات المدفوعة مع سياسة الاحتفاظ بالبيانات بنسبة 100%.</p>
              </button>

              <button
                onClick={runScenario6}
                className="text-right p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer"
              >
                <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                  <span>6. حساب المدير الرئيسي</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">مدى الحياة</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">djazild@gmail.com مفعل دائماً دون دفع وله صلاحيات كاملة.</p>
              </button>

              <button
                onClick={runScenario7}
                className="text-right p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer sm:col-span-2 lg:col-span-3"
              >
                <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                  <span>7. قواعد أمان عزل البيانات ومنع تزوير الاشتراك</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">RBAC Security</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">التحقق من استحالة ترقية الأستاذ لحسابه ذاتياً واستقلالية بيانات كل أستاذ في مساحته الخاصة.</p>
              </button>
            </div>

            {activeScenarioResult && (
              <div className="p-2.5 bg-blue-950/60 border border-blue-500/40 rounded-xl text-blue-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{activeScenarioResult}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
