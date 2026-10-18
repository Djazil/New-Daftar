import React, { useState, useMemo } from 'react';
import {
  Users, Award, AlertTriangle, TrendingUp, Search, X, Sliders,
  ChevronLeft, ChevronRight, CheckCircle2, ArrowUpRight, ArrowDownRight,
  BookOpen, Sparkles, MessageSquare, BarChart3, HelpCircle, Save, Filter
} from 'lucide-react';
import { Student, ClassGroup, TeacherProfile } from '../types';

interface AnalyticsSectionRedesignProps {
  activeClass: ClassGroup;
  allClasses: ClassGroup[];
  onSelectClass: (classId: string) => void;
  teacherProfile: TeacherProfile;
  calcStudentAverage: (student: Student, hasTP: boolean) => number;
  onSaveStudent: (updatedStudent: Student) => void;
  onOpenStudentDetails: (student: Student) => void;
  onOpenSettings?: () => void;
}

// دالة توحيد وتنظيف النصوص العربية للبحث الفعال
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '') // إزالة التشكيل
    .replace(/[أإآ]/g, 'ا') // توحيد الألف
    .replace(/ى/g, 'ي') // توحيد الياء
    .replace(/ة/g, 'ه'); // توحيد التاء المربوطة
}

export default function AnalyticsSectionRedesign({
  activeClass,
  allClasses,
  onSelectClass,
  teacherProfile,
  calcStudentAverage,
  onSaveStudent,
  onOpenStudentDetails,
  onOpenSettings
}: AnalyticsSectionRedesignProps) {
  // حالات محرك البحث السريع
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // حالات النوافذ المنبثقة الخمس للهاتف
  const [activeModal, setActiveModal] = useState<
    'classAverage' | 'followUp' | 'improved' | 'comparison' | null
  >(null);

  // حالات أداة مقارنة التقييمات
  const [eval1Type, setEval1Type] = useState<'test1' | 'test2' | 'tpScore'>('test1');
  const [eval2Type, setEval2Type] = useState<'test2' | 'exam' | 'test1'>('exam');

  // تصفية نتائج المتابعة بداخل النافذة
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'under10' | 'dropped'>('all');

  const subjectName = teacherProfile?.subject || 'المادة الدراسية';
  const hasSubjectDefined = Boolean(teacherProfile?.subject && teacherProfile.subject.trim().length > 0);

  // -------------------------------------------------------------
  // حسابات المؤشرات الأربعة الرئيسية المقتصرة على مادة الأستاذ
  // -------------------------------------------------------------
  const students = activeClass?.students || [];
  const totalStudents = students.length;

  // 1. حساب المعدلات الفردية
  const studentsWithAvg = useMemo(() => {
    return students.map(st => {
      const avg = calcStudentAverage(st, activeClass.hasTP);
      const test1 = st.test1 || 0;
      const test2 = st.test2 || 0;
      const exam = st.exam || 0;

      // الفرق بين آخر تقييمين متاحين
      let scoreDelta = 0;
      let hasEnoughEvals = false;
      if (exam > 0 && test1 > 0) {
        scoreDelta = exam - test1;
        hasEnoughEvals = true;
      } else if (test2 > 0 && test1 > 0) {
        scoreDelta = test2 - test1;
        hasEnoughEvals = true;
      }

      // تحديد سبب المتابعة
      const isUnder10 = avg < 10;
      const isDroppedBy2 = hasEnoughEvals && scoreDelta <= -2;
      const needsFollowUp = isUnder10 || isDroppedBy2;

      let followUpReason = '';
      if (isUnder10 && isDroppedBy2) {
        followUpReason = `المعدل أقل من 10 (${avg.toFixed(2)}) وتراجع بـ ${Math.abs(scoreDelta).toFixed(1)} ن`;
      } else if (isUnder10) {
        followUpReason = `المعدل دون عتبة النجاح (${avg.toFixed(2)} / 20)`;
      } else if (isDroppedBy2) {
        followUpReason = `تراجع العلامة بـ ${Math.abs(scoreDelta).toFixed(1)} نقطة بين التقييمات`;
      }

      // تحديد هل التلميذ تحسن
      const isImproved = (avg >= 10 && scoreDelta >= 0.5) || (hasEnoughEvals && scoreDelta >= 1.0);

      return {
        ...st,
        avg,
        scoreDelta,
        hasEnoughEvals,
        needsFollowUp,
        followUpReason,
        isImproved
      };
    });
  }, [students, activeClass.hasTP, calcStudentAverage]);

  // 2. معدل القسم
  const classAvgNumber = useMemo(() => {
    if (totalStudents === 0) return 0;
    const sum = studentsWithAvg.reduce((acc, s) => acc + s.avg, 0);
    return sum / totalStudents;
  }, [studentsWithAvg, totalStudents]);

  // 3. عدد الذين يحتاجون لمتابعة
  const followUpStudents = useMemo(() => {
    return studentsWithAvg.filter(s => s.needsFollowUp);
  }, [studentsWithAvg]);

  // 4. عدد الذين تحسنت نتائجهم
  const improvedStudents = useMemo(() => {
    return studentsWithAvg.filter(s => s.isImproved);
  }, [studentsWithAvg]);

  // تصفية البحث الفوري عن التلميذ بالاسم واللقب
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const norm = normalizeArabicText(searchQuery);
    return studentsWithAvg.filter(s => {
      const fullNameNorm = normalizeArabicText(`${s.lastName} ${s.firstName} ${s.firstName} ${s.lastName}`);
      return fullNameNorm.includes(norm);
    });
  }, [searchQuery, studentsWithAvg]);

  // حسابات أعلى وأدنى معدل ونسبة النجاح
  const highestAvg = useMemo(() => {
    if (totalStudents === 0) return 0;
    return Math.max(...studentsWithAvg.map(s => s.avg));
  }, [studentsWithAvg, totalStudents]);

  const lowestAvg = useMemo(() => {
    if (totalStudents === 0) return 0;
    return Math.min(...studentsWithAvg.map(s => s.avg));
  }, [studentsWithAvg, totalStudents]);

  const passCount = useMemo(() => {
    return studentsWithAvg.filter(s => s.avg >= 10).length;
  }, [studentsWithAvg]);

  const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  // -------------------------------------------------------------
  // حسابات مقارنة التقييمات بداخل النافذة المخصصة
  // -------------------------------------------------------------
  const getEvalScore = (st: Student, type: 'test1' | 'test2' | 'exam' | 'tpScore') => {
    if (type === 'test1') return st.test1 || 0;
    if (type === 'test2') return st.test2 || 0;
    if (type === 'exam') return st.exam || 0;
    if (type === 'tpScore') return st.tpScore || 0;
    return 0;
  };

  const evalLabel = (type: string) => {
    if (type === 'test1') return 'الفرض 1';
    if (type === 'test2') return 'الفرض 2';
    if (type === 'exam') return 'الاختبار';
    if (type === 'tpScore') return 'الأعمال التطبيقية TP';
    return type;
  };

  const comparisonData = useMemo(() => {
    const list = studentsWithAvg.map(st => {
      const score1 = getEvalScore(st, eval1Type);
      const score2 = getEvalScore(st, eval2Type);
      const delta = score2 - score1;
      const status = delta > 0 ? 'improved' : delta < 0 ? 'declined' : 'stable';
      return {
        student: st,
        score1,
        score2,
        delta,
        status
      };
    });

    const sum1 = list.reduce((a, b) => a + b.score1, 0);
    const sum2 = list.reduce((a, b) => a + b.score2, 0);
    const avg1 = totalStudents > 0 ? sum1 / totalStudents : 0;
    const avg2 = totalStudents > 0 ? sum2 / totalStudents : 0;
    const classDelta = avg2 - avg1;

    const improvedCount = list.filter(i => i.status === 'improved').length;
    const declinedCount = list.filter(i => i.status === 'declined').length;
    const stableCount = list.filter(i => i.status === 'stable').length;

    return {
      list,
      avg1,
      avg2,
      classDelta,
      improvedCount,
      declinedCount,
      stableCount
    };
  }, [studentsWithAvg, eval1Type, eval2Type, totalStudents]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* =========================================================
          1. الهيدر الرئيسي وتحديد المادة والقسم
      ========================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-blue-300 font-black flex items-center justify-center text-lg shadow-inner shrink-0">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">تحليل القسم</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {subjectName}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                القسم: <strong className="text-white">{activeClass.name}</strong> ({activeClass.level}) • الشعبة: {activeClass.stream} • {totalStudents} تلميذ
              </p>
            </div>
          </div>

          {/* قائمة اختيار القسم السريعة */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-800/80 hover:bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">اختيار القسم:</span>
              <select
                value={activeClass.id}
                onChange={e => onSelectClass(e.target.value)}
                className="bg-transparent font-black text-xs text-white focus:outline-none cursor-pointer"
              >
                {allClasses.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name} ({c.level})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* تنبيه في حال عدم ضبط المادة في الحساب */}
        {!hasSubjectDefined && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
            <span>⚠️ لم يتم تحديد مادة الأستاذ بوضوح في الإعدادات. يرجى تحديدها لضبط نتائج الحسابات.</span>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs whitespace-nowrap hover:bg-amber-400 transition"
              >
                تحديد المادة
              </button>
            )}
          </div>
        )}

        {/* =========================================================
            2. محرك البحث السريع باللغة العربية لعرض بطاقة التلميذ
        ========================================================= */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="🔍 ابحث عن اسم أو لقب تلميذ في هذا القسم..."
              className="w-full pr-10 pl-10 py-2.5 bg-slate-800/90 text-white placeholder-slate-400 rounded-xl text-xs sm:text-sm border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* قائمة نتائج البحث السريع التفاعلية */}
          {searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800">
              {searchResults.length > 0 ? (
                searchResults.map(st => (
                  <div
                    key={st.id}
                    onClick={() => {
                      onOpenStudentDetails(st);
                      setSearchQuery('');
                    }}
                    className="p-3 hover:bg-slate-800/90 cursor-pointer flex items-center justify-between transition gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center text-xs border border-blue-500/20">
                        {st.firstName[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {st.lastName} {st.firstName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          الفوج {st.group} • طاولة #{st.seatIndex + 1}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold ${
                        st.avg >= 10 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        معدل المادة: {st.avg.toFixed(2)} / 20
                      </span>
                      <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  لم يتم العثور على أي تلميذ باسم "{searchQuery}" في قسم {activeClass.name}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          3. بطاقات الإحصائيات الأربع الرئيسية المحددة في الطلب
      ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* البطاقة 1: عدد التلاميذ */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">عدد التلاميذ</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {totalStudents}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              قسم {activeClass.name}
            </div>
          </div>
        </div>

        {/* البطاقة 2: معدل القسم في مادة الأستاذ */}
        <div
          onClick={() => setActiveModal('classAverage')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-blue-200 dark:border-blue-900/50 shadow-sm hover:border-blue-400 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300">معدل القسم</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center group-hover:scale-110 transition">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {classAvgNumber.toFixed(2)}
            </div>
            <div className="text-[11px] text-blue-800 dark:text-blue-300 font-medium mt-0.5 flex items-center justify-between">
              <span>في مادة {subjectName}</span>
              <span className="text-[10px] underline">التفاصيل ➔</span>
            </div>
          </div>
        </div>

        {/* البطاقة 3: التلاميذ الذين يحتاجون إلى متابعة */}
        <div
          onClick={() => setActiveModal('followUp')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm hover:border-rose-400 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-rose-900 dark:text-rose-300">يحتاجون إلى متابعة</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 flex items-center justify-center group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {followUpStudents.length}
            </div>
            <div className="text-[11px] text-rose-800 dark:text-rose-300 font-medium mt-0.5 flex items-center justify-between">
              <span>معدل &lt; 10 أو تراجع بالنقاط</span>
              <span className="text-[10px] underline">عرض القائمة ➔</span>
            </div>
          </div>
        </div>

        {/* البطاقة 4: التلاميذ الذين تحسنت نتائجهم */}
        <div
          onClick={() => setActiveModal('improved')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm hover:border-emerald-400 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">تحسنت نتائجهم</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {improvedStudents.length}
            </div>
            <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5 flex items-center justify-between">
              <span>ارتفاع في العلامات</span>
              <span className="text-[10px] underline">عرض القائمة ➔</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          4. أشرطة أدوات خيارات التحليل السريعة (تفتح النوافذ المنبثقة)
      ========================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>أدوات التحليل والمقارنة المباشرة:</span>
          </h3>
          <span className="text-[11px] text-slate-500">اضغط لفتح النافذة الخاصة</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setActiveModal('comparison')}
            className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition active:scale-95"
          >
            <span>⚖️ مقارنة التقييمات</span>
          </button>

          <button
            onClick={() => setActiveModal('followUp')}
            className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition active:scale-95"
          >
            <span>⚠️ قائمة المتابعة ({followUpStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveModal('improved')}
            className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition active:scale-95"
          >
            <span>📈 نتائج تحسنت ({improvedStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveModal('classAverage')}
            className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition active:scale-95"
          >
            <span>📊 تفاصيل المعدل</span>
          </button>
        </div>
      </div>

      {/* خلاصة تربوية مبسطة ومباشرة */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-slate-500/5 to-indigo-500/10 border border-blue-200 dark:border-blue-900/40 text-slate-800 dark:text-slate-200 text-xs space-y-1.5">
        <div className="font-bold flex items-center gap-1.5 text-blue-950 dark:text-blue-300">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>الخلاصة التربوية المباشرة لقسم {activeClass.name}:</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          بلغت نسبة النجاح في مادة <strong className="text-slate-900 dark:text-white">{subjectName}</strong> نسبة{' '}
          <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{passRate}%</strong> ({passCount} من أصل {totalStudents} تلميذ).
          يوجد <strong className="text-rose-600 dark:text-rose-400">{followUpStudents.length} تلاميذ</strong> بحاجة إلى متابعة وتدارك بيداغوجي وفق النقاط المسجلة، في حين سجل{' '}
          <strong className="text-emerald-600 dark:text-emerald-400">{improvedStudents.length} تلاميذ</strong> تحسناً إيجابياً.
        </p>
      </div>

      {/* =========================================================
          5. النوافذ المنبثقة المستقلة للهواتف المحمولة (Modals)
      ========================================================= */}

      {/* النافذة 1: تفاصيل معدل القسم */}
      {activeModal === 'classAverage' && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slideUp">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-300" />
                <h3 className="font-black text-sm sm:text-base">تفاصيل معدل القسم في مادة {subjectName}</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">أعلى معدل</span>
                  <div className="text-xl font-black text-emerald-600 font-mono mt-1">{highestAvg.toFixed(2)} / 20</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">أدنى معدل</span>
                  <div className="text-xl font-black text-rose-600 font-mono mt-1">{lowestAvg.toFixed(2)} / 20</div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-2xl border border-blue-200 dark:border-blue-900 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-950 dark:text-blue-300">
                  <span>نسبة المقبولين (معدل ≥ 10):</span>
                  <span className="font-mono text-sm">{passRate}%</span>
                </div>
                <div className="w-full h-2.5 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${passRate}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">التلاميذ المتفوقون في المادة:</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {studentsWithAvg
                    .filter(s => s.avg >= 12)
                    .sort((a, b) => b.avg - a.avg)
                    .slice(0, 10)
                    .map(st => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setActiveModal(null);
                          onOpenStudentDetails(st);
                        }}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">
                          {st.lastName} {st.firstName}
                        </span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {st.avg.toFixed(2)} / 20
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center shrink-0">
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* النافذة 2: قائمة المتابعة والتدارك البيداغوجي */}
      {activeModal === 'followUp' && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slideUp">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-900 to-amber-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
                <h3 className="font-black text-sm sm:text-base">
                  التلاميذ الذين يحتاجون إلى متابعة ({followUpStudents.length})
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-bold shrink-0">تصفية:</span>
              <button
                onClick={() => setFollowUpFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  followUpFilter === 'all'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                الكل ({followUpStudents.length})
              </button>
              <button
                onClick={() => setFollowUpFilter('under10')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  followUpFilter === 'under10'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                معدل دون 10
              </button>
              <button
                onClick={() => setFollowUpFilter('dropped')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  followUpFilter === 'dropped'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                تراجع بالنُقاط
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {followUpStudents.length > 0 ? (
                followUpStudents
                  .filter(st => {
                    if (followUpFilter === 'under10') return st.avg < 10;
                    if (followUpFilter === 'dropped') return st.scoreDelta <= -2;
                    return true;
                  })
                  .map(st => (
                    <div
                      key={st.id}
                      className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-2.5"
                    >
                      <div
                        onClick={() => {
                          setActiveModal(null);
                          onOpenStudentDetails(st);
                        }}
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                            {st.firstName[0]}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                              {st.lastName} {st.firstName}
                            </div>
                            <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium mt-0.5">
                              ⚠️ {st.followUpReason}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm block">
                            {st.avg.toFixed(2)} / 20
                          </span>
                          <span className="text-[10px] text-slate-500 underline">عرض البطاقة</span>
                        </div>
                      </div>

                      {/* حقل تسجيل الملاحظة أو التدارك البيداغوجي المباشر */}
                      <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center gap-2">
                        <input
                          type="text"
                          defaultValue={st.areasForImprovement || st.remark || ''}
                          onBlur={e => {
                            const val = e.target.value;
                            if (val !== (st.areasForImprovement || '')) {
                              onSaveStudent({
                                ...st,
                                areasForImprovement: val
                              });
                            }
                          }}
                          placeholder="✍️ سجل إجراء المتابعة أو التدارك لهذا التلميذ..."
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white border border-rose-200 dark:border-rose-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                  ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  لا يوجد أي تلميذ ينطبق عليه شرط المتابعة حالياً في قسم {activeClass.name} ✓
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center shrink-0">
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* النافذة 3: قائمة التلاميذ المتحسنين */}
      {activeModal === 'improved' && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slideUp">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-300" />
                <h3 className="font-black text-sm sm:text-base">
                  التلاميذ الذين تحسنت نتائجهم ({improvedStudents.length})
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5">
              {improvedStudents.length > 0 ? (
                improvedStudents.map(st => (
                  <div
                    key={st.id}
                    onClick={() => {
                      setActiveModal(null);
                      onOpenStudentDetails(st);
                    }}
                    className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between cursor-pointer hover:opacity-80 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                        {st.firstName[0]}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                          {st.lastName} {st.firstName}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold mt-0.5">
                          📈 تحسن إيجابي في مادة {subjectName}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                        {st.avg.toFixed(2)} / 20
                      </span>
                      {st.scoreDelta > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          +{st.scoreDelta.toFixed(1)} ن
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  لا توجد تقييمات قابلة للمقارنة حالياً أو لم يتم رصد تحسن إيجابي بعد.
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center shrink-0">
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* النافذة 4: أداة مقارنة التقييمات التفاعلية */}
      {activeModal === 'comparison' && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slideUp">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-300" />
                <h3 className="font-black text-sm sm:text-base">أداة مقارنة التقييمات في مادة {subjectName}</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* أدوات اختيار التقييمين المراد مقارنتهما */}
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2.5 shrink-0">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">التقييم الأول (السابق):</label>
                <select
                  value={eval1Type}
                  onChange={e => setEval1Type(e.target.value as any)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="test1">الفرض 1</option>
                  <option value="test2">الفرض 2</option>
                  <option value="tpScore">الأعمال التطبيقية TP</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">التقييم الثاني (الحالي):</label>
                <select
                  value={eval2Type}
                  onChange={e => setEval2Type(e.target.value as any)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="exam">الاختبار الفصلي</option>
                  <option value="test2">الفرض 2</option>
                  <option value="test1">الفرض 1</option>
                </select>
              </div>
            </div>

            {/* ملخص نتائج المقارنة للقسم */}
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 grid grid-cols-3 gap-2 text-center shrink-0">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500">معدل {evalLabel(eval1Type)}</span>
                <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  {comparisonData.avg1.toFixed(2)}
                </div>
              </div>

              <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500">معدل {evalLabel(eval2Type)}</span>
                <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                  {comparisonData.avg2.toFixed(2)}
                </div>
              </div>

              <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500">فارق القسم</span>
                <div className={`text-sm sm:text-base font-black font-mono mt-0.5 ${
                  comparisonData.classDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {comparisonData.classDelta >= 0 ? `+${comparisonData.classDelta.toFixed(2)}` : comparisonData.classDelta.toFixed(2)}
                </div>
              </div>
            </div>

            {/* قائمة نتائج المقارنة الفردية لكل تلميذ */}
            <div className="p-4 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                <span>توزيع نتائج التلاميذ:</span>
                <span className="text-[11px]">
                  📈 تحسن: {comparisonData.improvedCount} • 📉 تراجع: {comparisonData.declinedCount} • ➖ استقرار: {comparisonData.stableCount}
                </span>
              </div>

              {comparisonData.list.map(({ student, score1, score2, delta, status }) => (
                <div
                  key={student.id}
                  onClick={() => {
                    setActiveModal(null);
                    onOpenStudentDetails(student);
                  }}
                  className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center justify-center text-xs">
                      {student.firstName[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {student.lastName} {student.firstName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {evalLabel(eval1Type)}: <strong className="text-slate-800 dark:text-slate-200">{score1}</strong> ➔ {evalLabel(eval2Type)}: <strong className="text-blue-600">{score2}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black ${
                      status === 'improved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : status === 'declined'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {delta > 0 ? `+${delta.toFixed(1)}` : delta < 0 ? `${delta.toFixed(1)}` : '0.0'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center shrink-0">
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
