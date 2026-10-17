import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle,
  UserCheck, Search, Calendar, RefreshCw, X, Check,
  Trash2, ShieldAlert, Sparkles, UserPlus
} from 'lucide-react';
import { AuthUser, SubscriptionPlanId, TeacherSubscription } from '../types';
import {
  ADMIN_EMAIL, SUBSCRIPTION_TIERS, loadAllSubscriptions,
  activateTeacherSubscription, fetchSubscriptionsFromServer,
  deleteTeacherAccount, getDeletedEmails
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
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'active'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // حالة اختيار الخطة والتفعيل
  const [selectedSubForEdit, setSelectedSubForEdit] = useState<TeacherSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('1year');

  // حالة الحذف النهائي
  const [subToDelete, setSubToDelete] = useState<TeacherSubscription | null>(null);

  // المزامنة الحية مع Firestore
  useEffect(() => {
    let isMounted = true;

    // جلب أولي من السيرفر
    fetchSubscriptionsFromServer().then(data => {
      if (isMounted && data) {
        setSubscriptions(data);
      }
    });

    // اشتراك مباشر مع Firestore مع إلغاء الحسابات المحذوفة فوراً
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
    setIsSyncing(false);
    if (onSubscriptionUpdated) onSubscriptionUpdated();
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // تفعيل الاشتراك
  const handleActivate = async (teacherEmail: string, planId: SubscriptionPlanId) => {
    const res = await activateTeacherSubscription(currentUser.email, teacherEmail, { adminNotes: 'تم تفعيل الحساب مدى الحياة من طرف المشرف' });
    if (res.success) {
      showToast(res.message, 'success');
      setSelectedSubForEdit(null);
      await reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // حذف / رفض الحساب نهائياً وإزالته فوراً من القائمة
  const handleConfirmDelete = async () => {
    if (!subToDelete) return;
    const targetEmail = subToDelete.teacherEmail.trim().toLowerCase();
    const res = await deleteTeacherAccount(currentUser.email, targetEmail);
    if (res.success) {
      showToast(res.message, 'success');
      setSubscriptions(prev => {
        const copy = { ...prev };
        delete copy[targetEmail];
        return copy;
      });
      setSubToDelete(null);
      await reloadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  const list = Object.values(subscriptions).filter(s => s && s.teacherEmail);

  // التصفية بدون أي حسابات تجريبية
  const filteredList = list.filter(item => {
    if (filterTab === 'pending' && item.status !== 'pending' && item.status !== 'none') return false;
    if (filterTab === 'active' && item.status !== 'active') return false;

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl text-right overflow-hidden">
        
        {/* هيدر لوحة التحكم البسيط */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">لوحة تحكم المشرف الرئيسي</h2>
              <p className="text-xs text-slate-400 font-mono">حساب المشرف: djazild@gmail.com</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={reloadData}
              disabled={isSyncing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* إشعار التنبيه Toast */}
        {feedbackMsg && (
          <div className={`p-3 text-xs font-bold flex items-center gap-2 border-b ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
              : 'bg-rose-950/60 text-rose-300 border-rose-800'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* شريط البحث والتصفية الإحصائي */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial ${
                filterTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              جميع الحسابات ({list.length})
            </button>

            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial flex items-center justify-center gap-1 ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial ${
                filterTab === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              المفعلة ({activeCount})
            </button>
          </div>

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
        </div>

        {/* قائمة الحسابات المباشرة البسيطة */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs space-y-2">
              <UserCheck className="w-8 h-8 mx-auto text-slate-600" />
              <p>لا توجد حسابات مسجلة ضمن هذا التصنيف حالياً.</p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isAdmin = item.teacherEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
              const isPending = item.status === 'pending' || item.status === 'none';
              const isActive = item.status === 'active';

              return (
                <div
                  key={item.teacherEmail}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isAdmin
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : isPending
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
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
                          مفعل
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-mono text-slate-400">{item.teacherEmail}</p>

                    {item.requestedAt && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>تاريخ التسجيل: {new Date(item.requestedAt).toLocaleDateString('ar-DZ')}</span>
                      </p>
                    )}
                  </div>

                  {/* أزرار الإجراءات البسيطة: قبول/تفعيل و رفض/حذف */}
                  {!isAdmin && (
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      
                      <button
                        onClick={() => {
                          setSelectedSubForEdit(item);
                          setSelectedPlan('1year');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>قبول / تفعيل</span>
                      </button>

                      <button
                        onClick={() => setSubToDelete(item)}
                        className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="حذف الحساب نهائياً وتوقيف اشتراكه"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>رفض / حذف</span>
                      </button>

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* نافذة اختيار الخطة عند الضغط على تفعيل */}
        {selectedSubForEdit && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white">تفعيل اشتراك أستاذ</h3>
                <button
                  onClick={() => setSelectedSubForEdit(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">{selectedSubForEdit.teacherName}</p>
                <p className="text-xs font-mono text-slate-400">{selectedSubForEdit.teacherEmail}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">اختر مدة التفعيل المطلوب:</label>
                <div className="grid grid-cols-2 gap-2">
                  {SUBSCRIPTION_TIERS.map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedPlan(tier.id)}
                      className={`p-3 rounded-xl border text-right transition ${
                        selectedPlan === tier.id
                          ? 'bg-emerald-950/80 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <strong className="block text-xs">{tier.name}</strong>
                      <span className="text-[10px] text-emerald-400 font-bold">{tier.priceDZD} دج</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedSubForEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleActivate(selectedSubForEdit.teacherEmail, selectedPlan)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition"
                >
                  تأكيد التفعيل
                </button>
              </div>
            </div>
          </div>
        )}

        {/* نافذة تأكيد الحذف النهائي */}
        {subToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-800/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
              
              <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-3">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">تأكيد الحذف النهائي للحساب</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                هل أنت تأكد من رفض وتوقيف وحذف حساب الأستاذ (<strong className="text-white font-mono">{subToDelete.teacherEmail}</strong>) نهائياً من القواعد السحابية والمنصة؟
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSubToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition cursor-pointer"
                >
                  نعم، حذف وتوقيف فوراً
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
