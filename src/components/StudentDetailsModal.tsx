import React, { useState } from 'react';
import {
  X, User, HeartHandshake, Award, AlertTriangle, Clock,
  CheckCircle2, Printer, Copy, Save, Edit3, ShieldCheck,
  TrendingUp, BookOpen, MessageSquare, Sparkles, Check, Trash2
} from 'lucide-react';
import { Student, ClassGroup } from '../types';

interface StudentDetailsModalProps {
  student: Student;
  classInfo: ClassGroup;
  onClose: () => void;
  onSaveStudent: (updatedStudent: Student) => void;
  calcAverage: (student: Student, hasTP: boolean) => number;
  onDeleteStudent?: (studentId: string) => void;
}

export default function StudentDetailsModal({
  student,
  classInfo,
  onClose,
  onSaveStudent,
  calcAverage,
  onDeleteStudent
}: StudentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'coordination' | 'grades'>('overview');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states for coordination and notes
  const [coordinationStatus, setCoordinationStatus] = useState(student.coordinationStatus || 'good');
  const [parentRecommendations, setParentRecommendations] = useState(student.parentRecommendations || '');
  const [parentNotes, setParentNotes] = useState(student.parentNotes || student.remark || '');
  const [strengths, setStrengths] = useState(student.strengths || '');
  const [areasForImprovement, setAreasForImprovement] = useState(student.areasForImprovement || '');
  const [remark, setRemark] = useState(student.remark || '');

  const avg = calcAverage(student, classInfo.hasTP);
  const cc = Math.max(0, Math.min(20, 10 + student.bonusPoints));
  const isUrgent = student.absencesCount >= 3 || coordinationStatus === 'urgent';

  const handleSave = () => {
    const updated: Student = {
      ...student,
      coordinationStatus: coordinationStatus as any,
      parentRecommendations,
      parentNotes,
      strengths,
      areasForImprovement,
      remark,
      lastCoordinationDate: new Date().toLocaleDateString('ar-DZ')
    };
    onSaveStudent(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCopyReport = () => {
    const text = `📋 تقرير التلميذ: ${student.lastName} ${student.firstName}
القسم: ${classInfo.name} | المستوى: ${classInfo.level} | الفوج: ${student.group}
رمز المتابعة للأولياء: ${student.parentCode}
المعدل الفصلي التقديري: ${avg} / 20
نقطة التقويم المستمر: ${cc} / 20
الغيابات المسجلة: ${student.absencesCount} غياب
ملاحظة وتوجيه الأستاذ: ${parentNotes || remark || 'تلميذ مواظب'}
توصيات الأستاذ للأولياء: ${parentRecommendations || 'المراجعة المنتظمة وحل الواجبات المنزلية.'}
نقاط القوة: ${strengths || 'المواظبة والمشاركة الصفية'}
محاور التحسين: ${areasForImprovement || 'تنظيم ورقة الإجابة وإدارة الوقت'}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scaleUp">
        {/* هيدر البطاقة */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-6 relative shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg shadow-blue-500/30 shrink-0">
                {student.firstName[0]}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-xl font-black text-white truncate">
                    {student.lastName} {student.firstName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
                    كود: {student.parentCode}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  القسم: <strong className="text-white">{classInfo.name}</strong> • الفوج: {student.group} • طاولة #{student.seatIndex + 1}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition shrink-0"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* تبويبات التنقل داخل بطاقة التلميذ المخصصة للهواتف */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-4 border-t border-white/10 pt-2.5 overflow-x-auto touch-scroll">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>نظرة عامة والنتائج</span>
            </button>
            <button
              onClick={() => setActiveTab('coordination')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                activeTab === 'coordination'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>التنسيق والتوصيات</span>
            </button>
            <button
              onClick={() => setActiveTab('grades')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                activeTab === 'grades'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>النقاط والملاحظات</span>
            </button>
          </div>
        </div>

        {/* جسم البطاقة */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* التبويب 1: نظرة عامة والنتائج */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* مؤشرات سريعة */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 font-bold block">المعدل التقديري</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">
                    {avg} <span className="text-xs text-slate-400 font-sans">/ 20</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {avg >= 14 ? 'مستوى ممتاز' : avg >= 10 ? 'مقبول' : 'يحتاج دعم'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 font-bold block">التقويم المستمر</span>
                  <div className="text-2xl font-black text-blue-600 font-mono mt-0.5">
                    {cc} <span className="text-xs text-slate-400 font-sans">/ 20</span>
                  </div>
                  <span className="text-[10px] text-slate-500">مشاركة: +{student.bonusPoints}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 font-bold block">الغيابات المسجلة</span>
                  <div className={`text-2xl font-black font-mono mt-0.5 ${isUrgent ? 'text-rose-600' : 'text-slate-700'}`}>
                    {student.absencesCount}
                  </div>
                  <span className={`text-[10px] font-bold ${isUrgent ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {isUrgent ? '⚠️ يستدعي إنذاراً' : 'منضبط تماماً'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 font-bold block">حالة التنسيق</span>
                  <div className="mt-1">
                    {coordinationStatus === 'urgent' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        حضور الولي مطلوب
                      </span>
                    ) : coordinationStatus === 'followup' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        متابعة منزلية
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        تواصل منتظم
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">كود الولي: {student.parentCode}</span>
                </div>
              </div>

              {/* بطاقة معلومات التلميذ والمقعد */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>معلومات التموضع في القسم ورمز المتابعة</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">المقعد المخصص:</span>
                    <strong className="text-slate-800 font-mono">طاولة #{student.seatIndex + 1}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">الفوج البيداغوجي:</span>
                    <strong className="text-slate-800">الفوج {student.group}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">كود ولي الأمر:</span>
                    <strong className="text-blue-700 font-mono">{student.parentCode}</strong>
                  </div>
                </div>
              </div>

              {/* ملخص توجيه الأستاذ */}
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 space-y-1.5">
                <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>توجيه وملاحظة الأستاذ المباشرة:</span>
                </span>
                <p className="text-xs text-indigo-950 leading-relaxed font-sans">
                  {student.parentRecommendations || student.remark || 'تلميذ مواظب وذو قابلية ممتازة للتحصيل والتطور، يُرجى الحفاظ على وتيرة العمل.'}
                </p>
              </div>
            </div>
          )}

          {/* التبويب 2: التنسيق مع أولياء الأمور */}
          {activeTab === 'coordination' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/80 p-3.5 rounded-2xl border border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="text-xs font-black text-indigo-950">إدارة التنسيق والتواصل مع ولي أمر التلميذ</h4>
                    <p className="text-[11px] text-indigo-800">تظهر هذه التوصيات لولي الأمر فوراً عند إدخال الكود ({student.parentCode})</p>
                  </div>
                </div>
              </div>

              {/* اختيار حالة التنسيق */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">حالة التنسيق الحالية:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCoordinationStatus('good')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                      coordinationStatus === 'good'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🟢 تواصل منتظم
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoordinationStatus('followup')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                      coordinationStatus === 'followup'
                        ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🟡 قيد المتابعة المنزلية
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoordinationStatus('urgent')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                      coordinationStatus === 'urgent'
                        ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🔴 استدعاء الولي عاجلاً
                  </button>
                </div>
              </div>

              {/* توصيات الأستاذ للأولياء للمتابعة في البيت */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>توصيات وتوجيهات الأستاذ للولي (للمتابعة في البيت):</span>
                </label>
                <textarea
                  rows={2}
                  value={parentRecommendations}
                  onChange={e => setParentRecommendations(e.target.value)}
                  placeholder="مثال: نوصي بمراجعة درس الحركة المستقيمة بانتظام، ومراقبة حل الواجبات المنزلية أسبوعياً..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* ملاحظات الأستاذ في القسم */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>ملاحظات الأستاذ حول المستوى والسلوك في القسم:</span>
                </label>
                <textarea
                  rows={2}
                  value={parentNotes}
                  onChange={e => setParentNotes(e.target.value)}
                  placeholder="مثال: تلميذ منضبط ومشارك، يحتاج مزيداً من التركيز أثناء التطبيقات الفردية..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              {/* نقاط القوة ونقاط التحسين */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>نقاط القوة والتميز:</span>
                  </label>
                  <input
                    type="text"
                    value={strengths}
                    onChange={e => setStrengths(e.target.value)}
                    placeholder="مثال: سرعة الحساب، التفاعل الصفي..."
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-amber-700 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>مجالات التحسين والتدارك:</span>
                  </label>
                  <input
                    type="text"
                    value={areasForImprovement}
                    onChange={e => setAreasForImprovement(e.target.value)}
                    placeholder="مثال: تنظيم ورقة الإجابة، إدارة الوقت..."
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* التبويب 3: تفاصيل النقاط والملاحظات */}
          {activeTab === 'grades' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-800 mb-3">كشف نقاط المادة المفصل (وفق الرقمنة الوزارية)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">التقويم المستمر</span>
                    <strong className="text-sm font-black text-blue-600 font-mono">{cc} / 20</strong>
                  </div>
                  {classInfo.hasTP && (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">العمل المخبري (TP)</span>
                      <strong className="text-sm font-black text-purple-600 font-mono">{student.tpScore || 14} / 20</strong>
                    </div>
                  )}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">الفرض 1</span>
                    <strong className="text-sm font-black text-slate-800 font-mono">{student.test1} / 20</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">الاختبار الفصلي</span>
                    <strong className="text-sm font-black text-emerald-600 font-mono">{student.exam} / 20</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">الملاحظة العامة المعتمدة في كشف النقاط:</label>
                <input
                  type="text"
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  placeholder="مثال: نتائج مشجعة ومستوى جيد، واصل العمل بنفس الجدية."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* سجل الغيابات والملاحظات السلوكية */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700">سجل الملاحظات والسلوك الأخير:</h5>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {student.logs.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">لا توجد ملاحظات سلوكية مسجلة.</p>
                  ) : (
                    student.logs.map(log => (
                      <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className={`font-bold ${log.type === 'positive' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {log.type === 'positive' ? 'مكافأة' : 'تنبيه'}
                          </span>
                          <span className="text-slate-600 mr-2">{log.reason}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{log.date}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* أزرار الإجراءات السفلية */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{isCopied ? 'تم نسخ التقرير!' : 'نسخ تقرير الولي'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>طباعة الاستمارة</span>
            </button>
            {onDeleteStudent && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="حذف هذا التلميذ نهائياً من القسم"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>حذف التلميذ</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'تم حفظ التعديلات بنجاح ✓' : 'حفظ التعديلات والتوصيات'}</span>
            </button>
          </div>
        </div>

        {/* نافذة تأكيد حذف التلميذ المباشرة والآمنة بدون window.confirm */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-200 text-center space-y-4 animate-scaleUp">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">تأكيد حذف التلميذ</h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  هل أنت متأكد من حذف التلميذ <strong className="text-rose-700 font-bold">{student.lastName} {student.firstName}</strong> نهائياً من قسم <span className="font-bold text-slate-700">{classInfo.name}</span>؟
                </p>
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  ⚠️ سيتم حذف التلميذ مع كافة نقاطه وملاحظاته وغياباته.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteStudent) {
                      onDeleteStudent(student.id);
                    }
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition cursor-pointer shadow-sm"
                >
                  نعم، تأكيد الحذف
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
