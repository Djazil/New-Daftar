import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle,
  UserCheck, Search, Calendar, CreditCard, RefreshCw, Plus,
  FileText, ArrowRight, DollarSign, X, Check, Lock, Sparkles, Zap,
  Trash2, PauseCircle, PlayCircle, Ban, ShieldAlert, Timer
} from 'lucide-react';
import { AuthUser, SubscriptionPlanId, TeacherSubscription } from '../types';
import {
  ADMIN_EMAIL, SUBSCRIPTION_TIERS, loadAllSubscriptions,
  saveAllSubscriptions, activateTeacherSubscription,
  revokeOrExpireSubscription, fetchSubscriptionsFromServer,
  generateTestSubscription, deleteTeacherAccount,
  suspendTeacherAccount, extendTeacherSubscription
} from '../services/subscriptionService';
import { subscribeToAllSubscriptionsInFirestore } from '../services/firebaseSubscriptionService';

interface AdminSubscriptionManagerProps {
  currentUser: AuthUser;
  onClose: () => void;
  onSubscriptionUpdated?: () => void;
}

export default function AdminSubscriptionManager({
  currentUser,
  onClose,
  onSubscriptionUpdated
}: AdminSubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<Record<string, TeacherSubscription>>(() => loadAllSubscriptions());
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'active' | 'expired' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);

  // حالات الحذف النهائي والتمديد
  const [subToDelete, setSubToDelete] = useState<TeacherSubscription | null>(null);
  const [subToExtend, setSubToExtend] = useState<TeacherSubscription | null>(null);
  const [extendDaysInput, setExtendDaysInput] = useState<number>(30);
  const [extendReasonInput, setExtendReasonInput] = useState<string>('');

  // مزامنة حية وفورية مع قواعد بيانات Firebase Firestore وسيرفر التطبيق
  useEffect(() => {
    let isMounted = true;
    
    // 1. جلب فوري ومباشر
    fetchSubscriptionsFromServer().then(data => {
      if (isMounted && data) {
        setSubscriptions(data);
      }
    });

    // 2. اشتراك حي ومباشر مع Firestore لاستقبال أي طلب تسجيل جديد فوراً
    const unsubFirestore = subscribeToAllSubscriptionsInFirestore((firestoreMap) => {
      if (isMounted && firestoreMap && Object.keys(firestoreMap).length > 0) {
        setSubscriptions(prev => {
          const merged = { ...prev, ...firestoreMap };
          return merged;
        });
      }
    });

    // 3. استماع لأي تحديث محلي أو من النوافذ الأخرى
    const handleUpdate = (e: any) => {
      if (isMounted && e.detail) {
        setSubscriptions(e.detail);
      }
    };
    window.addEventListener('smart_notebook_subscriptions_updated', handleUpdate);

    // 4. تكرار التحقق السحابي دورياً لاستقبال طلبات الأساتذة في الوقت الفعلي
    const interval = setInterval(() => {
      fetchSubscriptionsFromServer().then(data => {
        if (isMounted && data) {
          setSubscriptions(data);
        }
      });
    }, 3500);

    return () => {
      isMounted = false;
      unsubFirestore();
      window.removeEventListener('smart_notebook_subscriptions_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // نافذة تخصيص التفعيل اليدوي
  const [selectedSubForEdit, setSelectedSubForEdit] = useState<TeacherSubscription | null>(null);
  const [customPlan, setCustomPlan] = useState<SubscriptionPlanId>('6months');
  const [customDays, setCustomDays] = useState<number>(180);
  const [customPrice, setCustomPrice] = useState<number>(3000);
  const [adminNotes, setAdminNotes] = useState('');

  // إضافة أستاذ جديد وتفعيله يدوياً
  const [showAddNewTeacherModal, setShowAddNewTeacherModal] = useState(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherPlan, setNewTeacherPlan] = useState<SubscriptionPlanId>('1year');

  const reloadData = async () => {
    setIsSyncing(true);
    const data = await fetchSubscriptionsFromServer();
    setSubscriptions(data);
    setIsSyncing(false);
    if (onSubscriptionUpdated) onSubscriptionUpdated();
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // توليد واختبار حساب أستاذ تجريبي للتحقق المباشر
  const handleTestSubscriptionArrival = async () => {
    setIsGeneratingTest(true);
    showToast('جاري توليد طلب اشتراك تجريبي والتحقق من وصوله للسيرفر...', 'success');
    const newTestSub = await generateTestSubscription();
    setIsGeneratingTest(false);
    if (newTestSub) {
      showToast(`تم استلام طلب جديد بنجاح للأستاذ (${newTestSub.teacherName}) بريد: ${newTestSub.teacherEmail}`, 'success');
      setFilterTab('pending');
      reloadData();
    } else {
      showToast('تعذر توليد الحساب التجريبي', 'error');
    }
  };

  const list = Object.values(subscriptions);

  // إحصائيات سريعة
  const totalCount = list.length;
  const pendingCount = list.filter(s => s.status === 'pending' || s.status === 'none').length;
  const activeCount = list.filter(s => s.status === 'active').length;
  const expiredCount = list.filter(s => s.status === 'expired').length;
  const suspendedCount = list.filter(s => s.status === 'suspended').length;
  const totalRevenue = list
    .filter(s => s.status === 'active' && s.teacherEmail !== ADMIN_EMAIL)
    .reduce((sum, s) => sum + (s.amountDZD || 0), 0);

  // التصفية والبحث
  const filteredList = list.filter(item => {
    if (filterTab === 'pending') {
      if (item.status !== 'pending' && item.status !== 'none') return false;
    } else if (filterTab === 'suspended') {
      if (item.status !== 'suspended') return false;
    } else if (filterTab !== 'all' && item.status !== filterTab) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.teacherEmail.toLowerCase().includes(q) ||
        item.teacherName.toLowerCase().includes(q) ||
        (item.paymentProof?.transactionRef?.toLowerCase() || '').includes(q)
      );
    }
    return true;
  });

  // معالجة التفعيل السريع
  const handleQuickActivate = (teacherEmail: string, planId: SubscriptionPlanId) => {
    const res = activateTeacherSubscription(currentUser.email, teacherEmail, planId);
    if (res.success) {
      showToast(res.message, 'success');
      reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // معالجة إلغاء التفعيل / إنهاء الصلاحية
  const handleExpire = (teacherEmail: string) => {
    if (teacherEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showToast('لا يمكن إنهاء اشتراك حساب المشرف العام djazild@gmail.com!', 'error');
      return;
    }
    const res = revokeOrExpireSubscription(currentUser.email, teacherEmail, 'تم إنهاء الصلاحية من لوحة المشرف');
    if (res.success) {
      showToast(res.message, 'success');
      reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // معالجة الحذف النهائي الحقيقي من السيرفر والداتا
  const handleConfirmDelete = () => {
    if (!subToDelete) return;
    const res = deleteTeacherAccount(currentUser.email, subToDelete.teacherEmail);
    if (res.success) {
      showToast(res.message, 'success');
      setSubToDelete(null);
      reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // معالجة التعطيل / إيقاف التنشيط المؤقت
  const handleToggleSuspend = (sub: TeacherSubscription) => {
    if (sub.teacherEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showToast('لا يمكن تعطيل حساب المشرف العام!', 'error');
      return;
    }
    const isCurrentlySuspended = sub.status === 'suspended';
    const res = suspendTeacherAccount(
      currentUser.email,
      sub.teacherEmail,
      isCurrentlySuspended ? 'إلغاء التعطيل وتنشيط الحساب' : 'تعطيل مؤقت بقرار من المشرف',
      !isCurrentlySuspended
    );
    if (res.success) {
      showToast(res.message, 'success');
      reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // معالجة تمديد فترة الاشتراك
  const handleConfirmExtend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subToExtend) return;
    if (extendDaysInput <= 0) {
      showToast('يرجى تحديد عدد أيام صالح موجب للتمديد', 'error');
      return;
    }
    const res = extendTeacherSubscription(
      currentUser.email,
      subToExtend.teacherEmail,
      extendDaysInput,
      extendReasonInput.trim() || 'تمديد الاشتراك بقرار من المشرف'
    );
    if (res.success) {
      showToast(res.message, 'success');
      setSubToExtend(null);
      setExtendDaysInput(30);
      setExtendReasonInput('');
      reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // معالجة حفظ التخصيص
  const handleSaveCustomActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForEdit) return;

    const res = activateTeacherSubscription(
      currentUser.email,
      selectedSubForEdit.teacherEmail,
      customPlan,
      {
        customDays: customPlan === 'lifetime' ? undefined : customDays,
        customPriceDZD: customPrice,
        adminNotes
      }
    );

    if (res.success) {
      showToast(res.message, 'success');
      setSelectedSubForEdit(null);
      reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // معالجة إضافة أستاذ جديد من طرف المشرف
  const handleAddNewTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newTeacherEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('يرجى إدخال بريد إلكتروني صالح', 'error');
      return;
    }

    const res = activateTeacherSubscription(currentUser.email, cleanEmail, newTeacherPlan, {
      adminNotes: `تم الإنشاء والتفعيل يدوياً من طرف المشرف الرئيسي للأستاذ: ${newTeacherName || cleanEmail}`
    });

    if (res.success) {
      // تحديث الاسم أيضاً
      const all = loadAllSubscriptions();
      if (all[cleanEmail]) {
        all[cleanEmail].teacherName = newTeacherName || cleanEmail.split('@')[0];
        saveAllSubscriptions(all);
      }
      showToast(res.message, 'success');
      setShowAddNewTeacherModal(false);
      setNewTeacherEmail('');
      setNewTeacherName('');
      reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
        
        {/* الترويسة العلوية للمدير */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-b border-emerald-500/30 p-3.5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-xl font-black text-white">
                  لوحة تحكم المدير العام وإدارة الاشتراكات
                </h2>
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md">
                  صلاحيات الإدارة المحمية
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                حساب المدير المعتمد: <strong className="text-emerald-300 font-mono">{ADMIN_EMAIL}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              disabled={isGeneratingTest}
              onClick={handleTestSubscriptionArrival}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black text-xs px-2.5 sm:px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-600/30 cursor-pointer disabled:opacity-50"
              title="توليد طلب اشتراك جديد فوراً لاختبار استقبال وتفعيل الحسابات"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>{isGeneratingTest ? 'جاري التوليد...' : '⚡ تجربة طلب جديد (حساب تجريبي)'}</span>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={reloadData}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 sm:px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="مزامنة فورية مع السيرفر المركزي"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">مزامنة السيرفر</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddNewTeacherModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-2.5 sm:px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">تفعيل أستاذ يدوياً</span>
              <span className="sm:hidden">إضافة</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
              title="إغلاق لوحة المدير"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className={`p-3 text-xs font-bold flex items-center gap-2 shrink-0 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-b border-emerald-600/40'
              : 'bg-rose-950/90 text-rose-200 border-b border-rose-600/40'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* الشريط المكتنز للإحصائيات الإدارية السريعة */}
        <div className="px-3 py-2 sm:p-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto touch-scroll pb-1 text-xs">
            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0 font-bold text-slate-300">
              إجمالي الأساتذة: <span className="text-white font-black font-mono mr-1">{totalCount}</span>
            </div>
            <div className="bg-amber-950/50 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/30 shrink-0 font-bold flex items-center gap-1">
              <span>بانتظار التحقق:</span>
              <span className="font-black font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded-full">{pendingCount}</span>
            </div>
            <div className="bg-emerald-950/50 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/30 shrink-0 font-bold">
              النشطة: <span className="font-black font-mono text-emerald-400 mr-1">{activeCount}</span>
            </div>
            <div className="bg-rose-950/50 text-rose-300 px-3 py-1.5 rounded-xl border border-rose-500/30 shrink-0 font-bold">
              المنتهية: <span className="font-black font-mono text-rose-400 mr-1">{expiredCount}</span>
            </div>
            <div className="bg-orange-950/50 text-orange-300 px-3 py-1.5 rounded-xl border border-orange-500/30 shrink-0 font-bold">
              المعطلة مؤقتاً: <span className="font-black font-mono text-orange-400 mr-1">{suspendedCount}</span>
            </div>
            <div className="bg-blue-950/50 text-blue-300 px-3 py-1.5 rounded-xl border border-blue-500/30 shrink-0 font-bold">
              المداخيل: <span className="font-black font-mono text-amber-400 mr-1">{totalRevenue.toLocaleString('fr-DZ')} دج</span>
            </div>
          </div>
        </div>

        {/* شريط أدوات البحث والتصفية */}
        <div className="p-3 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto touch-scroll shrink-0">
            <button
              onClick={() => setFilterTab('all')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterTab === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({totalCount})
            </button>
            <button
              onClick={() => setFilterTab('pending')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                filterTab === 'pending' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <span>في انتظار التفعيل ⏳</span>
              {pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 text-[10px] flex items-center justify-center font-black">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterTab === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              النشطة ({activeCount})
            </button>
            <button
              onClick={() => setFilterTab('expired')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterTab === 'expired' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              المنتهية ({expiredCount})
            </button>
            <button
              onClick={() => setFilterTab('suspended')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterTab === 'suspended' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-400 hover:text-orange-400'
              }`}
            >
              المعطلة مؤقتاً ({suspendedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالبريد، الاسم، أو رقم الوصل..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* قائمة الحسابات والطلبات المجهزة بخيارات التفعيل المباشرة */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 pb-24 min-h-0 touch-scroll">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-bold">
              لا توجد حسابات أو طلبات مطابقة للبحث حالياً.
            </div>
          ) : (
            filteredList.map((sub) => {
              const isAdminAccount = sub.teacherEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
              const tier = SUBSCRIPTION_TIERS.find(t => t.id === sub.planId);

              return (
                <div
                  key={sub.teacherEmail}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    isAdminAccount
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : sub.status === 'pending'
                      ? 'bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                      : sub.status === 'suspended'
                      ? 'bg-orange-950/30 border-orange-500/50 ring-1 ring-orange-500/40'
                      : sub.status === 'expired'
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    
                    {/* معلومات الأستاذ والحساب */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-white">{sub.teacherName || sub.teacherEmail}</span>
                          {isAdminAccount && (
                            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>المدير الرئيسي</span>
                            </span>
                          )}

                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            sub.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : sub.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : sub.status === 'suspended'
                              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                              : sub.status === 'expired'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {sub.status === 'active'
                              ? 'نشط ومفعل ✓'
                              : sub.status === 'pending'
                              ? 'بانتظار التحقق والتفعيل ⏳'
                              : sub.status === 'suspended'
                              ? 'معطل مؤقتاً 🛑'
                              : sub.status === 'expired'
                              ? 'منتهي الصلاحية ✕'
                              : 'غير مشترك'}
                          </span>
                        </div>

                        <span className="text-xs bg-slate-800 text-amber-300 font-bold px-2.5 py-1 rounded-lg border border-slate-700 font-mono">
                          {tier?.name || sub.planId} ({sub.amountDZD || 0} دج)
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-mono font-bold bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 inline-block">
                        {sub.teacherEmail}
                      </p>

                      {/* تفاصيل إثبات بريدي موب إن وجد */}
                      {sub.paymentProof && (
                        <div className="mt-2 bg-slate-900 p-3 rounded-xl border border-amber-500/30 text-xs space-y-1 text-slate-200">
                          <div className="flex items-center justify-between text-amber-400 font-black">
                            <span>📄 وصل بريدي موب للتحقق:</span>
                            <span className="text-emerald-400 font-mono">{sub.paymentProof.amount} دج</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-300">
                            <div>المرسل: <strong className="text-white">{sub.paymentProof.senderName}</strong></div>
                            <div>الهاتف: <strong className="text-white font-mono">{sub.paymentProof.phoneNumber || 'غير محدد'}</strong></div>
                            <div>رقم العملية: <strong className="font-mono text-amber-300">{sub.paymentProof.transactionRef || 'تحويل بريدي'}</strong></div>
                          </div>
                          {sub.paymentProof.receiptNote && (
                            <p className="text-slate-400 italic text-[11px] border-t border-slate-800 pt-1 mt-1">
                              ملاحظة الأستاذ: "{sub.paymentProof.receiptNote}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* تواريخ الاشتراك */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        {sub.activatedAt && (
                          <span>تاريخ التفعيل: <strong className="text-slate-200 font-mono">{new Date(sub.activatedAt).toLocaleDateString('ar-DZ')}</strong></span>
                        )}
                        {sub.expiresAt ? (
                          <span className={sub.status === 'expired' ? 'text-rose-400 font-bold' : sub.status === 'suspended' ? 'text-orange-400 font-bold' : 'text-slate-300'}>
                            تاريخ الانتهاء: <strong className="font-mono">{new Date(sub.expiresAt).toLocaleDateString('ar-DZ')}</strong>
                          </span>
                        ) : sub.isLifetime ? (
                          <span className="text-emerald-400 font-bold">صلاحية دائمة مدى الحياة</span>
                        ) : null}
                      </div>
                    </div>

                    {/* خيارات أزرار التفعيل المباشرة البارزة للمدير */}
                    <div className="pt-3 border-t border-slate-800/80 space-y-2.5 w-full">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                        <span>خيارات التفعيل المباشر والتحكم بالحساب:</span>
                        <span className="text-[10px] text-emerald-400 font-mono">إدارة فورية شاملة</span>
                      </div>

                      {/* أزرار الخطط الأربعة للتفعيل السريع */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickActivate(sub.teacherEmail, '1month')}
                          className="bg-slate-900 hover:bg-emerald-950/80 hover:border-emerald-500/60 text-slate-200 hover:text-emerald-300 border border-slate-800 rounded-xl p-2 text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5"
                          title="تفعيل لمدة شهر تقويمي واحد (800 دج)"
                        >
                          <span className="text-xs font-black">1 شهر</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">800 دج</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickActivate(sub.teacherEmail, '6months')}
                          className="bg-slate-900 hover:bg-emerald-950/80 hover:border-emerald-500/60 text-slate-200 hover:text-emerald-300 border border-slate-800 rounded-xl p-2 text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 relative overflow-hidden"
                          title="تفعيل لمدة 6 أشهر تقويمية (3000 دج)"
                        >
                          <span className="text-xs font-black text-amber-300">6 أشهر ⭐</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">3000 دج</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickActivate(sub.teacherEmail, '1year')}
                          className="bg-slate-900 hover:bg-emerald-950/80 hover:border-emerald-500/60 text-slate-200 hover:text-emerald-300 border border-slate-800 rounded-xl p-2 text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5"
                          title="تفعيل لمدة عام كامل (5000 دج)"
                        >
                          <span className="text-xs font-black">سنة كاملة</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">5000 دج</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickActivate(sub.teacherEmail, 'lifetime')}
                          className="bg-slate-900 hover:bg-emerald-950/80 hover:border-emerald-500/60 text-slate-200 hover:text-emerald-300 border border-slate-800 rounded-xl p-2 text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5"
                          title="تفعيل مدى الحياة (10000 دج)"
                        >
                          <span className="text-xs font-black text-emerald-300">مدى الحياة 👑</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">10000 دج</span>
                        </button>
                      </div>

                      {/* أزرار الإجراءات الخاصة والتحكم */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {sub.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleQuickActivate(sub.teacherEmail, sub.planId === 'none' ? '6months' : (sub.planId as SubscriptionPlanId))}
                            className="flex-1 min-w-[180px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black px-3.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>تأكيد الحوالة والتفعيل الفوري ✓</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubForEdit(sub);
                            setCustomPlan(sub.planId === 'none' ? '6months' : (sub.planId as SubscriptionPlanId));
                            setCustomPrice(sub.amountDZD || 3000);
                            setCustomDays(180);
                            setAdminNotes(sub.adminNotes || '');
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>تخصيص المدة والسعر</span>
                        </button>

                        {!isAdminAccount && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubToExtend(sub);
                              setExtendDaysInput(30);
                              setExtendReasonInput('');
                            }}
                            className="bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                            title="تمديد فترة الاشتراك بإضافة أيام إضافية"
                          >
                            <Timer className="w-3.5 h-3.5 text-indigo-400" />
                            <span>تمديد ⏳</span>
                          </button>
                        )}

                        {!isAdminAccount && (
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(sub)}
                            className={`text-xs font-bold px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                              sub.status === 'suspended'
                                ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-700/60'
                                : 'bg-orange-950/80 hover:bg-orange-900 text-orange-300 border-orange-800/60'
                            }`}
                            title={sub.status === 'suspended' ? 'إلغاء التعطيل وتنشيط الحساب' : 'تعطيل الحساب مؤقتاً وحجب الوصول'}
                          >
                            {sub.status === 'suspended' ? (
                              <>
                                <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                                <span>رفع التعطيل ▶️</span>
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-3.5 h-3.5 text-orange-400" />
                                <span>تعطيل مؤقت 🛑</span>
                              </>
                            )}
                          </button>
                        )}

                        {!isAdminAccount && sub.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleExpire(sub.teacherEmail)}
                            className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 border border-rose-800/60 cursor-pointer"
                            title="إيقاف الاشتراك"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>إنهاء</span>
                          </button>
                        )}

                        {!isAdminAccount && sub.status === 'expired' && (
                          <button
                            type="button"
                            onClick={() => handleQuickActivate(sub.teacherEmail, '1year')}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>إعادة التفعيل</span>
                          </button>
                        )}

                        {!isAdminAccount && (
                          <button
                            type="button"
                            onClick={() => setSubToDelete(sub)}
                            className="bg-rose-950/90 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-600/70 text-xs font-black px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            title="حذف هذا الحساب نهائياً من السيرفر والسجلات وإجبار صاحب الحساب على إعادة التسجيل"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>حذف نهائي 🗑️</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* التذييل */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">نظام التفعيل محمي أمنياً: التفعيل يتم حصرياً من هذه اللوحة.</span>
            <span className="sm:hidden text-emerald-400 font-bold">تفعيل محمي بكلمة المرور</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-1.5 rounded-xl cursor-pointer text-xs"
          >
            إغلاق ✕
          </button>
        </div>

      </div>

      {/* نافذة تخصيص المدة والسعر من طرف المشرف */}
      {selectedSubForEdit && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">
                تخصيص مدة وسعر الاشتراك (خاص بالمدير)
              </h3>
              <button
                onClick={() => setSelectedSubForEdit(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              الأستاذ: <strong className="text-white">{selectedSubForEdit.teacherEmail}</strong>
            </p>

            <form onSubmit={handleSaveCustomActivation} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">الخطة الأساسية</label>
                <select
                  value={customPlan}
                  onChange={(e) => {
                    const p = e.target.value as SubscriptionPlanId;
                    setCustomPlan(p);
                    const t = SUBSCRIPTION_TIERS.find(x => x.id === p);
                    if (t) {
                      setCustomPrice(t.priceDZD);
                      setCustomDays(t.durationDays || 365);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {SUBSCRIPTION_TIERS.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.priceDZD} دج)
                    </option>
                  ))}
                </select>
              </div>

              {customPlan !== 'lifetime' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">عدد أيام الصلاحية الممنوحة</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={customDays}
                    onChange={(e) => setCustomDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    الشهر التقويمي = 30 يوماً | 6 أشهر = 180 يوماً | السنة الكاملة = 365 يوماً
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">السعر المعتمد (دج)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">ملاحظات المشرف للتفعيل</label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="مثال: تم التأكد من وصول الحوالة عبر بريدي موب وتفعيل الحساب..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubForEdit(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30"
                >
                  تأكيد التفعيل وحفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة وتفعيل أستاذ يدوياً */}
      {showAddNewTeacherModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">
                إضافة وتفعيل اشتراك أستاذ يدوياً
              </h3>
              <button
                onClick={() => setShowAddNewTeacherModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewTeacherSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">البريد الإلكتروني للأستاذ (Google)</label>
                <input
                  type="email"
                  required
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  placeholder="prof.example@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم الأستاذ الكامل</label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="أ. كريم بن سالم"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">خطة الاشتراك المراد تفعيلها</label>
                <select
                  value={newTeacherPlan}
                  onChange={(e) => setNewTeacherPlan(e.target.value as SubscriptionPlanId)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {SUBSCRIPTION_TIERS.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.priceDZD} دج)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddNewTeacherModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30"
                >
                  تفعيل وإضافة الأستاذ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الحذف النهائي لحساب الأستاذ */}
      {subToDelete && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-black text-white text-base">تأكيد الحذف النهائي للحساب</h3>
              </div>
              <button
                onClick={() => setSubToDelete(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-2xl text-rose-200">
                ⚠️ تحذير أمني: أنت على وشك حذف حساب الأستاذ نهائياً من قاعدة البيانات والسيرفر الرئيسي!
              </p>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div>الاسم: <strong className="text-white">{subToDelete.teacherName}</strong></div>
                <div>البريد: <strong className="text-amber-300 font-mono">{subToDelete.teacherEmail}</strong></div>
                <div>الحالة الحالية: <strong className="text-slate-200">{subToDelete.status}</strong></div>
              </div>
              <p className="text-slate-400">
                سيؤدي هذا الإجراء لإزالة السجل تماماً من المنصة. هل أنت متأكد؟
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، حذف الحساب نهائياً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تمديد فترة الاشتراك للأستاذ */}
      {subToExtend && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/50 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Timer className="w-5 h-5" />
                <h3 className="font-black text-white text-base">تمديد فترة الاشتراك ⏳</h3>
              </div>
              <button
                onClick={() => setSubToExtend(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <p>تمديد الاشتراك للأستاذ: <strong className="text-white">{subToExtend.teacherName}</strong></p>
              <p className="font-mono text-indigo-300">{subToExtend.teacherEmail}</p>
              {subToExtend.expiresAt && (
                <p className="text-[11px] text-slate-400">
                  تاريخ الانتهاء الحالي: <strong className="font-mono text-amber-300">{new Date(subToExtend.expiresAt).toLocaleDateString('ar-DZ')}</strong>
                </p>
              )}
            </div>

            <form onSubmit={handleConfirmExtend} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اختر أو حدد عدد أيام التمديد الإضافية:</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {[
                    { label: '+15 يوم', days: 15 },
                    { label: '+30 يوم (شهر)', days: 30 },
                    { label: '+90 يوم (3 أشهر)', days: 90 },
                    { label: '+180 يوم (6 أشهر)', days: 180 },
                    { label: '+365 يوم (سنة)', days: 365 }
                  ].map(opt => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setExtendDaysInput(opt.days)}
                      className={`py-2 px-2 rounded-xl font-bold border transition text-center ${
                        extendDaysInput === opt.days
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  max="3650"
                  required
                  value={extendDaysInput}
                  onChange={(e) => setExtendDaysInput(Number(e.target.value))}
                  placeholder="عدد الأيام..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">سبب التمديد / ملاحظة المشرف:</label>
                <input
                  type="text"
                  value={extendReasonInput}
                  onChange={(e) => setExtendReasonInput(e.target.value)}
                  placeholder="مثال: مكافأة الأستاذ المتميز / تمديد استثنائي..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubToExtend(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Timer className="w-4 h-4" />
                  <span>تأكيد تمديد الاشتراك</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
