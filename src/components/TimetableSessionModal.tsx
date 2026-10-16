import React, { useState } from 'react';
import {
  X, Calendar, Clock, MapPin, Users, BookOpen, FileText,
  Trash2, Save, Sparkles, Check, AlertCircle, Edit3
} from 'lucide-react';
import { TimetableSession, DayOfWeek, ClassGroup } from '../types';

interface TimetableSessionModalProps {
  sessionForm: Partial<TimetableSession>;
  isNew: boolean;
  classes: ClassGroup[];
  timeSlots: { start: string; end: string; label: string }[];
  daysOfWeek: DayOfWeek[];
  onClose: () => void;
  onSave: (session: TimetableSession) => void;
  onDelete: (id: string) => void;
}

export default function TimetableSessionModal({
  sessionForm,
  isNew,
  classes,
  timeSlots,
  daysOfWeek,
  onClose,
  onSave,
  onDelete
}: TimetableSessionModalProps) {
  const [day, setDay] = useState<DayOfWeek>(sessionForm.day || 'الأحد');
  const [startTime, setStartTime] = useState(sessionForm.startTime || '08:00');
  const [endTime, setEndTime] = useState(sessionForm.endTime || '09:00');
  const [className, setClassName] = useState(sessionForm.className || '');
  const [classId, setClassId] = useState(sessionForm.classId || '');
  const [room, setRoom] = useState(sessionForm.room || 'القاعة 01');
  const [groupType, setGroupType] = useState(sessionForm.groupType || 'قسم كامل');
  const [type, setType] = useState(sessionForm.type || 'درس نظري');
  const [notes, setNotes] = useState(sessionForm.notes || '');

  const quickNotesSuggestions = [
    'تحضير تجربة مخبرية ومعايرة كيميائية',
    'حل واجب المسألة ص 45 في كراس الأنشطة',
    'إحضار الآلة الحاسبة العلمية والمستلزمات الهندسية',
    'معالجة بيداغوجية لمفهوم السقوط الشاقولي',
    'توزيع أوراق الفرض المحروس للمراجعة',
    'مراجعة شاملة لاختبار نهاية الفصل'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    const matchedCls = classes.find(c => c.name === className || c.id === classId);
    const finalSession: TimetableSession = {
      id: sessionForm.id || `tt-${Date.now()}`,
      day,
      startTime,
      endTime,
      classId: matchedCls?.id || classId || 'cls-custom',
      className: className.trim(),
      room: room.trim() || 'القاعة 01',
      groupType: groupType as any,
      type: type as any,
      notes: notes.trim()
    };

    onSave(finalSession);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scaleUp">
        {/* هيدر النافذة */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {isNew ? 'إضافة وبرمجة حصة جديدة' : 'تفاصيل الحصة وملاحظات القسم'}
              </h3>
              <p className="text-xs text-slate-300">
                {day} • التوقيت: {startTime} - {endTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* نموذج تفاصيل الحصة والملاحظات */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* اليوم والوقت */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اليوم:</label>
              <select
                value={day}
                onChange={e => setDay(e.target.value as DayOfWeek)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold"
              >
                {daysOfWeek.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">وقت الحصة:</label>
              <select
                value={startTime}
                onChange={e => {
                  const st = e.target.value;
                  const match = timeSlots.find(s => s.start === st);
                  setStartTime(st);
                  setEndTime(match?.end || '09:00');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold"
              >
                {timeSlots.map(s => (
                  <option key={s.start} value={s.start}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* القسم والقاعة */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اختيار القسم:</label>
              <select
                value={className}
                onChange={e => {
                  const selName = e.target.value;
                  const match = classes.find(c => c.name === selName);
                  setClassName(selName);
                  setClassId(match?.id || '');
                  if (match?.room) setRoom(match.room);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-black"
                required
              >
                <option value="">-- اختر القسم --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.level})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">القاعة أو المخبر:</label>
              <input
                type="text"
                placeholder="مخبر الفيزياء 02 / القاعة 14"
                value={room}
                onChange={e => setRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                required
              />
            </div>
          </div>

          {/* نوع الحصة والفوج */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحصة البيداغوجية:</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold"
              >
                <option value="درس نظري">درس نظري</option>
                <option value="أعمال تطبيقية (TP)">أعمال تطبيقية (TP)</option>
                <option value="أعمال موجهة (TD)">أعمال موجهة (TD)</option>
                <option value="معالجة بيداغوجية">معالجة بيداغوجية</option>
                <option value="فرض / اختبار">فرض / اختبار</option>
                <option value="استدراك">استدراك</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الفوج المستهدف:</label>
              <select
                value={groupType}
                onChange={e => setGroupType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold"
              >
                <option value="قسم كامل">قسم كامل</option>
                <option value="فوج 1">فوج 1</option>
                <option value="فوج 2">فوج 2</option>
              </select>
            </div>
          </div>

          {/* قسم الملاحظات الخاص بالقسم والحصة (المطلوب في التحديث بدقة) */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-blue-950 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>ملاحظات خاصة بالقسم والحصة (تظهر عند الضغط على الحصة):</span>
              </label>
              <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">
                توجيهات وتحضير
              </span>
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اكتب ملاحظات خاصة بهذه الحصة: موضوع الدرس، الواجبات المسندة، تجهيزات المخبر، متابعة انضباط الفوج..."
              className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-semibold text-slate-800"
            />

            {/* اقتراحات سريعة للملاحظات بنقرة واحدة */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-blue-900 block">اقتراحات سريعة للملاحظات:</span>
              <div className="flex flex-wrap gap-1.5">
                {quickNotesSuggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNotes(prev => prev ? `${prev} • ${sug}` : sug)}
                    className="text-[10px] bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 px-2 py-1 rounded-lg transition"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* أزرار الحفظ والإلغاء والحذف */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
            {!isNew && sessionForm.id ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('هل تريد حذف هذه الحصة من جدول التوقيت؟')) {
                    onDelete(sessionForm.id!);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف الحصة</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الحصة والملاحظات</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
