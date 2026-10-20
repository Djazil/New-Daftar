import React, { useState } from 'react';
import {
  Settings, User, BookOpen, School, MapPin, Users, Plus, Trash2, Edit3,
  Save, X, CheckCircle2, AlertCircle, RefreshCw, Upload, Sparkles
} from 'lucide-react';
import { TeacherProfile, ClassGroup, Student, Level } from '../types';
import StudentImportModal from './StudentImportModal';
import BrandLogo from './BrandLogo';

const SUBJECTS = [
  'العلوم الفيزيائية والتكنولوجيا',
  'العلوم الطبيعية والحياة',
  'الرياضيات',
  'اللغة العربية وآدابها',
  'علوم الشريعة الإسلامية',
  'التاريخ والجغرافيا',
  'الفلسفة',
  'اللغة الفرنسية',
  'اللغة الإنجليزية',
  'الهندسة المدنية',
  'الهندسة الميكانيكية',
  'الهندسة الكهربائية',
  'تسيير واقتصاد'
];

const LEVELS: Level[] = ['1 ثانوي', '2 ثانوي', '3 ثانوي (بكالوريا)'];

interface TeacherSettingsModalProps {
  teacherProfile: TeacherProfile;
  classes: ClassGroup[];
  onSave: (updatedProfile: TeacherProfile, updatedClasses: ClassGroup[]) => Promise<boolean>;
  onClose: () => void;
}

export default function TeacherSettingsModal({
  teacherProfile,
  classes,
  onSave,
  onClose
}: TeacherSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'classes'>('profile');

  // مسودة ملف الأستاذ
  const [profileForm, setProfileForm] = useState<TeacherProfile>({ ...teacherProfile });

  // مسودة الأقسام
  const [classesList, setClassesList] = useState<ClassGroup[]>(() => JSON.parse(JSON.stringify(classes)));

  // حالة حفظ البيانات
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // إدارة النافذة المنبثقة لاستيراد التلاميذ
  const [selectedClassForImport, setSelectedClassForImport] = useState<ClassGroup | null>(null);

  // إضافة قسم جديد
  const [newClassForm, setNewClassForm] = useState({
    name: '',
    level: '3 ثانوي (بكالوريا)' as Level,
    stream: 'علوم تجريبية',
    room: 'القاعة 01',
    schedule: 'الأحد - 08:00'
  });

  const handleAddClass = () => {
    if (!newClassForm.name.trim()) return;

    const newClass: ClassGroup = {
      id: `class_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newClassForm.name.trim(),
      level: newClassForm.level,
      stream: newClassForm.stream,
      room: newClassForm.room,
      schedule: newClassForm.schedule,
      hasTP: true,
      students: []
    };

    setClassesList(prev => [...prev, newClass]);
    setNewClassForm({
      name: '',
      level: '3 ثانوي (بكالوريا)',
      stream: 'علوم تجريبية',
      room: 'القاعة 01',
      schedule: 'الأحد - 08:00'
    });
  };

  const handleRemoveClass = (classId: string) => {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذا القسم بكل تلاميذه؟')) {
      setClassesList(prev => prev.filter(c => c.id !== classId));
    }
  };

  const handleUpdateClassInfo = (classId: string, field: string, value: any) => {
    setClassesList(prev => prev.map(c => c.id === classId ? { ...c, [field]: value } : c));
  };

  const handleSaveAll = async () => {
    setSaveStatus('saving');
    setErrorMessage(null);

    const updatedProfile = {
      ...profileForm,
      isFirstTimeSetupDone: true
    };

    const success = await onSave(updatedProfile, classesList);

    if (success) {
      setSaveStatus('saved');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setSaveStatus('error');
      setErrorMessage('تعذر حفظ التعديلات على السيرفر، تم الاحتفاظ بالبيانات محلياً ويمكنك إعادة المحاولة.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* رأس النافذة */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="sm" showText={false} />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                إعدادات الأستاذ والأقسام — الدفتر اليومي الذكي للأستاذ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                تعديل البيانات الأساسية، المادة، السنة الدراسية، وقوائم التلاميذ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* التبويبات */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 p-1.5 gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4 text-blue-500" />
            <span>الملف الشخصي والمادة</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'classes'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>إدارة الأقسام وقوائم التلاميذ ({classesList.length})</span>
          </button>
        </div>

        {/* المحتوى */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* تبويب 1: الملف الشخصي والمادة */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الاسم واللقب (أ. الأستاذ):
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    المادة المئسسة والتعليمية:
                  </label>
                  <select
                    value={profileForm.subject}
                    onChange={e => setProfileForm(p => ({ ...p, subject: e.target.value }))}
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {SUBJECTS.map((sub, i) => (
                      <option key={i} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم الثانوية / المؤسسة:
                  </label>
                  <input
                    type="text"
                    value={profileForm.highSchool}
                    onChange={e => setProfileForm(p => ({ ...p, highSchool: e.target.value }))}
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الولاية:
                  </label>
                  <input
                    type="text"
                    value={profileForm.wilaya}
                    onChange={e => setProfileForm(p => ({ ...p, wilaya: e.target.value }))}
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* تبويب 2: إدارة الأقسام وقوائم التلاميذ */}
          {activeTab === 'classes' && (
            <div className="space-y-6">
              
              {/* إضافة قسم جديد */}
              <div className="p-4 bg-slate-100/80 dark:bg-slate-800/60 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  <span>إنشاء قسم جديد</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="اسم القسم (مثال: 3 ع ت 1)"
                    value={newClassForm.name}
                    onChange={e => setNewClassForm(p => ({ ...p, name: e.target.value }))}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                  <select
                    value={newClassForm.level}
                    onChange={e => setNewClassForm(p => ({ ...p, level: e.target.value as Level }))}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {LEVELS.map((lvl, i) => (
                      <option key={i} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddClass}
                    disabled={!newClassForm.name.trim()}
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة القسم</span>
                  </button>
                </div>
              </div>

              {/* قائمة الأقسام الحالية */}
              {classesList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">لم تضف أي قائمة تلاميذ بعد</p>
                  <p>استخدم حقل الإنشاء بالفيض الأعلى لإضافة أول قسم لك وبدء استخدام الدفتر.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {classesList.map((cls, idx) => (
                    <div
                      key={cls.id}
                      className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={cls.name}
                            onChange={e => handleUpdateClassInfo(cls.id, 'name', e.target.value)}
                            className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none px-1"
                          />
                          <span className="text-xs text-slate-400">({cls.students.length} تلميذ)</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedClassForImport(cls)}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>استيراد قائمة التلاميذ (OCR)</span>
                          </button>

                          <button
                            onClick={() => handleRemoveClass(cls.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                            title="حذف القسم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-1">القاعة:</span>
                          <input
                            type="text"
                            value={cls.room || ''}
                            onChange={e => handleUpdateClassInfo(cls.id, 'room', e.target.value)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-1">توقيت الحصة:</span>
                          <input
                            type="text"
                            value={cls.schedule || ''}
                            onChange={e => handleUpdateClassInfo(cls.id, 'schedule', e.target.value)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* أزرار الإعدادات والحفظ */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            إلغاء
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saveStatus === 'saving'}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saveStatus === 'saving' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جارٍ الحفظ والمزامنة...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>تم الحفظ بنجاح!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التغييرات في قاعدة البيانات</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* نافذة استيراد قائمة التلاميذ */}
      {selectedClassForImport && (
        <StudentImportModal
          className={selectedClassForImport.name}
          existingStudents={selectedClassForImport.students}
          onSave={(updatedStudents) => {
            handleUpdateClassInfo(selectedClassForImport.id, 'students', updatedStudents);
            setSelectedClassForImport(null);
          }}
          onClose={() => setSelectedClassForImport(null)}
        />
      )}
    </div>
  );
}
