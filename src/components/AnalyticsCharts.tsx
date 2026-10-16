import React, { useState } from 'react';
import {
  BarChart3, PieChart, TrendingUp, Users, Award, AlertTriangle,
  Scale, Filter, CheckCircle2, Trophy, ArrowUpRight, ChevronRight,
  ChevronLeft, User, Sparkles, BookOpen, Clock, ArrowUpDown, Target,
  Activity, Check, TrendingDown, Eye
} from 'lucide-react';
import { ClassGroup, Student } from '../types';

interface AnalyticsChartsProps {
  activeClass: ClassGroup;
  allClasses: ClassGroup[];
  calcStudentAverage: (student: Student, hasTP: boolean) => number;
  initialSelectedStudentId?: string | null;
  onSelectStudent?: (studentId: string) => void;
}

export default function AnalyticsCharts({
  activeClass,
  allClasses,
  calcStudentAverage,
  initialSelectedStudentId,
  onSelectStudent
}: AnalyticsChartsProps) {
  const [selectedChartMode, setSelectedChartMode] = useState<'all' | 'individual' | 'distribution' | 'groups' | 'classes' | 'attendance'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialSelectedStudentId || activeClass.students[0]?.id || ''
  );

  const students = activeClass.students;
  const totalStudents = students.length || 1;

  // مزامنة اختيار التلميذ عند تغير الخاصية الخارجية أو تغير القسم
  React.useEffect(() => {
    if (initialSelectedStudentId && students.some(s => s.id === initialSelectedStudentId)) {
      setSelectedStudentId(initialSelectedStudentId);
    } else if (students.length > 0 && !students.some(s => s.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id);
    }
  }, [initialSelectedStudentId, activeClass.id, students]);

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    if (onSelectStudent) {
      onSelectStudent(id);
    }
  };

  // 1. حساب فئات توزيع المعدلات
  const grades = students.map(s => calcStudentAverage(s, activeClass.hasTP));
  const excellentCount = grades.filter(g => g >= 16).length;
  const veryGoodCount = grades.filter(g => g >= 14 && g < 16).length;
  const averageCount = grades.filter(g => g >= 10 && g < 14).length;
  const remedialCount = grades.filter(g => g < 10).length;

  const distributionData = [
    {
      label: 'ممتاز (16 - 20)',
      count: excellentCount,
      pct: Math.round((excellentCount / totalStudents) * 100),
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      label: 'جيد جداً (14 - 15.99)',
      count: veryGoodCount,
      pct: Math.round((veryGoodCount / totalStudents) * 100),
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      label: 'متوسط / مقبول (10 - 13.99)',
      count: averageCount,
      pct: Math.round((averageCount / totalStudents) * 100),
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      label: 'بحاجة لمعالجة (< 10)',
      count: remedialCount,
      pct: Math.round((remedialCount / totalStudents) * 100),
      color: 'bg-rose-500',
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200'
    }
  ];

  const maxDistCount = Math.max(...distributionData.map(d => d.count), 1);

  // 2. مقارنة الفوج 1 والفوج 2
  const g1Students = students.filter(s => s.group === 1);
  const g2Students = students.filter(s => s.group === 2);

  const calcGroupAvg = (list: Student[], key: 'avg' | 'cc' | 'test1' | 'exam' | 'absences') => {
    if (list.length === 0) return 0;
    if (key === 'avg') {
      const sum = list.reduce((a, s) => a + calcStudentAverage(s, activeClass.hasTP), 0);
      return Number((sum / list.length).toFixed(2));
    }
    if (key === 'cc') {
      const sum = list.reduce((a, s) => a + Math.max(0, Math.min(20, 10 + s.bonusPoints)), 0);
      return Number((sum / list.length).toFixed(2));
    }
    if (key === 'test1') {
      const sum = list.reduce((a, s) => a + (s.test1 || 0), 0);
      return Number((sum / list.length).toFixed(2));
    }
    if (key === 'exam') {
      const sum = list.reduce((a, s) => a + (s.exam || 0), 0);
      return Number((sum / list.length).toFixed(2));
    }
    if (key === 'absences') {
      const sum = list.reduce((a, s) => a + (s.absencesCount || 0), 0);
      return Number((sum / list.length).toFixed(2));
    }
    return 0;
  };

  const groupMetrics = [
    { label: 'المعدل العام للفصل', g1: calcGroupAvg(g1Students, 'avg'), g2: calcGroupAvg(g2Students, 'avg'), max: 20 },
    { label: 'التقويم المستمر (CC)', g1: calcGroupAvg(g1Students, 'cc'), g2: calcGroupAvg(g2Students, 'cc'), max: 20 },
    { label: 'الفرض 1', g1: calcGroupAvg(g1Students, 'test1'), g2: calcGroupAvg(g2Students, 'test1'), max: 20 },
    { label: 'الاختبار الفصلي', g1: calcGroupAvg(g1Students, 'exam'), g2: calcGroupAvg(g2Students, 'exam'), max: 20 },
    {
      label: 'نسبة النجاح (≥ 10)',
      g1: g1Students.length ? Math.round((g1Students.filter(s => calcStudentAverage(s, activeClass.hasTP) >= 10).length / g1Students.length) * 100) : 0,
      g2: g2Students.length ? Math.round((g2Students.filter(s => calcStudentAverage(s, activeClass.hasTP) >= 10).length / g2Students.length) * 100) : 0,
      max: 100,
      isPct: true
    }
  ];

  // 3. مقارنة معدلات جميع الأقسام
  const classesComparisonData = allClasses.map(cls => {
    const list = cls.students;
    const count = list.length || 1;
    const avg = Number((list.reduce((a, s) => a + calcStudentAverage(s, cls.hasTP), 0) / count).toFixed(2));
    const passRate = Math.round((list.filter(s => calcStudentAverage(s, cls.hasTP) >= 10).length / count) * 100);
    return {
      id: cls.id,
      name: cls.name,
      level: cls.level,
      studentsCount: list.length,
      average: avg,
      passRate,
      isActive: cls.id === activeClass.id
    };
  });

  // 4. إحصاءات الانضباط والغيابات
  const zeroAbsencesCount = students.filter(s => s.absencesCount === 0).length;
  const normalAbsencesCount = students.filter(s => s.absencesCount > 0 && s.absencesCount < 3).length;
  const warningAbsencesCount = students.filter(s => s.absencesCount >= 3).length;

  // 5. حسابات الإحصائيات الفردية للتلميذ المختار
  const activeStudentIndex = students.findIndex(s => s.id === selectedStudentId);
  const selectedStudent = students[activeStudentIndex >= 0 ? activeStudentIndex : 0] || students[0];

  const sortedByAvg = [...students].sort((a, b) => calcStudentAverage(b, activeClass.hasTP) - calcStudentAverage(a, activeClass.hasTP));
  const studentRank = selectedStudent ? sortedByAvg.findIndex(s => s.id === selectedStudent.id) + 1 : 1;

  // متوسطات القسم الإجمالية للمقارنة الفردية
  const classAvgCC = Number((students.reduce((acc, s) => acc + Math.max(0, Math.min(20, 10 + s.bonusPoints)), 0) / totalStudents).toFixed(2));
  const classAvgTP = Number((students.reduce((acc, s) => acc + (s.tpScore || 0), 0) / totalStudents).toFixed(2));
  const classAvgTest1 = Number((students.reduce((acc, s) => acc + (s.test1 || 0), 0) / totalStudents).toFixed(2));
  const classAvgTest2 = Number((students.reduce((acc, s) => acc + (s.test2 || 0), 0) / totalStudents).toFixed(2));
  const classAvgExam = Number((students.reduce((acc, s) => acc + (s.exam || 0), 0) / totalStudents).toFixed(2));
  const classOverallAvg = Number((students.reduce((acc, s) => acc + calcStudentAverage(s, activeClass.hasTP), 0) / totalStudents).toFixed(2));

  // نقاط التلميذ المختار
  const currentCC = selectedStudent ? Math.max(0, Math.min(20, 10 + selectedStudent.bonusPoints)) : 0;
  const currentTP = selectedStudent?.tpScore || 0;
  const currentTest1 = selectedStudent?.test1 || 0;
  const currentTest2 = selectedStudent?.test2 || 0;
  const currentExam = selectedStudent?.exam || 0;
  const currentAvg = selectedStudent ? calcStudentAverage(selectedStudent, activeClass.hasTP) : 0;

  const componentComparisonData = [
    { label: 'التقويم المستمر CC', studentVal: currentCC, classAvg: classAvgCC, max: 20 },
    ...(activeClass.hasTP ? [{ label: 'العمل التطبيقي TP', studentVal: currentTP, classAvg: classAvgTP, max: 20 }] : []),
    { label: 'الفرض الأول', studentVal: currentTest1, classAvg: classAvgTest1, max: 20 },
    { label: 'الفرض الثاني', studentVal: currentTest2, classAvg: classAvgTest2, max: 20 },
    { label: 'الاختبار الفصلي', studentVal: currentExam, classAvg: classAvgExam, max: 20 },
    { label: 'المعدل الفصلي النهائي', studentVal: currentAvg, classAvg: classOverallAvg, max: 20 }
  ];

  const handlePrevStudent = () => {
    if (students.length === 0) return;
    const prevIdx = (activeStudentIndex - 1 + students.length) % students.length;
    handleSelectStudent(students[prevIdx].id);
  };

  const handleNextStudent = () => {
    if (students.length === 0) return;
    const nextIdx = (activeStudentIndex + 1) % students.length;
    handleSelectStudent(students[nextIdx].id);
  };

  return (
    <div className="space-y-6">
      {/* شريط أدوات الرسوم البيانية وفلاتر العرض */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <span>الرسومات البيانية والتحليل المرئي للنتائج</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                قسم {activeClass.name}
              </span>
            </h3>
            <p className="text-xs text-slate-500">تمثيل بياني تفاعلي لتوزيع المعدلات، الإحصائيات الفردية لكل تلميذ، ومقارنة الأفواج والأقسام</p>
          </div>
        </div>

        {/* فلاتر الرسوم البيانية */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setSelectedChartMode('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedChartMode === 'all' ? 'bg-white text-blue-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            جميع الرسوم
          </button>
          <button
            onClick={() => setSelectedChartMode('individual')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              selectedChartMode === 'individual' ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>إحصائيات كل تلميذ (فردي)</span>
          </button>
          <button
            onClick={() => setSelectedChartMode('distribution')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedChartMode === 'distribution' ? 'bg-white text-blue-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مدرج المعدلات
          </button>
          <button
            onClick={() => setSelectedChartMode('groups')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedChartMode === 'groups' ? 'bg-white text-blue-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مقارنة الفوجين (ف1 و ف2)
          </button>
          <button
            onClick={() => setSelectedChartMode('classes')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedChartMode === 'classes' ? 'bg-white text-blue-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مقارنة الأقسام
          </button>
          <button
            onClick={() => setSelectedChartMode('attendance')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedChartMode === 'attendance' ? 'bg-white text-blue-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الانضباط والغياب
          </button>
        </div>
      </div>

      {/* 0. التحليل والإحصائيات التفصيلية لكل تلميذ بمفرده (Individual Student Detailed Charts) */}
      {(selectedChartMode === 'all' || selectedChartMode === 'individual') && selectedStudent && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          {/* هيدر التلميذ مع أدوات التنقل بين التلاميذ */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20">
                {selectedStudent.firstName[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base sm:text-lg font-black text-slate-900">
                    {selectedStudent.lastName} {selectedStudent.firstName}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    الفوج {selectedStudent.group}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                    طاولة #{selectedStudent.seatIndex + 1}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  كود الولي: <strong className="font-mono text-blue-700">{selectedStudent.parentCode}</strong> • قسم {activeClass.name}
                </p>
              </div>
            </div>

            {/* شريط اختيار والتنقل بين التلاميذ */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={handlePrevStudent}
                  className="p-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-200 transition shadow-xs cursor-pointer"
                  title="التلميذ السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <select
                  value={selectedStudent.id}
                  onChange={e => handleSelectStudent(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-800 px-2 py-1 focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[240px]"
                >
                  {students.map((st, idx) => (
                    <option key={st.id} value={st.id}>
                      #{idx + 1} {st.lastName} {st.firstName} (ف{st.group})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleNextStudent}
                  className="p-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-200 transition shadow-xs cursor-pointer"
                  title="التلميذ التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* شبكة الأيقونات المصغرة للتنقل السريع بين جميع تلاميذ القسم */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 flex items-center justify-between">
              <span>اختر تلميذاً من القائمة لعرض إحصائياته بيانيا مباشرة ({students.length} تلميذ):</span>
              <span className="text-[11px] text-blue-600 font-bold">التلميذ رقم: {activeStudentIndex + 1} من أصل {students.length}</span>
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 touch-scroll">
              {students.map((st, idx) => {
                const isCurrent = st.id === selectedStudent.id;
                const stAvg = calcStudentAverage(st, activeClass.hasTP);
                return (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStudent(st.id)}
                    className={`px-3 py-2 rounded-2xl border transition shrink-0 text-right flex items-center gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      isCurrent ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-black truncate max-w-[110px]">
                        {st.lastName} {st.firstName}
                      </div>
                      <div className={`text-[10px] font-mono ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                        {stAvg} / 20
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. مؤشرات الأداء الحيوية والترتيب */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* الترتيب الفردي في القسم */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 text-center relative overflow-hidden">
              <div className="flex items-center justify-center gap-1 text-amber-800 text-[11px] font-bold mb-1">
                <Trophy className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>الترتيب في القسم</span>
              </div>
              <div className="text-2xl font-black text-amber-900 font-mono">
                #{studentRank} <span className="text-xs font-normal text-amber-700">/ {totalStudents}</span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 block mt-0.5">
                {studentRank === 1 ? '🥇 الأول على القسم' : studentRank <= 3 ? '🏆 ضمن الثلاثة الأوائل' : studentRank <= Math.ceil(totalStudents / 2) ? 'ضمن النصف الأعلى' : 'يحتاج تكثيف الجهود'}
              </span>
            </div>

            {/* المعدل الفصلي للمادة */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">معدل المادة الحالي</span>
              <div className="text-2xl font-black text-blue-600 font-mono">
                {currentAvg} <span className="text-xs text-slate-400">/ 20</span>
              </div>
              <span className={`text-[10px] font-black ${
                currentAvg >= classOverallAvg ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {currentAvg >= classOverallAvg ? `+${(currentAvg - classOverallAvg).toFixed(2)} عن متوسط القسم` : `${(currentAvg - classOverallAvg).toFixed(2)} عن متوسط القسم`}
              </span>
            </div>

            {/* فارق الفروض (التطور) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">تطور الفروض (ف2 - ف1)</span>
              <div className={`text-2xl font-black font-mono ${
                currentTest2 >= currentTest1 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {currentTest2 - currentTest1 > 0 ? `+${(currentTest2 - currentTest1).toFixed(1)}` : (currentTest2 - currentTest1).toFixed(1)}
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                {currentTest2 >= currentTest1 ? '↗️ منحنى تصاعدي إيجابي' : '🔻 تراجع يستدعي مراجعة'}
              </span>
            </div>

            {/* غيابات التلميذ */}
            <div className={`p-3.5 rounded-2xl border text-center ${
              selectedStudent.absencesCount >= 3 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[11px] font-bold text-slate-500 block mb-1">عدد الغيابات والتأخرات</span>
              <div className={`text-2xl font-black font-mono ${
                selectedStudent.absencesCount >= 3 ? 'text-rose-600' : 'text-slate-800'
              }`}>
                {selectedStudent.absencesCount} <span className="text-xs font-normal text-slate-400">حصة</span>
              </div>
              <span className={`text-[10px] font-bold ${
                selectedStudent.absencesCount >= 3 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {selectedStudent.absencesCount >= 3 ? '⚠️ تجاوز الحد القانوني' : 'مواظبة ممتازة'}
              </span>
            </div>
          </div>

          {/* 2. الرسم البياني لمقارنة درجات التلميذ مقابل متوسط القسم */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h5 className="text-xs sm:text-sm font-black text-slate-900">
                  الرسم البياني المقارن: درجات التلميذ (أزرق) مقابل متوسط القسم (رمادي)
                </h5>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-blue-700">
                  <span className="w-3 h-3 rounded bg-blue-600" />
                  <span>نقاط التلميذ</span>
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-3 h-3 rounded bg-slate-400" />
                  <span>متوسط القسم ({classOverallAvg})</span>
                </span>
              </div>
            </div>

            <div className="space-y-3.5 pt-1">
              {componentComparisonData.map((item, idx) => {
                const studentPct = Math.min(100, Math.max(0, Math.round((item.studentVal / item.max) * 100)));
                const classPct = Math.min(100, Math.max(0, Math.round((item.classAvg / item.max) * 100)));
                const diff = Number((item.studentVal - item.classAvg).toFixed(2));

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800">{item.label}</span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-blue-700 font-black">التلميذ: {item.studentVal} / 20</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-600">متوسط القسم: {item.classAvg} / 20</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {diff >= 0 ? `+${diff}` : diff}
                        </span>
                      </div>
                    </div>

                    {/* أشرطة المقارنة المزدوجة */}
                    <div className="space-y-1">
                      {/* شريط التلميذ */}
                      <div className="h-3.5 w-full bg-slate-200/80 rounded-lg overflow-hidden relative">
                        <div
                          style={{ width: `${studentPct}%` }}
                          className={`h-full rounded-lg transition-all duration-500 ${
                            item.studentVal >= 14 ? 'bg-emerald-500' : item.studentVal >= 10 ? 'bg-blue-600' : 'bg-rose-500'
                          }`}
                        />
                      </div>
                      {/* شريط متوسط القسم */}
                      <div className="h-2 w-full bg-slate-200/50 rounded-lg overflow-hidden">
                        <div
                          style={{ width: `${classPct}%` }}
                          className="h-full bg-slate-400/80 rounded-lg transition-all duration-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. الرسم البياني لمواد التلميذ المختلفة (إذا توفرت بيانات باقي المواد) */}
          {selectedStudent.otherSubjects && selectedStudent.otherSubjects.length > 0 && (
            <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <h5 className="text-xs sm:text-sm font-black text-slate-900">
                    الرسم البياني لأداء التلميذ في جميع المواد الدراسية
                  </h5>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  عدد المواد المسجلة: {selectedStudent.otherSubjects.length} مواد
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedStudent.otherSubjects.map((sub, sIdx) => {
                  const subPct = Math.min(100, Math.round((sub.average / 20) * 100));
                  return (
                    <div key={sIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs truncate max-w-[140px]">
                          {sub.subject}
                        </span>
                        <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {sub.average} / 20
                        </span>
                      </div>

                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                        <div
                          style={{ width: `${subPct}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            sub.average >= 14 ? 'bg-emerald-500' : sub.average >= 10 ? 'bg-blue-500' : 'bg-rose-500'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>المعامل: {sub.coefficient}</span>
                        <span>{sub.teacherName || 'الأستاذ'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. ملخص التشخيص والتوجيه المباشر */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <strong className="text-blue-900 block font-black">التشخيص البيداغوجي المباشر للتلميذ:</strong>
                <span className="text-slate-700">
                  "{selectedStudent.parentNotes || selectedStudent.remark || 'تلميذ مواظب، يُنصح بالاستمرار في دعم الجوانب التطبيقية وحل التمارين التقييمية.'}"
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. مدرج تكراري لتوزيع المعدلات (Grade Distribution Bar Chart) */}
      {(selectedChartMode === 'all' || selectedChartMode === 'distribution') && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  مدرج توزيع معدلات القسم (Histogram)
                </h4>
                <p className="text-xs text-slate-500">
                  توزيع {students.length} تلميذ حسب شرائح التحصيل البيداغوجي المعتمدة
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-slate-500">
              نسبة النجاح العامة: <span className="text-emerald-600 font-black text-sm">{Math.round(((excellentCount + veryGoodCount + averageCount) / totalStudents) * 100)}%</span>
            </div>
          </div>

          {/* الرسم البياني بالأعمدة الأفقية والعمودية التفاعلية */}
          <div className="space-y-4 pt-2">
            {distributionData.map((item, idx) => {
              const widthPct = Math.max(6, Math.round((item.count / maxDistCount) * 100));
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono text-slate-600">
                      <strong className={`text-sm font-black ${item.textColor}`}>{item.count}</strong> تلميذ ({item.pct}%)
                    </span>
                  </div>

                  <div className="h-6 w-full bg-slate-100 rounded-xl overflow-hidden p-0.5 border border-slate-200/80">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className={`h-full rounded-lg ${item.color} transition-all duration-700 flex items-center justify-end px-2 text-[10px] font-black text-white shadow-xs`}
                    >
                      {item.count > 0 && <span>{item.pct}%</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* بطاقات الإحصاء السريع أسفل الرسم */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
              <span className="text-[11px] font-bold text-emerald-800 block">فئة الامتياز (≥ 16)</span>
              <span className="text-xl font-black text-emerald-600 font-mono">{excellentCount}</span>
              <span className="text-[10px] text-emerald-700 block">تلميذ متفوق</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-center">
              <span className="text-[11px] font-bold text-blue-800 block">فئة الجيد جداً (14-16)</span>
              <span className="text-xl font-black text-blue-600 font-mono">{veryGoodCount}</span>
              <span className="text-[10px] text-blue-700 block">مستوى مشجع</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
              <span className="text-[11px] font-bold text-amber-800 block">فئة المقبول (10-14)</span>
              <span className="text-xl font-black text-amber-600 font-mono">{averageCount}</span>
              <span className="text-[10px] text-amber-700 block">مقبول متوسط</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-center">
              <span className="text-[11px] font-bold text-rose-800 block">فئة التدارك (&lt; 10)</span>
              <span className="text-xl font-black text-rose-600 font-mono">{remedialCount}</span>
              <span className="text-[10px] text-rose-700 block">يحتاجون معالجة</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. الرسم البياني لمقارنة أداء الفوجين (Group 1 vs Group 2 Chart) */}
      {(selectedChartMode === 'all' || selectedChartMode === 'groups') && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  الرسم البياني التفاضلي: مقارنة الفوج 1 والفوج 2
                </h4>
                <p className="text-xs text-slate-500">
                  مقارنة الأعمدة البيانية المزدوجة بين الفوجين عبر عناصر التقييم الرسمية
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600" />
                <span>الفوج 1 ({g1Students.length} تلميذ)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-600" />
                <span>الفوج 2 ({g2Students.length} تلميذ)</span>
              </span>
            </div>
          </div>

          <div className="space-y-5 pt-2">
            {groupMetrics.map((m, idx) => {
              const g1Pct = Math.min(100, Math.round((m.g1 / m.max) * 100));
              const g2Pct = Math.min(100, Math.round((m.g2 / m.max) * 100));
              const diff = Number((m.g1 - m.g2).toFixed(2));

              return (
                <div key={idx} className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 font-black">{m.label}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-blue-700 font-black">
                        ف1: {m.g1} {m.isPct ? '%' : '/ 20'}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-purple-700 font-black">
                        ف2: {m.g2} {m.isPct ? '%' : '/ 20'}
                      </span>
                      {diff !== 0 && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          diff > 0 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {diff > 0 ? `+${diff} لـ ف1` : `+${Math.abs(diff)} لـ ف2`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* شريطان متوازيان لكل فوج */}
                  <div className="space-y-1.5">
                    {/* شريط الفوج 1 */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-700 w-10">فوج 1</span>
                      <div className="h-4 flex-1 bg-slate-200/70 rounded-lg overflow-hidden">
                        <div
                          style={{ width: `${g1Pct}%` }}
                          className="h-full bg-blue-600 rounded-lg transition-all duration-500"
                        />
                      </div>
                    </div>

                    {/* شريط الفوج 2 */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-purple-700 w-10">فوج 2</span>
                      <div className="h-4 flex-1 bg-slate-200/70 rounded-lg overflow-hidden">
                        <div
                          style={{ width: `${g2Pct}%` }}
                          className="h-full bg-purple-600 rounded-lg transition-all duration-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. مقارنة معدلات جميع الأقسام (All Classes Comparison Chart) */}
      {(selectedChartMode === 'all' || selectedChartMode === 'classes') && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  الرسم البياني لمقارنة أداء جميع الأقسام
                </h4>
                <p className="text-xs text-slate-500">
                  مقارنة المعدل الفصلي ونسبة النجاح لكل فوج وقسم مسند للأستاذ
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              إجمالي الأقسام: {allClasses.length} أقسام
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {classesComparisonData.map(c => {
              const avgHeight = Math.min(100, Math.round((c.average / 20) * 100));
              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-2xl border transition relative space-y-3 ${
                    c.isActive
                      ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {c.isActive && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white">
                      القسم الحالي
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-black text-slate-800 text-sm">{c.name}</h5>
                      <span className="text-[11px] text-slate-500">{c.level} ({c.studentsCount} تلميذ)</span>
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-xl font-black text-slate-900">{c.average}</div>
                      <span className="text-[10px] text-slate-400">/ 20</span>
                    </div>
                  </div>

                  {/* شريط بياني للمعدل */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                      <span>مستوى المعدل</span>
                      <span className="text-slate-800 font-mono">{avgHeight}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                      <div
                        style={{ width: `${avgHeight}%` }}
                        className={`h-full rounded-full ${
                          c.average >= 14 ? 'bg-emerald-500' : c.average >= 10 ? 'bg-blue-500' : 'bg-rose-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* إحصائيات سريعة */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1 border-t border-slate-100">
                    <div className="bg-slate-50 p-1.5 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">نسبة النجاح</span>
                      <span className="font-black text-emerald-600">{c.passRate}%</span>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">التقييم</span>
                      <span className="font-black text-slate-700">
                        {c.average >= 14 ? 'مرتفع' : c.average >= 10 ? 'متوسط' : 'تدارك'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. الرسم البياني للانضباط والغيابات (Attendance & Radar Chart) */}
      {(selectedChartMode === 'all' || selectedChartMode === 'attendance') && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  الرسم البياني للانضباط والمواظبة وغيابات القسم
                </h4>
                <p className="text-xs text-slate-500">
                  مؤشرات الحضور التراكمية ورادار اليقظة عند تجاوز 3 غيابات
                </p>
              </div>
            </div>
            {warningAbsencesCount > 0 ? (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>{warningAbsencesCount} تلاميذ تجاوزوا 3 غيابات</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>المواظبة ممتازة تماماً</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center space-y-2">
              <span className="text-xs font-bold text-emerald-800 block">بدون أي غياب (انضباط تام)</span>
              <div className="text-3xl font-black text-emerald-600 font-mono">{zeroAbsencesCount}</div>
              <div className="text-xs text-emerald-700 font-bold">
                {Math.round((zeroAbsencesCount / totalStudents) * 100)}% من تلاميذ القسم
              </div>
              <div className="h-2.5 w-full bg-emerald-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.round((zeroAbsencesCount / totalStudents) * 100)}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-2">
              <span className="text-xs font-bold text-amber-800 block">غيابات عادية (1 أو 2 غياب)</span>
              <div className="text-3xl font-black text-amber-600 font-mono">{normalAbsencesCount}</div>
              <div className="text-xs text-amber-700 font-bold">
                {Math.round((normalAbsencesCount / totalStudents) * 100)}% من تلاميذ القسم
              </div>
              <div className="h-2.5 w-full bg-amber-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.round((normalAbsencesCount / totalStudents) * 100)}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 text-center space-y-2">
              <span className="text-xs font-bold text-rose-800 block">تنبيه وإنذار (≥ 3 غيابات)</span>
              <div className="text-3xl font-black text-rose-600 font-mono">{warningAbsencesCount}</div>
              <div className="text-xs text-rose-700 font-bold">
                {Math.round((warningAbsencesCount / totalStudents) * 100)}% من تلاميذ القسم
              </div>
              <div className="h-2.5 w-full bg-rose-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.round((warningAbsencesCount / totalStudents) * 100)}%` }}
                  className="h-full bg-rose-600 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
