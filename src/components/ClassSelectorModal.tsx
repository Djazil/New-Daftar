import React, { useState } from 'react';
import { X, Check, GraduationCap, Users, Plus, ChevronLeft, School, Sparkles } from 'lucide-react';
import { ClassGroup, Level } from '../types';

interface ClassSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassGroup[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onAddNewClass?: () => void;
  maxClasses?: number;
}

const HIGH_SCHOOL_LEVELS: { id: Level; label: string; subLabel: string; badge: string; color: string }[] = [
  {
    id: '1 ثانوي',
    label: 'السنة الأولى ثانوي',
    subLabel: 'جذع مشترك علوم وتكنولوجيا / جذع مشترك آداب',
    badge: '1 AS',
    color: 'from-sky-500 to-blue-600'
  },
  {
    id: '2 ثانوي',
    label: 'السنة الثانية ثانوي',
    subLabel: 'علوم تجريبية / رياضيات / تقني رياضي / تسيير / لغات',
    badge: '2 AS',
    color: 'from-indigo-500 to-purple-600'
  },
  {
    id: '3 ثانوي (بكالوريا)',
    label: 'السنة الثالثة ثانوي (بكالوريا)',
    subLabel: 'أقسام شهادة البكالوريا والتحضير للامتحانات الرسمية',
    badge: '3 AS - BAC',
    color: 'from-amber-500 to-emerald-600'
  }
];

export default function ClassSelectorModal({
  isOpen,
  onClose,
  classes,
  activeClassId,
  onSelectClass,
  onAddNewClass,
  maxClasses = 10
}: ClassSelectorModalProps) {
  const currentClass = classes.find(c => c.id === activeClassId) || classes[0];
  const [selectedLevel, setSelectedLevel] = useState<Level>(currentClass?.level || '3 ثانوي (بكالوريا)');

  if (!isOpen) return null;

  // الأقسام التابعة للمستوى المختار حصراً
  const levelClasses = classes.filter(c => c.level === selectedLevel);
  const totalClassesCount = classes.length;
  const canAddMore = totalClassesCount < maxClasses;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 dir-rtl animate-fadeIn">
      <div
        className="w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden animate-slideUp sm:animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* هيدر النافذة */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">اختيار السنة والقسم الدراسي</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                الأقسام المتاحة: <strong className="font-mono text-blue-600 dark:text-blue-400">{totalClassesCount}</strong> من أصل {maxClasses} أقسام
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى الاختيار: تسلسل خطوتين واضحتين */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 touch-scroll">
          
          {/* الخطوة 1: اختيار السنة التعليمية في الطور الثانوي */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">1</span>
                <span>اختر السنة الدراسية:</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {HIGH_SCHOOL_LEVELS.map(level => {
                const isSelected = selectedLevel === level.id;
                const countForLevel = classes.filter(c => c.level === level.id).length;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setSelectedLevel(level.id)}
                    className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/30'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 bg-gradient-to-br ${level.color} shadow-xs`}>
                        {level.badge.split(' ')[0]}
                      </div>
                      <div className="min-w-0 text-right">
                        <span className={`text-sm font-black block truncate ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                          {level.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                          {level.subLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {countForLevel} {countForLevel === 1 ? 'قسم' : 'أقسام'}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* الخطوة 2: اختيار القسم التابع للسنة المحددة */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">2</span>
                <span>اختر القسم المطلوب في {selectedLevel}:</span>
              </label>
              {canAddMore && onAddNewClass && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddNewClass();
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة قسم جديد</span>
                </button>
              )}
            </div>

            {levelClasses.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                <GraduationCap className="w-8 h-8 mx-auto text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">لا توجد أقسام مسجلة في {selectedLevel} حالياً</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">يمكنك إضافة قسم جديد لهذه السنة بسهولة</p>
                </div>
                {onAddNewClass && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddNewClass();
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إنشاء أول قسم في {selectedLevel}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {levelClasses.map(cls => {
                  const isActive = cls.id === activeClassId;
                  const count = cls.students?.length || 0;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        onSelectClass(cls.id);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="min-w-0">
                          <strong className={`text-base font-black block truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {cls.name}
                          </strong>
                          <span className={`text-[11px] block truncate ${isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {cls.stream || 'شعبة عامة'}
                          </span>
                        </div>
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-white text-blue-700 text-[10px] font-black shrink-0">
                            القسم النشط ✓
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      <div className={`flex items-center justify-between text-[11px] pt-2 border-t font-mono ${
                        isActive ? 'border-blue-500/60 text-blue-100' : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        <span className="flex items-center gap-1 font-sans">
                          <Users className="w-3 h-3" />
                          <span>{count} / 60 تلميذ</span>
                        </span>
                        {cls.room && (
                          <span className="truncate max-w-[120px] font-sans">
                            {cls.room}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* فوتر النافذة */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            القسم النشط حالياً: <strong className="text-slate-900 dark:text-white">{currentClass?.name || 'غير محدد'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
