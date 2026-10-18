import React, { useState } from 'react';
import { X, Award, Save, CheckCircle2, AlertCircle, TrendingUp, Calculator, BookOpen, Clock } from 'lucide-react';
import { Student, ClassGroup } from '../types';
import { calcStudentAverage, calcContinuousScore } from '../App';

interface StudentGradesModalProps {
  student: Student;
  classInfo: ClassGroup;
  onClose: () => void;
  onSaveGrades: (updatedStudent: Student) => void;
  teacherSubject: string;
}

export default function StudentGradesModal({
  student,
  classInfo,
  onClose,
  onSaveGrades,
  teacherSubject
}: StudentGradesModalProps) {
  // الحقول القابلة للتعديل
  const [bonusPoints, setBonusPoints] = useState(student.bonusPoints ?? 0);
  const [tpScore, setTpScore] = useState<number | ''>(student.tpScore !== undefined ? student.tpScore : 10);
  const [test1, setTest1] = useState<number | ''>(student.test1 !== undefined ? student.test1 : 10);
  const [test2, setTest2] = useState<number | ''>(student.test2 !== undefined ? student.test2 : 10);
  const [exam, setExam] = useState<number | ''>(student.exam !== undefined ? student.exam : 10);
  const [remark, setRemark] = useState(student.remark || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // حساب المعدل الآني في النافذة
  const currentPreviewStudent: Student = {
    ...student,
    bonusPoints: Number(bonusPoints) || 0,
    tpScore: tpScore === '' ? 0 : Number(tpScore),
    test1: test1 === '' ? 0 : Number(test1),
    test2: test2 === '' ? 0 : Number(test2),
    exam: exam === '' ? 0 : Number(exam),
    remark
  };

  const calculatedAvg = calcStudentAverage(currentPreviewStudent, classInfo.hasTP);
  const continuousScore = calcContinuousScore(Number(bonusPoints) || 0);

  const handleSave = () => {
    setIsSaving(true);
    try {
      onSaveGrades(currentPreviewStudent);
      setSaveFeedback({ text: 'تم حفظ وتحديث نقاط التلميذ في قاعدة البيانات بنجاح', type: 'success' });
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsSaving(false);
      setSaveFeedback({ text: 'فشل حفظ النقاط: ' + (err?.message || ''), type: 'error' });
    }
  };

  const handleScoreChange = (
    val: string,
    setter: (n: number | '') => void,
    min: number = 0,
    max: number = 20
  ) => {
    if (val === '') {
      setter('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= min && num <= max) {
      setter(num);
    }
  };

  return (
    <div className="fixed inset-0 z-[125] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 dir-rtl animate-fadeIn">
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-slideUp sm:animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* هيدر نافذة النقاط */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black truncate">
                {student.lastName} {student.firstName}
              </h3>
              <p className="text-xs text-blue-200 mt-0.5 truncate">
                {classInfo.name} ({classInfo.level}) • مادة: {teacherSubject}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بطاقة المعدل الفصلي التقديري الحي */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">المعدل الفصلي التقديري للمادة:</span>
            <span className="text-[10px] text-slate-400">محسوب وفق معاملات الرقمنة الوزارية الجزائرية</span>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono px-3 py-1.5 rounded-2xl shadow-xs ${
            calculatedAvg >= 10
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
          }`}>
            {calculatedAvg} <span className="text-xs font-sans">/ 20</span>
          </div>
        </div>

        {/* جسم النافذة: حقول إدخال النقاط في بطاقات سهلة للمس بالهاتف */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 touch-scroll">
          
          {/* رسائل التنبيه */}
          {saveFeedback && (
            <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              saveFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {saveFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{saveFeedback.text}</span>
            </div>
          )}

          {/* 1. التقويم المستمر والرصيد */}
          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-blue-900 dark:text-blue-300">
                1. التقويم المستمر (المشاركة والسلوك والانضباط)
              </label>
              <span className="text-xs font-black text-blue-700 dark:text-blue-400 font-mono">
                {continuousScore} / 20
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600 dark:text-slate-400">رصيد الزيادة/الخصم:</span>
              <input
                type="number"
                step="0.5"
                min="-10"
                max="6"
                value={bonusPoints}
                onChange={e => setBonusPoints(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 text-center text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBonusPoints(b => Number((b + 0.5).toFixed(2)))}
                  className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                >
                  +0.5
                </button>
                <button
                  type="button"
                  onClick={() => setBonusPoints(b => Number((b - 0.5).toFixed(2)))}
                  className="px-2 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold"
                >
                  -0.5
                </button>
              </div>
            </div>
          </div>

          {/* 2. الأعمال التطبيقية المخبرية TP (إن وجدت للمادة) */}
          {classInfo.hasTP && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                  2. علامة الأعمال التطبيقية المخبرية (TP):
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="20"
                  value={tpScore}
                  onChange={e => handleScoreChange(e.target.value, setTpScore)}
                  placeholder="من 20"
                  className="w-24 px-3 py-1.5 text-center font-bold text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* 3. الفروض الكتابية (الفرض 1 والفرض 2) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
              3. الفروض المحروسة الدورية:
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">الفرض 1:</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="20"
                  value={test1}
                  onChange={e => handleScoreChange(e.target.value, setTest1)}
                  placeholder="من 20"
                  className="w-full px-3 py-2 text-center font-bold text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">الفرض 2:</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="20"
                  value={test2}
                  onChange={e => handleScoreChange(e.target.value, setTest2)}
                  placeholder="من 20"
                  className="w-full px-3 py-2 text-center font-bold text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 4. الاختبار الفصلي الرسمي (معامل 2 في حساب معدل المادة) */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-indigo-950 dark:text-indigo-200 block">
                  4. علامة الاختبار الفصلي الرسمي:
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400">يحسب بضرب ×2 وفق المنشور الوزاري</span>
              </div>
              <input
                type="number"
                step="0.25"
                min="0"
                max="20"
                value={exam}
                onChange={e => handleScoreChange(e.target.value, setExam)}
                placeholder="من 20"
                className="w-24 px-3 py-2 text-center font-black text-base rounded-xl border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-950 dark:text-white shadow-xs"
              />
            </div>
          </div>

          {/* 5. ملاحظة وتوجيه الأستاذ */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              ملاحظة الأستاذ التقييمية:
            </label>
            <textarea
              rows={2}
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="مثال: عمل ممتاز، تحصيل دراسي جيد جداً مع التزام تام بالواجبات..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

        </div>

        {/* أزرار الحفظ والإلغاء */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ النقاط الآن'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
