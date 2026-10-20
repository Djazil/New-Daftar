import React, { useState, useMemo } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, BookOpen, FileText,
  AlertCircle, Check, Sparkles, Play, Pause, RotateCcw, Shuffle,
  Calendar, ChevronRight, ChevronLeft, Save, Search, School,
  Award, MessageSquare, ShieldAlert, ArrowRight, Eye, ThumbsUp, ThumbsDown, X
} from 'lucide-react';
import { Student, ClassGroup, CurriculumUnit, ClassSession, BehaviorTransaction } from '../types';
import { matchesStudentQuery, HighlightMatch } from '../utils/searchUtils';
import { autoSaveLiveSession, completeClassSessionAtomic } from '../services/sessionService';

interface InClassManagerMobileProps {
  activeClass: ClassGroup;
  students: Student[];
  curriculum: CurriculumUnit[];
  onUpdateStudents: (updatedStudents: Student[]) => void;
  onOpenClassSelector: () => void;
  onOpenStudentDetails: (student: Student) => void;
  teacherSubject: string;
  teacherEmail?: string;
  currentSession?: ClassSession | null;
  onSessionCompleted?: (completedSession: ClassSession, updatedStudents: Student[]) => void;
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
  teacherEmail = '',
  currentSession = null,
  onSessionCompleted = () => {},
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
  const [lessonTitle, setLessonTitle] = useState(() => currentSession?.topic || currentUnit?.title || '');
  const [lessonContent, setLessonContent] = useState(() => currentUnit?.notes || '');
  const [homeworkText, setHomeworkText] = useState('');
  const [pedagogicalNote, setPedagogicalNote] = useState('');

  // حالة الحفظ الحي
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [showAllPresentConfirm, setShowAllPresentConfirm] = useState(false);
  const [showEndSessionConfirmModal, setShowEndSessionConfirmModal] = useState(false);

  // نافذة رصد نقاط السلوك بلمسة واحدة
  const [behaviorModalStudent, setBehaviorModalStudent] = useState<Student | null>(null);
  const [behaviorDelta, setBehaviorDelta] = useState<number>(1);
  const [behaviorReason, setBehaviorReason] = useState<string>('مشاركة ممتازة في الدرس');

  // معاملات السلوك في هذه الحصة
  const [sessionTransactions, setSessionTransactions] = useState<BehaviorTransaction[]>(() => {
    return currentSession?.behaviorLogs || [];
  });

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
  const unsetCount = students.filter(s => !s.attendance).length;

  // التلاميذ المفلترون
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      if (groupFilter !== 'all' && st.group !== groupFilter) return false;
      if (searchQuery.trim() && !matchesStudentQuery(st, searchQuery)) return false;
      return true;
    });
  }, [students, groupFilter, searchQuery]);

  // تحديث تلقائي حثيث للحصة الحية
  const triggerAutoSave = (updatedStudents: Student[]) => {
    setSaveStatus('saving');
    if (currentSession) {
      const attendanceMap: Record<string, 'present' | 'absent' | 'late'> = {};
      updatedStudents.forEach(s => {
        if (s.attendance) attendanceMap[s.id] = s.attendance;
      });

      const updatedSess: ClassSession = {
        ...currentSession,
        attendance: attendanceMap,
        behaviorLogs: sessionTransactions,
        topic: lessonTitle,
        teacherNotes: pedagogicalNote
      };

      autoSaveLiveSession(updatedSess).then(ok => {
        setSaveStatus(ok ? 'saved' : 'offline');
      });
    } else {
      setTimeout(() => setSaveStatus('saved'), 350);
    }
  };

  // تغيير حالة تلميذ واحد
  const setStudentAttendanceStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
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
    triggerAutoSave(updated);
  };

  // تعيين الكل حاضر مع تأكيد صريح
  const applyAllPresent = () => {
    const updated = students.map(s => ({
      ...s,
      attendance: 'present' as const
    }));
    onUpdateStudents(updated);
    setShowAllPresentConfirm(false);
    triggerAutoSave(updated);
    if (onSaveNotice) onSaveNotice('تم تسجيل جميع تلاميذ القسم كـ «حاضر» بنجاح');
  };

  // إضافة معاملة نقاط سلوك جديدة مع منع التكرار
  const handleAddBehaviorPoints = () => {
    if (!behaviorModalStudent) return;

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTx: BehaviorTransaction = {
      id: txId,
      studentId: behaviorModalStudent.id,
      studentName: `${behaviorModalStudent.lastName} ${behaviorModalStudent.firstName}`,
      delta: behaviorDelta,
      reason: behaviorReason.trim() || 'مشاركة وسلوك في الدرس',
      timestamp: new Date().toISOString(),
      sessionId: currentSession?.id || 'live_session',
      teacherEmail
    };

    const updatedTxs = [newTx, ...sessionTransactions];
    setSessionTransactions(updatedTxs);

    const updatedStudents = students.map(s => {
      if (s.id === behaviorModalStudent.id) {
        const newBonus = Number((s.bonusPoints + behaviorDelta).toFixed(2));
        const newLogs = [
          {
            id: txId,
            date: new Date().toISOString().split('T')[0],
            type: behaviorDelta >= 0 ? ('positive' as const) : ('negative' as const),
            reason: behaviorReason.trim() || 'سلوك في الحصة المباشرة',
            delta: behaviorDelta,
            parentAcknowledged: false
          },
          ...(s.logs || [])
        ];
        return {
          ...s,
          bonusPoints: newBonus,
          logs: newLogs
        };
      }
      return s;
    });

    onUpdateStudents(updatedStudents);
    triggerAutoSave(updatedStudents);

    setBehaviorModalStudent(null);
    if (onSaveNotice) {
      onSaveNotice(`تم رصد (${behaviorDelta >= 0 ? `+${behaviorDelta}` : behaviorDelta}) نقطة سلوك للتلميذ ${behaviorModalStudent.lastName}`);
    }
  };

  // الاعتماد النهائي لإنهاء الحصة الذري
  const handleConfirmSessionCompletion = async () => {
    setShowEndSessionConfirmModal(false);

    const baseSession: ClassSession = currentSession || {
      id: `session_${Date.now()}`,
      teacherEmail,
      level: activeClass.level,
      classId: activeClass.id,
      className: activeClass.name,
      subject: teacherSubject || 'مادة التخصص',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: 'الأحد',
      startTime: '08:00',
      endTime: '09:00',
      topic: lessonTitle,
      status: 'active',
      attendance: {},
      behaviorLogs: sessionTransactions
    };

    const result = await completeClassSessionAtomic(baseSession, students, {
      defaultUnsetAttendanceToPresent: true,
      lessonTopic: lessonTitle,
      teacherNotes: pedagogicalNote
    });

    if (result.success && result.completedSession) {
      if (result.updatedStudents) {
        onUpdateStudents(result.updatedStudents);
      }
      onSessionCompleted(result.completedSession, result.updatedStudents || students);
      if (onSaveNotice) {
        onSaveNotice(result.message);
      }
    }
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

  // حالة تجاهل التذكير الذكي (30 دقيقة)
  const [isSmartReminderDismissed, setIsSmartReminderDismissed] = useState(false);

  // حساب الزمن المنقضي والتحقق من وجود أي سجل حضور أو نشاط للتلاميذ
  const sessionElapsedSeconds = 3600 - timerSeconds;
  const hasActivityLogged = absentCount > 0 || lateCount > 0 || sessionTransactions.length > 0 || students.some(s => s.attendance === 'absent' || s.attendance === 'late');
  const showSmart30MinReminder = !isSmartReminderDismissed && !hasActivityLogged && sessionElapsedSeconds >= 1800;

  return (
    <div className="space-y-3.5 dir-rtl">
      
      {/* شريط التذكير الذكي للحصة (30 دقيقة بدون نشاط) */}
      {showSmart30MinReminder && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-md text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <strong className="block text-white font-bold">تذكير ذكي: مضت 30 دقيقة على الحصة المباشرة دون تسجيل أي حضور أو نشاط</strong>
              <span className="text-[11px] text-amber-200/90">يرجى رصد حضور وتأخر التلاميذ لتفادي نسيان حجز البيانات البيداغوجية.</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveSection('attendance');
                setIsSmartReminderDismissed(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              تسجيل الحضور الآن
            </button>

            <button
              onClick={() => setIsSmartReminderDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
            
            {/* مؤشر حالة الحفظ التلقائي الحي */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-[11px] font-bold">
              {saveStatus === 'saving' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-300">جارٍ الحفظ...</span>
                </>
              ) : saveStatus === 'offline' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300">محفوظ محلياً</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">تم الحفظ سحابياً ✓</span>
                </>
              )}
            </div>

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
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* ملخص إحصائيات الحضور والسلوك الآنية */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1 border-t border-slate-800">
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">حاضر</span>
            <span className="font-bold text-emerald-400">{presentCount}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">غائب</span>
            <span className="font-bold text-rose-400">{absentCount}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">متأخر</span>
            <span className="font-bold text-amber-400">{lateCount}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">نقاط السلوك</span>
            <span className="font-bold text-blue-400 font-mono">{sessionTransactions.length}</span>
          </div>
        </div>
      </div>

      {/* 2. شريط التبويبات التنقلية بأسلوب لمسي أملس للهاتف */}
      <div className="grid grid-cols-5 gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold text-center">
        <button
          type="button"
          onClick={() => setActiveSection('attendance')}
          className={`py-2.5 rounded-xl transition ${
            activeSection === 'attendance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          الحضور
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('lesson')}
          className={`py-2.5 rounded-xl transition ${
            activeSection === 'lesson' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          الدرس
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('homework')}
          className={`py-2.5 rounded-xl transition ${
            activeSection === 'homework' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          الواجب
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('notes')}
          className={`py-2.5 rounded-xl transition ${
            activeSection === 'notes' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          ملاحظة
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('finish')}
          className={`py-2.5 rounded-xl transition ${
            activeSection === 'finish' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          الإنهاء
        </button>
      </div>

      {/* =========================================================
          قسم 1: تسجيل الحضور والغياب والسلوك
      ========================================================= */}
      {activeSection === 'attendance' && (
        <div className="space-y-3">
          
          {/* أدوات الاختصار: زر "الكل حاضر"، أزرار الفلترة، والقرعة */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
            
            {/* زر الاختصار: الكل حاضر */}
            <button
              type="button"
              onClick={() => setShowAllPresentConfirm(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>الكل حاضر ✓</span>
            </button>

            {/* القرعة العشوائية */}
            <button
              type="button"
              onClick={triggerRandomPicker}
              disabled={isPicking}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <Shuffle className={`w-4 h-4 ${isPicking ? 'animate-spin' : ''}`} />
              <span>{isPicking ? 'جاري السحب...' : 'قرعة الأسئلة'}</span>
            </button>

            {/* أزرار تصفية الأفواج */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setGroupFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${groupFilter === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-500'}`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter(1)}
                className={`px-2.5 py-1 rounded-lg transition ${groupFilter === 1 ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-500'}`}
              >
                فوج 1
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter(2)}
                className={`px-2.5 py-1 rounded-lg transition ${groupFilter === 2 ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-500'}`}
              >
                فوج 2
              </button>
            </div>
          </div>

          {/* التلميذ المختار بالقرعة */}
          {pickedStudent && (
            <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-2xl text-purple-200 text-xs flex items-center justify-between gap-2 animate-bounce">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-purple-400 block font-bold">التلميذ المختار للإجابة:</span>
                  <strong className="text-sm text-white font-black">{pickedStudent.lastName} {pickedStudent.firstName}</strong>
                </div>
              </div>
              <button
                onClick={() => onOpenStudentDetails(pickedStudent)}
                className="px-3 py-1 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 transition"
              >
                عرض بطاقته
              </button>
            </div>
          )}

          {/* حقل البحث السريع عن اسم التلميذ */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم التلميذ بالقسم..."
              className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* قائمة التلاميذ اللمسية العريضة للهاتف */}
          <div className="space-y-2 max-h-[60dvh] overflow-y-auto pr-1">
            {filteredStudents.map((st) => (
              <div
                key={st.id}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2 flex-wrap"
              >
                <button
                  type="button"
                  onClick={() => onOpenStudentDetails(st)}
                  className="flex items-center gap-2.5 text-right flex-1 min-w-0 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                    {st.seatIndex !== undefined ? st.seatIndex + 1 : '•'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate group-hover:text-blue-500">
                      <HighlightMatch text={`${st.lastName} ${st.firstName}`} query={searchQuery} />
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      فوج {st.group} • رصيد السلوك: ({st.bonusPoints >= 0 ? `+${st.bonusPoints}` : st.bonusPoints})
                    </span>
                  </div>
                </button>

                {/* أزرار الحضور لمسية بعرض 44px لمكافحة الأخطاء */}
                <div className="flex items-center gap-1 shrink-0">
                  
                  {/* حاضر */}
                  <button
                    type="button"
                    onClick={() => setStudentAttendanceStatus(st.id, 'present')}
                    className={`min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                      st.attendance === 'present'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">حاضر</span>
                  </button>

                  {/* غائب */}
                  <button
                    type="button"
                    onClick={() => setStudentAttendanceStatus(st.id, 'absent')}
                    className={`min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                      st.attendance === 'absent'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-500/20'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">غائب</span>
                  </button>

                  {/* متأخر */}
                  <button
                    type="button"
                    onClick={() => setStudentAttendanceStatus(st.id, 'late')}
                    className={`min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                      st.attendance === 'late'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-500/20'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">متأخر</span>
                  </button>

                  {/* زر رصد نقطة سلوك بلمسة واحدة */}
                  <button
                    type="button"
                    onClick={() => setBehaviorModalStudent(st)}
                    className="min-h-[44px] px-2.5 rounded-xl bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white transition font-bold text-xs flex items-center justify-center shrink-0"
                    title="رصد نقاط سلوك أو مشاركة"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* =========================================================
          قسم 2: موضوع وسير الدرس
      ========================================================= */}
      {activeSection === 'lesson' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>موضوع الدرس وعناصر المنهاج</span>
            </h3>
            <span className="text-[11px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg">
              {activeClass.level}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                عنوان وموضوع الدرس الحالي:
              </label>
              <input
                type="text"
                value={lessonTitle}
                onChange={e => {
                  setLessonTitle(e.target.value);
                  setSaveStatus('saving');
                  setTimeout(() => setSaveStatus('saved'), 400);
                }}
                placeholder="أدخل عنوان الدرس..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                ملخص العناصر والأنشطة المنجزة:
              </label>
              <textarea
                rows={4}
                value={lessonContent}
                onChange={e => {
                  setLessonContent(e.target.value);
                  setSaveStatus('saving');
                  setTimeout(() => setSaveStatus('saved'), 400);
                }}
                placeholder="اكتب الأنشطة أو التجارب المخبرية المنجزة..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
              />
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
                placeholder="مثال: حل التمارين 12 و15 صفحة 45 من الكتاب المدرسي..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
              />
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
                placeholder="سجل انطباعك عن تفاعل القسم، صعوبات التعلم الملاحظة..."
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

            {unsetCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs">
                <span>⚠️ تنبيه: توجد ({unsetCount}) حالات حضور لم تُحدد بعد. سيتم تعيينها تلقائياً كـ «حاضر» عند تأكيد الإنهاء.</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-bold block">موضوع الدرس المسجل:</span>
              <p className="font-bold text-slate-900 dark:text-white">{lessonTitle || 'لم يتم تسجيل عنوان الدرس'}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowEndSessionConfirmModal(true)}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>تأكيد إنهاء وتوثيق الحصة البيداغوجية ➔</span>
            </button>
          </div>
        </div>
      )}

      {/* النافذة المنبثقة: تأكيد الاعتماد الذري لإنهاء الحصة */}
      {showEndSessionConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تأكيد الاعتماد الذري لإنهاء الحصة</h3>
                <span className="text-[10px] text-slate-400 block">قسم {activeClass.name} • {lessonTitle || 'درس جديد'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>الحاضرون المعُتمدون:</span>
                <strong className="text-emerald-400">{presentCount + unsetCount} تلميذ</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>الغيابات المسجلة:</span>
                <strong className="text-rose-400">{absentCount} غيابات</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>معاملات نقاط السلوك:</span>
                <strong className="text-blue-400 font-mono">{sessionTransactions.length} معاملات</strong>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              عند التأكيد، سيتم توثيق الحضور والغياب ونقاط السلوك ونشر البيانات المسموح بها مباشرة لولي الأمر.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEndSessionConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                تراجع للتعديل
              </button>
              
              <button
                type="button"
                onClick={handleConfirmSessionCompletion}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>اعتماد وتوثيق الحصة الآن</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* النافذة المنبثقة: رصد نقاط السلوك بلمسة واحدة مع السبب */}
      {behaviorModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-black text-white">
                  رصد نقاط سلوك لـ {behaviorModalStudent.lastName} {behaviorModalStudent.firstName}
                </h3>
              </div>
              <button type="button" onClick={() => setBehaviorModalStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">نوع المعاملة والنقاط:</label>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBehaviorDelta(1)}
                    className={`py-2 rounded-xl border transition ${behaviorDelta === 1 ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-300'}`}
                  >
                    +1.0
                  </button>
                  <button
                    type="button"
                    onClick={() => setBehaviorDelta(0.5)}
                    className={`py-2 rounded-xl border transition ${behaviorDelta === 0.5 ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-300'}`}
                  >
                    +0.5
                  </button>
                  <button
                    type="button"
                    onClick={() => setBehaviorDelta(-0.5)}
                    className={`py-2 rounded-xl border transition ${behaviorDelta === -0.5 ? 'bg-rose-600 border-rose-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-300'}`}
                  >
                    -0.5
                  </button>
                  <button
                    type="button"
                    onClick={() => setBehaviorDelta(-1)}
                    className={`py-2 rounded-xl border transition ${behaviorDelta === -1 ? 'bg-rose-600 border-rose-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-300'}`}
                  >
                    -1.0
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">السبب المسجل (يظهر لولي الأمر):</label>
                <input
                  type="text"
                  value={behaviorReason}
                  onChange={e => setBehaviorReason(e.target.value)}
                  placeholder="مثال: مشاركة ممتازة على السبورة"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBehaviorModalStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddBehaviorPoints}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md transition cursor-pointer"
              >
                تأكيد الرصد
              </button>
            </div>

          </div>
        </div>
      )}

      {/* تأكيد تعيين الكل حاضر */}
      {showAllPresentConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-right">
            <h3 className="text-sm font-black text-white">تسجيل جميع تلاميذ القسم كـ «حاضر»؟</h3>
            <p className="text-xs text-slate-300">سيتم تعيين حالة جميع تلاميذ قسم {activeClass.name} كـ «حاضر». يمكنك تغيير حالة أي تلميذ غائب بشكل فردي بعد ذلك.</p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button onClick={() => setShowAllPresentConfirm(false)} className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">إلغاء</button>
              <button onClick={applyAllPresent} className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-md">تأكيد الكل حاضر</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
