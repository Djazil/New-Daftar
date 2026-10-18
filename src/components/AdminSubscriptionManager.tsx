import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  UserCheck, Search, Calendar, RefreshCw, X,
  Trash2, ShieldAlert, PauseCircle, PlayCircle,
  RotateCcw, History, FileSpreadsheet, Ban, UserX
} from 'lucide-react';
import { AuthUser, SubscriptionPlanId, TeacherSubscription, AdminAuditLog } from '../types';
import {
  ADMIN_EMAIL, SUBSCRIPTION_TIERS, loadAllSubscriptions,
  activateTeacherSubscription, fetchSubscriptionsFromServer,
  cancelTeacherSubscription, suspendTeacherAccount,
  resetTeacherNotebookData, permanentlyDeleteTeacherAccount,
  fetchAdminAuditLogs, getDeletedEmails
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
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'active' | 'suspended' | 'audit'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // سجل التدقيق الإداري
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // حالة اختيار الخطة والتفعيل
  const [selectedSubForEdit, setSelectedSubForEdit] = useState<TeacherSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('lifetime');

  // حالة إلغاء الاشتراك
  const [subToCancel, setSubToCancel] = useState<TeacherSubscription | null>(null);
  const [cancelReason, setCancelReason] = useState('انتهاء المدة المتفق عليها / طلب تجديد الوصل');

  // حالة إيقاف / رفع إيقاف الحساب
  const [subToSuspend, setSubToSuspend] = useState<TeacherSubscription | null>(null);
  const [suspendReason, setSuspendReason] = useState('إيقاف مؤقت لمراجعة البيانات البيداغوجية');

  // حالة تصفير بيانات الدفتر
  const [subToResetData, setSubToResetData] = useState<TeacherSubscription | null>(null);

  // حالة الحذف النهائي
  const [subToDelete, setSubToDelete] = useState<TeacherSubscription | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // مزامنة الاشتراكات وسجل التدقيق
  useEffect(() => {
    let isMounted = true;

    // جلب أولي من السيرفر
    fetchSubscriptionsFromServer().then(data => {
      if (isMounted && data) {
        setSubscriptions(data);
      }
    });

    fetchAdminAuditLogs().then(logs => {
      if (isMounted && logs) {
        setAuditLogs(logs);
      }
    });

    // اشتراك مباشر مع Firestore
    const unsub = subscribeToAllSubscriptionsInFirestore((firestoreMap) => {
      if (isMounted && firestoreMap) {
        const deleted = getDeletedEmails();
        const filtered: Record<string, TeacherSubscription> = {};
        Object.keys(firestoreMap).forEach(key => {
          const clean = key.toLowerCase();
          if (!deleted.includes(clean) || clean === ADMIN_EMAIL.toLowerCase()) {
            filtered[clean] = firestoreMap[key];
          }
        });
        setSubscriptions(filtered);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const reloadData = async () => {
    setIsSyncing(true);
    const data = await fetchSubscriptionsFromServer();
    setSubscriptions(data);
    const logs = await fetchAdminAuditLogs();
    setAuditLogs(logs);
    setIsSyncing(false);
    if (onSubscriptionUpdated) onSubscriptionUpdated();
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 1. تفعيل الاشتراك
  const handleActivate = async (teacherEmail: string, planId: SubscriptionPlanId) => {
    const res = await activateTeacherSubscription(currentUser.email, teacherEmail, {
      adminNotes: `تم تفعيل الحساب (${planId}) من طرف المشرف الرئيسي`
    });
    if (res.success) {
      showToast(res.message, 'success');
      setSelectedSubForEdit(null);
      await reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // 2. إلغاء الاشتراك فقط (تحويله إلى pending دون حذف حساب Google أو حظر البريد)
  const handleConfirmCancel = async () => {
    if (!subToCancel) return;
    const targetEmail = subToCancel.teacherEmail.trim().toLowerCase();
    const res = await cancelTeacherSubscription(currentUser.email, targetEmail, cancelReason);
    if (res.success) {
      showToast(res.message, 'success');
      setSubToCancel(null);
      await reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // 3. إيقاف / رفع الإيقاف عن الحساب
  const handleConfirmSuspend = async () => {
    if (!subToSuspend) return;
    const targetEmail = subToSuspend.teacherEmail.trim().toLowerCase();
    const isCurrentlySuspended = subToSuspend.status === 'suspended';
    const res = await suspendTeacherAccount(currentUser.email, targetEmail, !isCurrentlySuspended, suspendReason);
    if (res.success) {
      showToast(res.message, 'success');
      setSubToSuspend(null);
      await reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // 4. تصفير بيانات الدفتر
  const handleConfirmResetData = async () => {
    if (!subToResetData) return;
    const targetEmail = subToResetData.teacherEmail.trim().toLowerCase();
    const res = await resetTeacherNotebookData(currentUser.email, targetEmail);
    if (res.success) {
      showToast(res.message, 'success');
      setSubToResetData(null);
      await reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // 5. الحذف النهائي الصريح (دون حظر الـ Gmail من التسجيل مستقبلاً)
  const handleConfirmPermanentDelete = async () => {
    if (!subToDelete) return;
    const targetEmail = subToDelete.teacherEmail.trim().toLowerCase();
    const res = await permanentlyDeleteTeacherAccount(currentUser.email, targetEmail, 'DELETE_CONFIRMED');
    if (res.success) {
      showToast(res.message, 'success');
      setSubscriptions(prev => {
        const copy = { ...prev };
        delete copy[targetEmail];
        return copy;
      });
      setSubToDelete(null);
      setDeleteConfirmationInput('');
      await reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  const list = Object.values(subscriptions).filter(s => s && s.teacherEmail);

  // التصفية بحسب التبويب النشط
  const filteredList = list.filter(item => {
    if (filterTab === 'pending' && item.status !== 'pending' && item.status !== 'none') return false;
    if (filterTab === 'active' && item.status !== 'active') return false;
    if (filterTab === 'suspended' && item.status !== 'suspended') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.teacherEmail.toLowerCase().includes(q) ||
        (item.teacherName && item.teacherName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = list.filter(s => s.status === 'pending' || s.status === 'none').length;
  const activeCount = list.filter(s => s.status === 'active').length;
  const suspendedCount = list.filter(s => s.status === 'suspended').length;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl text-right overflow-hidden">
        
        {/* هيدر لوحة التحكم */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">لوحة تحكم إدارة حسابات واشتراكات الأساتذة</h2>
              <p className="text-xs text-slate-400 font-mono">حساب المشرف الرئيسي: {ADMIN_EMAIL}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={reloadData}
              disabled={isSyncing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="تحديث ومزامنة البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="إغلاق اللوحة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* إشعار التنبيه Toast */}
        {feedbackMsg && (
          <div className={`p-3 text-xs font-bold flex items-center gap-2 border-b animate-fadeIn ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
              : 'bg-rose-950/70 text-rose-300 border-rose-800'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* أشرطة التصفية والتنقل */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial cursor-pointer ${
                filterTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({list.length})
            </button>

            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial flex items-center justify-center gap-1 cursor-pointer ${
                filterTab === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>قيد المراجعة</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial cursor-pointer ${
                filterTab === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              المفعلة ({activeCount})
            </button>

            <button
              onClick={() => setFilterTab('suspended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial flex items-center justify-center gap-1 cursor-pointer ${
                filterTab === 'suspended' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>الموقوفة</span>
              {suspendedCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-400 text-slate-950 rounded-full text-[10px] font-black">
                  {suspendedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab('audit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial flex items-center justify-center gap-1 cursor-pointer ${
                filterTab === 'audit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل التدقيق</span>
            </button>
          </div>

          {filterTab !== 'audit' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="البحث باسم أو بريد الأستاذ..."
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* عرض المحتوى بحسب التبويب */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {/* تبويب سجل التدقيق الإداري */}
          {filterTab === 'audit' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-400">سجل الإجراءات والعمليات الإدارية المنفذة:</span>
                <span className="text-[11px] text-slate-500">إجمالي السجلات: {auditLogs.length}</span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                  <History className="w-8 h-8 mx-auto text-slate-600" />
                  <p>لا توجد إجراءات إدارية مسجلة بعد في سجل التدقيق.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map(log => {
                    const isSuccess = log.result === 'success';
                    return (
                      <div key={log.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.actionType === 'activate' ? 'bg-emerald-500/20 text-emerald-300' :
                              log.actionType === 'cancel_subscription' ? 'bg-amber-500/20 text-amber-300' :
                              log.actionType === 'suspend' ? 'bg-rose-500/20 text-rose-300' :
                              log.actionType === 'unsuspend' ? 'bg-blue-500/20 text-blue-300' :
                              log.actionType === 'reset_notebook_data' ? 'bg-indigo-500/20 text-indigo-300' :
                              'bg-rose-600/30 text-rose-200'
                            }`}>
                              {log.actionType === 'activate' ? 'تفعيل اشتراك' :
                               log.actionType === 'cancel_subscription' ? 'إلغاء اشتراك' :
                               log.actionType === 'suspend' ? 'إيقاف مؤقت' :
                               log.actionType === 'unsuspend' ? 'رفع إيقاف' :
                               log.actionType === 'reset_notebook_data' ? 'تصفير بيانات الدفتر' :
                               'حذف نهائي'}
                            </span>
                            <span className="font-mono text-slate-200 font-bold">{log.targetTeacherEmail}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{log.details || 'لا توجد تفاصيل إضافية'}</p>
                        </div>

                        <div className="text-left shrink-0 space-y-0.5">
                          <span className={`text-[10px] font-bold block ${isSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isSuccess ? 'ناجح ✓' : 'فشل ✗'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {new Date(log.timestamp).toLocaleString('ar-DZ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            filteredList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                <UserCheck className="w-8 h-8 mx-auto text-slate-600" />
                <p>لا توجد حسابات مسجلة ضمن هذا التصنيف حالياً.</p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isAdmin = item.teacherEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                const isPending = item.status === 'pending' || item.status === 'none';
                const isActive = item.status === 'active';
                const isSuspended = item.status === 'suspended';

                return (
                  <div
                    key={item.teacherEmail}
                    className={`p-4 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                      isAdmin
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : isSuspended
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : isPending
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-bold text-white">
                          {item.teacherName || 'أستاذ(ة)'}
                        </strong>
                        {isAdmin && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            مدير المنصة
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            قيد المراجعة
                          </span>
                        )}
                        {isActive && !isAdmin && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            اشتراك مفعل
                          </span>
                        )}
                        {isSuspended && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                            حساب موقوف مؤقتاً
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-mono text-slate-400">{item.teacherEmail}</p>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
                        {item.requestedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>التسجيل: {new Date(item.requestedAt).toLocaleDateString('ar-DZ')}</span>
                          </span>
                        )}
                        {item.phoneNumber && (
                          <span>الهاتف: {item.phoneNumber}</span>
                        )}
                        {item.adminNotes && (
                          <span className="text-slate-400 truncate max-w-xs">ملاحظة: {item.adminNotes}</span>
                        )}
                      </div>
                    </div>

                    {/* أزرار العمليات الإدارية المنفصلة بوضوح */}
                    {!isAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 flex-wrap">
                        
                        {/* 1. زر التفعيل / التجديد */}
                        <button
                          onClick={() => {
                            setSelectedSubForEdit(item);
                            setSelectedPlan('lifetime');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                          title="تفعيل اشتراك الأستاذ"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تفعيل</span>
                        </button>

                        {/* 2. زر إلغاء الاشتراك (فقط إلغاء الاستحقاق دون مساس بالحساب) */}
                        {isActive && (
                          <button
                            onClick={() => setSubToCancel(item)}
                            className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-600/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="إلغاء الاشتراك وتحويل الحساب إلى قيد المراجعة دون حظر"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>إلغاء الاشتراك</span>
                          </button>
                        )}

                        {/* 3. زر إيقاف الحساب / رفع الإيقاف */}
                        <button
                          onClick={() => setSubToSuspend(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isSuspended
                              ? 'bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40'
                              : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800'
                          }`}
                          title={isSuspended ? 'رفع الإيقاف وتنشيط الحساب' : 'إيقاف الحساب مؤقتاً'}
                        >
                          {isSuspended ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                          <span>{isSuspended ? 'رفع الإيقاف' : 'إيقاف مؤقت'}</span>
                        </button>

                        {/* 4. تصفير بيانات الدفتر */}
                        <button
                          onClick={() => setSubToResetData(item)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="تصفير وإعادة تعيين بيانات الأقسام والتلاميذ لهذا الأستاذ"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* 5. زر الحذف النهائي المنفصل مع تحذير */}
                        <button
                          onClick={() => {
                            setSubToDelete(item);
                            setDeleteConfirmationInput('');
                          }}
                          className="p-1.5 rounded-xl bg-rose-950 hover:bg-rose-800 text-rose-400 hover:text-white transition cursor-pointer"
                          title="حذف الحساب نهائياً من قاعدة البيانات"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>

        {/* 1. نافذة اختيار الخطة عند الضغط على تفعيل */}
        {selectedSubForEdit && (
          <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white">تفعيل اشتراك أستاذ</h3>
                <button
                  onClick={() => setSelectedSubForEdit(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">{selectedSubForEdit.teacherName}</p>
                <p className="text-xs font-mono text-slate-400">{selectedSubForEdit.teacherEmail}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">نوع وخطة التفعيل:</label>
                <div className="grid grid-cols-1 gap-2">
                  {SUBSCRIPTION_TIERS.map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedPlan(tier.id)}
                      className={`p-3 rounded-xl border text-right transition cursor-pointer ${
                        selectedPlan === tier.id
                          ? 'bg-emerald-950/80 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <strong className="block text-xs">{tier.name}</strong>
                      <span className="text-[10px] text-emerald-400 font-bold">{tier.priceDZD} دج • {tier.durationLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedSubForEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleActivate(selectedSubForEdit.teacherEmail, selectedPlan)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer"
                >
                  تأكيد التفعيل
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. نافذة تأكيد إلغاء الاشتراك (Cancel Subscription Modal) */}
        {subToCancel && (
          <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
              <div className="flex items-center gap-2 text-amber-400 border-b border-slate-800 pb-3">
                <Ban className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">إلغاء الاشتراك فقط</h3>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p>
                  هل تريد إلغاء اشتراك الأستاذ (<strong className="text-white font-mono">{subToCancel.teacherEmail}</strong>)؟
                </p>
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-1 text-[11px] text-amber-200">
                  <p>✓ لن يتم حذف حساب Google أو حظر البريد الإلكتروني.</p>
                  <p>✓ سيتحول الحساب إلى وضعية «قيد المراجعة» ليتمكن من طلب تجديد الاشتراك.</p>
                  <p>✓ تظل سجلات وبيانات الدفتر محفوظة.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">سبب إلغاء الاشتراك:</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSubToCancel(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition cursor-pointer"
                >
                  تأكيد إلغاء الاشتراك
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. نافذة تأكيد إيقاف الحساب مؤقتاً (Suspend Account Modal) */}
        {subToSuspend && (
          <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
              <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-3">
                <PauseCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  {subToSuspend.status === 'suspended' ? 'رفع الإيقاف وتنشيط الحساب' : 'إيقاف الحساب مؤقتاً'}
                </h3>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p>
                  {subToSuspend.status === 'suspended'
                    ? `هل تريد رفع الإيقاف عن حساب (${subToSuspend.teacherEmail}) وتمكينه مجدداً من دخول الدفتر؟`
                    : `هل تريد إيقاف حساب (${subToSuspend.teacherEmail}) مؤقتاً؟`}
                </p>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-400">
                  <p>✓ تبقى هوية Google وسجلات الأستاذ محفوظة بالكامل.</p>
                  <p>✓ في حالة الإيقاف، يظهر للأستاذ إشعار الإيقاف المؤقت عند محاولة فتح الدفتر.</p>
                </div>

                {subToSuspend.status !== 'suspended' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">سبب الإيقاف المؤقت:</label>
                    <input
                      type="text"
                      value={suspendReason}
                      onChange={e => setSuspendReason(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSubToSuspend(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmSuspend}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition cursor-pointer ${
                    subToSuspend.status === 'suspended' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {subToSuspend.status === 'suspended' ? 'رفع الإيقاف وتنشيط' : 'إيقاف الحساب مؤقتاً'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. نافذة تأكيد تصفير ملف الأستاذ */}
        {subToResetData && (
          <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
              <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-3">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">إعادة تعيين وتصفير ملف الأستاذ</h3>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p>
                  هل تريد تصفير بيانات أقسام وتلاميذ الأستاذ (<strong className="text-white font-mono">{subToResetData.teacherEmail}</strong>) وإعادتها للقالب الأولي؟
                </p>
                <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-1 text-[11px] text-indigo-200">
                  <p>✓ لا يتم حذف حساب Google أو المصادقة أو حالة الاشتراك.</p>
                  <p>✓ يتم فقط تصفير الأقسام المحلية لتتيح للأستاذ البدء من جديد.</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSubToResetData(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmResetData}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  تأكيد تصفير البيانات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. نافذة تأكيد الحذف النهائي الصريح (مع تحذير وعدم حظر) */}
        {subToDelete && (
          <div className="fixed inset-0 z-[110] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-800/80 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
              
              <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-3">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">تأكيد الحذف النهائي الصريح للحساب</h3>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p>
                  هل أنت متأكد من حذف سجل حساب الأستاذ (<strong className="text-white font-mono">{subToDelete.teacherEmail}</strong>) نهائياً من قاعدة البيانات؟
                </p>
                <div className="p-3 bg-rose-950/40 border border-rose-600/40 rounded-xl space-y-1 text-[11px] text-rose-200">
                  <p>⚠️ سيتم حذف مستند الاشتراك وسجل الأستاذ من السيرفر وقاعدة البيانات.</p>
                  <p>✓ لن يتم وضع بريد Gmail في أي قائمة حظر؛ إذا قام الأستاذ بتسجيل الدخول مستقبلاً سيظهر كحساب جديد قيد المراجعة دون صلاحيات.</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSubToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmPermanentDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition cursor-pointer"
                >
                  نعم، حذف السجل نهائياً
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
