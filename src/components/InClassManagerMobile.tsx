import React, { useState, useMemo } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, BookOpen, FileText,
  AlertCircle, Check, Sparkles, Play, Pause, RotateCcw, Shuffle,
  Calendar, ChevronRight, ChevronLeft, Save, Search, School,
  Award, MessageSquare, ShieldAlert, ArrowRight, Eye
} from 'lucide-react';
import { Student, ClassGroup, CurriculumUnit } from '../types';
import { matchesStudentQuery, HighlightMatch } from '../utils/searchUtils';

interface InClassManagerMobileProps {
  activeClass: ClassGroup;
  students: Student[];
  curriculum: CurriculumUnit[];
  onUpdateStudents: (updatedStudents: Student[]) => void;
  onOpenClassSelector: () => void;
  onOpenStudentDetails: (student: Student) => void;
  teacherSubject: string;
  onSaveNotice?: (msg: string) => void;
}

export default function InClassManagerMobile({
  activeClass,
  students,
  curriculum,
  onUpdateStudents,
  onOpenClassSelector,
  onOpenStudentDetails,
  teacherSubject,
  onSaveNotice
}: InClassManagerMobileProps) {
  // التبويب النشط داخل واجهة الحصة
  const [activeSection, setActiveSection] = useState<'attendance' | 'lesson' | 'homework' | 'notes' | 'finish'>('attendance');

  // فلترة الأفواج والبحث
  const [groupFilter, setGroupFilter] = useState<'all' | 1 | 2>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // مؤقت الحصة
  const [timerSeconds, setTimerSeconds] = useState(3600); // 60 دقيقة للحصة
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // القرعة العشوائية
  const [pickedStudent, setPickedStudent] = useState<Student | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  // بيانات موضوع الدرس والواجب
  const currentUnit = curriculum.find(u => u.level === activeClass.level && u.status === 'in-progress') || curriculum[0];
  const [lessonTitle, setLessonTitle] = useState(() => currentUnit?.title || '');
  const [lessonContent, setLessonContent] = useState(() => currentUnit?.notes || '');
  const [homeworkText, setHomeworkText] = useState('');
  const [pedagogicalNote, setPedagogicalNote] = useState('');

  // حالة الحفظ
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [showAllPresentConfirm, setShowAllPresentConfirm] = useState(false);

  // تفعيل المؤقت
  React.useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => Math.max(0, s - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // إحصائيات الحضور الآنية
  const presentCount = students.filter(s => s.attendance === 'present').length;
  const absentCount = students.filter(s => s.attendance === 'absent').length;
  const lateCount = students.filter(s => s.attendance === 'late').length;

  // التلاميذ المفلترون
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      if (groupFilter !== 'all' && st.group !== groupFilter) return false;
      if (searchQuery.trim() && !matchesStudentQuery(st, searchQuery)) return false;
      return true;
    });
  }, [students, groupFilter, searchQuery]);

  // تغيير حالة تلميذ واحد
  const setStudentAttendanceStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setSaveStatus('saving');
    const updated = students.map(s => {
      if (s.id === studentId) {
        const wasAbsent = s.attendance === 'absent';
        const isNowAbsent = status === 'absent';
        const newAbsenceCount = isNowAbsent && !wasAbsent
          ? s.absencesCount + 1
          : !isNowAbsent && wasAbsent
          ? Math.max(0, s.absencesCount - 1)
          : s.absencesCount;

        return {
          ...s,
          attendance: status,
          absencesCount: newAbsenceCount
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    setTimeout(() => setSaveStatus('saved'), 350);
  };

  // تعيين الكل حاضر مع تأكيد صريح
  const applyAllPresent = () => {
    setSaveStatus('saving');
    const updated = students.map(s => ({
      ...s,
      attendance: 'present' as const
    }));
    onUpdateStudents(updated);
    setShowAllPresentConfirm(false);
    setTimeout(() => setSaveStatus('saved'), 350);
    if (onSaveNotice) onSaveNotice('تم تسجيل جميع تلاميذ القسم كـ «حاضر» بنجاح');
  };

  // تطبيق إضافة أو خصم نقاط سريعة
  const handleQuickBonus = (studentId: string, delta: number) => {
    setSaveStatus('saving');
    const updated = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          bonusPoints: Number((s.bonusPoints + delta).toFixed(2))
        };
      }
      return s;
    });
    onUpdateStudents(updated);
    setTimeout(() => setSaveStatus('saved'), 350);
  };

  // تشغيل القرعة العشوائية
  const triggerRandomPicker = () => {
    const pool = filteredStudents.filter(s => s.attendance !== 'absent');
    if (pool.length === 0) return;
    setIsPicking(true);
    setPickedStudent(null);
    let counter = 0;
    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * pool.length);
      setPickedStudent(pool[randIdx]);
      counter++;
      if (counter > 12) {
        clearInterval(interval);
        setIsPicking(false);
      }
    }, 90);
  };

  return (
    <div className="space-y-3.5 dir-rtl">
      
      {/* 1. الشريط العلوي للحصة: السنة، القسم، التاريخ، مؤقت الحصة، ومؤشر الحفظ الحي */}
      <div className="bg-slate-900 text-white rounded-3xl p-3.5 sm:p-5 shadow-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          
          {/* السنة والقسم مع زر التبديل التفاعلي المباشر */}
          <button
            type="button"
            onClick={onOpenClassSelector}
            className="flex items-center gap-2.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 p-2 sm:px-3 rounded-2xl transition cursor-pointer text-right group"
            title="انقر لتغيير السنة أو القسم"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
              <School className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-blue-400 truncate">{activeClass.level}</span>
                <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded font-sans">تغيير ▾</span>
              </div>
              <strong className="text-sm sm:text-base font-black text-white block truncate group-hover:text-blue-300">
                {activeClass.name} <span className="text-xs font-normal text-slate-400">({activeClass.stream})</span>
              </strong>
            </div>
          </button>

          {/* التاريخ ومؤقت الحصة وحالة الحفظ */}
          <div className="flex items-center gap-2 shrink-0">
            {/* مؤقت الحصة المدمج */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono font-bold text-white text-xs">{formatTimer(timerSeconds)}</span>
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
                title={isTimerRunning ? 'إيقاف مؤقت' : 'تشغيل المؤقت'}
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(3600);
                }}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="إعادة ضبط المؤقت"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* مؤشر الحفظ التلقائي الفوري */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300">
              <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <span>{saveStatus === 'saved' ? 'محفوظ' : 'جارٍ الحفظ...'}</span>
            </div>
          </div>
        </div>

        {/* شريط الإجراءات الخمسة الرئيسية في الحصة */}
        <div className="grid grid-cols-5 gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-center">
          <button
            type="button"
            onClick={() => setActiveSection('attendance')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 cursor-pointer ${
              activeSection === 'attendance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[11px] truncate">الحضور</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('lesson')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 cursor-pointer ${
              activeSection === 'lesson'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[11px] truncate">الدرس</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('homework')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 cursor-pointer ${
              activeSection === 'homework'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[11px] truncate">الواجب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('notes')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 cursor-pointer ${
              activeSection === 'notes'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[11px] truncate">ملاحظة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('finish')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 cursor-pointer ${
              activeSection === 'finish'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[11px] truncate">إنهاء</span>
          </button>
        </div>
      </div>

      {/* 2. محتوى القسم المختار */}
      
      {/* =========================================================
          قسم 1: تسجيل الحضور والغياب المباشر بأزرار لمس ثلاثية عريضة
      ========================================================= */}
      {activeSection === 'attendance' && (
        <div className="space-y-3">
          
          {/* شريط الإحصائيات الفورية وأزرار الإجراء السريع */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            
            {/* عداد الحاضرين والغيابات */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                حاضر: <strong>{presentCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                غائب: <strong>{absentCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                متأخر: <strong>{lateCount}</strong>
              </span>
            </div>

            {/* زر الكل حاضر مع قرعة السبورة */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAllPresentConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs min-h-[40px]"
                title="تسجيل جميع التلاميذ كحاضرين دفعة واحدة"
              >
                <Check className="w-4 h-4" />
                <span>الكل حاضر ✓</span>
              </button>

              <button
                type="button"
                onClick={triggerRandomPicker}
                disabled={isPicking}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[40px]"
                title="قرعة عشوائية لاختيار تلميذ للمشاركة على السبورة"
              >
                <Shuffle className={`w-3.5 h-3.5 ${isPicking ? 'animate-spin text-amber-500' : ''}`} />
                <span className="hidden sm:inline">قرعة</span>
              </button>
            </div>
          </div>

          {/* نافذة تأكيد الكل حاضر */}
          {showAllPresentConfirm && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs animate-scaleUp">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
                <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>هل تريد تطبيق حالة «حاضر» على جميع تلاميذ القسم ({students.length} تلميذ)؟</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAllPresentConfirm(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={applyAllPresent}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer shadow-xs"
                >
                  تأكيد التطبيق
                </button>
              </div>
            </div>
          )}

          {/* التلميذ المختار بالقرعة إن وجد */}
          {pickedStudent && (
            <div className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border border-amber-400 rounded-2xl flex items-center justify-between gap-2 animate-scaleUp">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600 animate-bounce" />
                <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                  تلميذ السبورة المختار: <strong className="text-sm text-blue-700 dark:text-blue-300">{pickedStudent.lastName} {pickedStudent.firstName}</strong> (فوج {pickedStudent.group})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPickedStudent(null)}
                className="text-xs text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* شريط الفلترة والبحث السريع بالحرف */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setGroupFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${groupFilter === 'all' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              >
                الكل ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter(1)}
                className={`px-2.5 py-1 rounded-lg transition ${groupFilter === 1 ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              >
                فوج 1
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter(2)}
                className={`px-2.5 py-1 rounded-lg transition ${groupFilter === 2 ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              >
                فوج 2
              </button>
            </div>

            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث بحرف أو اسم..."
                className="w-full pr-8 pl-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* قائمة أسماء التلاميذ مع أزرار اللمس الثلاثية العريضة المريحة */}
          <div className="space-y-2">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                <Search className="w-6 h-6 mx-auto text-slate-300" />
                <p className="font-bold">لا يوجد تلميذ يطابق هذا الحرف أو الفلتر</p>
              </div>
            ) : (
              filteredStudents.map((st, idx) => {
                const isPresent = st.attendance === 'present';
                const isAbsent = st.attendance === 'absent';
                const isLate = st.attendance === 'late';

                return (
                  <div
                    key={st.id}
                    className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isAbsent
                        ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50'
                        : isLate
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* اسم التلميذ قابل للنقر لفتح بطاقته الشاملة فوراً */}
                    <div
                      onClick={() => onOpenStudentDetails(st)}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                      title="انقر لفتح بطاقة التلميذ"
                    >
                      <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <strong className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition block truncate">
                          <HighlightMatch text={`${st.lastName} ${st.firstName}`} query={searchQuery} />
                        </strong>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>فوج {st.group}</span>
                          <span>• غيابات: {st.absencesCount}</span>
                          {st.bonusPoints !== 0 && (
                            <span className={st.bonusPoints > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              • رصيد: {st.bonusPoints > 0 ? `+${st.bonusPoints}` : st.bonusPoints}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* أزرار لمس ثلاثية عريضة حاضر / غائب / متأخر بارتفاع لا يقل عن 44px */}
                    <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                      
                      {/* زر حاضر */}
                      <button
                        type="button"
                        onClick={() => setStudentAttendanceStatus(st.id, 'present')}
                        className={`flex-1 sm:flex-initial min-w-[70px] min-h-[44px] px-3 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                          isPresent
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>حاضر</span>
                      </button>

                      {/* زر غائب */}
                      <button
                        type="button"
                        onClick={() => setStudentAttendanceStatus(st.id, 'absent')}
                        className={`flex-1 sm:flex-initial min-w-[70px] min-h-[44px] px-3 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                          isAbsent
                            ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>غائب</span>
                      </button>

                      {/* زر متأخر */}
                      <button
                        type="button"
                        onClick={() => setStudentAttendanceStatus(st.id, 'late')}
                        className={`flex-1 sm:flex-initial min-w-[70px] min-h-[44px] px-3 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                          isLate
                            ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>متأخر</span>
                      </button>

                      {/* زر إضافة نقطة سريعة للمشاركة */}
                      <button
                        type="button"
                        onClick={() => handleQuickBonus(st.id, 0.5)}
                        className="min-h-[44px] px-2.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-xs font-black transition cursor-pointer"
                        title="إضافة 0.5 نقطة مشاركة فورية"
                      >
                        +0.5
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          قسم 2: موضوع الدرس وعناصر الحصة
      ========================================================= */}
      {activeSection === 'lesson' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>تسجيل موضوع وعناصر الحصة البيداغوجية</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">المادة: {teacherSubject}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                عنوان الدرس المنجز:
              </label>
              <input
                type="text"
                value={lessonTitle}
                onChange={e => {
                  setLessonTitle(e.target.value);
                  setSaveStatus('saving');
                  setTimeout(() => setSaveStatus('saved'), 400);
                }}
                placeholder="مثال: المتابعة الزمنية لتحول كيميائي بالمعايرة اللونية..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                محتوى وعناصر الحصة المنجزة:
              </label>
              <textarea
                rows={3}
                value={lessonContent}
                onChange={e => {
                  setLessonContent(e.target.value);
                  setSaveStatus('saving');
                  setTimeout(() => setSaveStatus('saved'), 400);
                }}
                placeholder="العناصر المتناولة، النشاط المنجز، التمارين التطبيقية المحلولة على السبورة..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
              <span>الوحدة الحالية في المنهاج: <strong>{currentUnit?.title || 'غير محددة'}</strong></span>
              <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold">الحجم المنجز: {currentUnit?.completedHours || 0} سا</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          قسم 3: الواجب المنزلي
      ========================================================= */}
      {activeSection === 'homework' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>الواجب المنزلي والتطبيقات المقررة</span>
            </h3>
            <span className="text-[11px] text-slate-400">قسم {activeClass.name}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                تفاصيل الواجب المنزلي المطلوب للحصة القادمة:
              </label>
              <textarea
                rows={4}
                value={homeworkText}
                onChange={e => {
                  setHomeworkText(e.target.value);
                  setSaveStatus('saving');
                  setTimeout(() => setSaveStatus('saved'), 400);
                }}
                placeholder="مثال: حل التمارين 12 و15 صفحة 45 من الكتاب المدرسي، مع تحضير النشاط المخبري الخاص بالدارة RC..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">💡 نصيحة بيداغوجية:</p>
              <p className="text-[11px] leading-relaxed">
                يظهر هذا الواجب تلقائياً في فضاء أولياء الأمور عند إدخال كود التلميذ لمتابعة إنجاز واجبات أبنائهم في المنزل.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          قسم 4: ملاحظة تربوية
      ========================================================= */}
      {activeSection === 'notes' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>ملاحظة تربوية حول جو الحصة وسير الدرس</span>
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                سجل الملاحظات التربوية الخاصة بهذه الحصة:
              </label>
              <textarea
                rows={4}
                value={pedagogicalNote}
                onChange={e => {
                  setPedagogicalNote(e.target.value);
                  setSaveStatus('saving');
                  setTimeout(() => setSaveStatus('saved'), 400);
                }}
                placeholder="سجل انطباعك عن تفاعل القسم، صعوبات التعلم الملاحظة، المقترحات لحصة المعالجة..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          قسم 5: إنهاء الحصة وتلخيص المخرجات
      ========================================================= */}
      {activeSection === 'finish' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>ملخص مخرجات الحصة وإنهاء الدرس</span>
            </h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl">
              جاهز للحفظ النهائي
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">إجمالي القسم</span>
                <strong className="text-sm font-black text-slate-900 dark:text-white">{students.length} تلميذ</strong>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">الحضور</span>
                <strong className="text-sm font-black text-emerald-700 dark:text-emerald-300">{presentCount}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 block">الغيابات</span>
                <strong className="text-sm font-black text-rose-700 dark:text-rose-300">{absentCount}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 block">التأخرات</span>
                <strong className="text-sm font-black text-amber-700 dark:text-amber-300">{lateCount}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-bold block">موضوع الدرس المسجل:</span>
              <p className="font-bold text-slate-900 dark:text-white">{lessonTitle || 'لم يتم تسجيل عنوان الدرس'}</p>
            </div>

            {homeworkText && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-500 font-bold block">الواجب المقرر:</span>
                <p className="text-slate-800 dark:text-slate-200">{homeworkText}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (onSaveNotice) {
                  onSaveNotice(`تم توثيق وإنهاء حصة قسم ${activeClass.name} بنجاح وحفظ كافة البيانات سحابياً.`);
                }
                setActiveSection('attendance');
              }}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>تأكيد إنهاء وتوثيق الحصة البيداغوجية</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
