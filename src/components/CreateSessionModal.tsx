import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, BookOpen, AlertCircle, X, Check,
  Play, ShieldAlert, ArrowRight, School
} from 'lucide-react';
import { ClassGroup, DayOfWeek, ClassSession } from '../types';
import { getDayOfWeekFromDate, createClassSession, getActiveTeacherSession } from '../services/sessionService';

interface CreateSessionModalProps {
  teacherEmail: string;
  teacherSubject: string;
  classes: ClassGroup[];
  activeClassId: string;
  onClose: () => void;
  onSessionCreated: (session: ClassSession) => void;
  onReturnToActiveSession: (activeSession: ClassSession) => void;
}

export default function CreateSessionModal({
  teacherEmail,
  teacherSubject,
  classes,
  activeClassId,
  onClose,
  onSessionCreated,
  onReturnToActiveSession
}: CreateSessionModalProps) {
  const selectedClass = classes.find(c => c.id === activeClassId) || classes[0];

  const [classId, setClassId] = useState(selectedClass?.id || '');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // حالة نزاع الحصة النشطة التداخلي
  const [activeConflict, setActiveConflict] = useState<ClassSession | null>(null);

  // الاشتقاق الآلي لاسم اليوم من التاريخ
  const derivedDay: DayOfWeek = getDayOfWeekFromDate(sessionDate);

  // فحص حثيث عند فتح النافذة
  useEffect(() => {
    getActiveTeacherSession(teacherEmail).then(active => {
      if (active) {
        setActiveConflict(active);
      }
    });
  }, [teacherEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      setErrorMessage('وقت نهاية الحصة يجب أن يكون بعد وقت البداية بشكل صحيح.');
      return;
    }

    const currentCls = classes.find(c => c.id === classId) || selectedClass;
    if (!currentCls) {
      setErrorMessage('يرجى تحديد قسم دراسي صالح.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await createClassSession({
      teacherEmail,
      level: currentCls.level,
      classId: currentCls.id,
      className: currentCls.name,
      subject: teacherSubject || 'مادة التخصص',
      date: sessionDate,
      dayOfWeek: derivedDay,
      startTime,
      endTime,
      topic: topic.trim() || 'درس جديد'
    });

    setIsSubmitting(false);

    if (!result.success) {
      if (result.activeSessionConflict) {
        setActiveConflict(result.activeSessionConflict);
      } else {
        setErrorMessage(result.message);
      }
      return;
    }

    if (result.session) {
      onSessionCreated(result.session);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 dir-rtl">
      
      {/* نافذة منع التداخل عند وجود حصة نشطة بالخلفية */}
      {activeConflict ? (
        <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-slideUp text-right">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wider">تنبيه حماية الحصص</span>
              <h3 className="text-base sm:text-lg font-black text-white">توجد حصة نشطة بالفعل</h3>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">القسم النشط:</span>
              <span className="text-white font-black text-sm">{activeConflict.className}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">المادة:</span>
              <span className="text-amber-400 font-bold">{activeConflict.subject}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">وقت البداية:</span>
              <span className="text-white font-mono">{activeConflict.startTime} ({activeConflict.dayOfWeek})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">موضوع الدرس:</span>
              <span className="text-slate-200 truncate">{activeConflict.topic || 'بدون عنوان'}</span>
            </div>
          </div>

          <p className="text-xs text-amber-200/90 leading-relaxed">
            لا يمكنك تشغيل أكثر من حصة واحدة في الوقت نفسه. يرجى العودة إلى الحصة الحالية وإنهائها أولاً قبل تشغيل حصة أخرى.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onReturnToActiveSession(activeConflict)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>العودة لمتابعة الحصة النشطة الحالية ➔</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              إلغاء والعودة
            </button>
          </div>
        </div>
      ) : (
        /* نموذج إنشاء وتنسيق الحصة المباشرة */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-slideUp text-right">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 border border-blue-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">إعداد وبدء حصة مباشرة جديدة</h3>
                <span className="text-[11px] text-slate-400 block">حدد موعد وموضوع الحصة قبل بدء التسجيل</span>
              </div>
            </div>

            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* اختيار القسم */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">القسم المستهدف:</label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level} - {c.stream})
                  </option>
                ))}
              </select>
            </div>

            {/* التاريخ واليوم المستخرج تلقائياً */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الحصة:</label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">يوم الحصة (تلقائي):</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-blue-400 text-xs font-bold">
                  {derivedDay}
                </div>
              </div>
            </div>

            {/* أوقات البداية والنهاية */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">توقيت البداية:</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">توقيت النهاية:</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* موضوع الدرس */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">موضوع أو عنوان الدرس (اختياري):</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="مثال: الدراسة الحركية لتفاعل كيميائي (الوحدة 1)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isSubmitting ? 'جاري الفحص والبدء...' : 'بدء الحصة الآن'}</span>
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
