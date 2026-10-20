import React, { useState } from 'react';
import {
  User, BookOpen, Users, CheckCircle2, ArrowLeft, ArrowRight,
  School, MapPin, Sparkles, Save, ShieldCheck, Plus, Trash2
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

interface FirstTimeTeacherWizardProps {
  initialName: string;
  onComplete: (profile: TeacherProfile, classes: ClassGroup[]) => Promise<boolean>;
}

export default function FirstTimeTeacherWizard({
  initialName,
  onComplete
}: FirstTimeTeacherWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // الخطوة 1 & 2: ملف الأستاذ والمادة
  const [profile, setProfile] = useState<TeacherProfile>({
    name: initialName || 'أ. الأستاذ',
    subject: SUBJECTS[0],
    highSchool: 'ثانوية الشهيد زيغود يوسف',
    wilaya: 'الجزائر العاصمة',
    isFirstTimeSetupDone: false
  });

  // الخطوة 3: الأقسام
  const [classesList, setClassesList] = useState<ClassGroup[]>([
    {
      id: `class_init_1`,
      name: '3 ع ت 1',
      level: '3 ثانوي (بكالوريا)',
      stream: 'علوم تجريبية',
      room: 'القاعة 01',
      schedule: 'الأحد - 08:00',
      hasTP: true,
      students: []
    }
  ]);

  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState<Level>('3 ثانوي (بكالوريا)');

  // الخطوة 4: اختيار قسم لاستيراد التلاميذ
  const [selectedClassForImport, setSelectedClassForImport] = useState<ClassGroup | null>(null);

  // حالة الحفظ النهائي
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    setClassesList(prev => [
      ...prev,
      {
        id: `class_${Date.now()}`,
        name: newClassName.trim(),
        level: newClassLevel,
        stream: 'عام',
        room: 'القاعة 01',
        schedule: 'الأحد - 08:00',
        hasTP: true,
        students: []
      }
    ]);
    setNewClassName('');
  };

  const handleRemoveClass = (id: string) => {
    setClassesList(prev => prev.filter(c => c.id !== id));
  };

  const handleFinalSubmit = async () => {
    setIsSaving(true);
    setSaveError(null);

    const updatedProfile: TeacherProfile = {
      ...profile,
      isFirstTimeSetupDone: true
    };

    const success = await onComplete(updatedProfile, classesList);
    if (!success) {
      setIsSaving(false);
      setSaveError('تعذر تأكيد الحفظ الخادمي النهائي. يمكنك المحاولة مجدداً.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans dir-rtl">
      {/* خلفية جمالية Apple Glassmorphic */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10">
        
        {/* شعار المنصة وشريط التقدم */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <BrandLogo
              size="sm"
              showText={true}
              subtitle="إعداد حساب الأستاذ لأول مرة"
              theme="dark"
            />
            <span className="text-xs font-bold text-blue-300 bg-blue-500/15 border border-blue-400/30 px-2.5 py-1 rounded-xl shrink-0">
              الخطوة {step} من 5
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* الخطوة 1: البيانات الأساسية للأستاذ */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">البيانات الأساسية للأستاذ</h3>
                <p className="text-xs text-slate-400">أدخل اسمك ومكان عملك لتخصيص الوثائق والدفتر</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الاسم واللقب:</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-3 rounded-2xl bg-white/10 border border-white/20 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الثانوية / المؤسسة:</label>
                <input
                  type="text"
                  value={profile.highSchool}
                  onChange={e => setProfile(p => ({ ...p, highSchool: e.target.value }))}
                  className="w-full p-3 rounded-2xl bg-white/10 border border-white/20 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الولاية:</label>
                <input
                  type="text"
                  value={profile.wilaya}
                  onChange={e => setProfile(p => ({ ...p, wilaya: e.target.value }))}
                  className="w-full p-3 rounded-2xl bg-white/10 border border-white/20 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* الخطوة 2: اختيار المادة والسنة */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">المادة والسنة الدراسية</h3>
                <p className="text-xs text-slate-400">اختر المادة التي تدرسها لتهيئة التدرجات السنوية</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المادة التعليمية:</label>
                <select
                  value={profile.subject}
                  onChange={e => setProfile(p => ({ ...p, subject: e.target.value }))}
                  className="w-full p-3 rounded-2xl bg-slate-900 border border-white/20 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {SUBJECTS.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* الخطوة 3: إنشاء الأقسام */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">إنشاء الأقسام التربوية</h3>
                <p className="text-xs text-slate-400">أضف الأقسام التي تدرسها هذا العام</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="اسم القسم (مثال: 3 ع ت 1)"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="flex-1 p-3 rounded-2xl bg-white/10 border border-white/20 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleAddClass}
                  disabled={!newClassName.trim()}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {classesList.map((c, idx) => (
                  <div key={c.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{idx + 1}. {c.name}</span>
                    <button
                      onClick={() => handleRemoveClass(c.id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* الخطوة 4: إضافة وقوائم التلاميذ */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">إضافة قوائم التلاميذ</h3>
                <p className="text-xs text-slate-400">يمكنك استيراد القوائم بالذكاء الاصطناعي (OCR) أو إدخالها لاحقاً</p>
              </div>
            </div>

            <div className="space-y-3">
              {classesList.map((c) => (
                <div key={c.id} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.students.length} تلميذ محدد</p>
                  </div>
                  <button
                    onClick={() => setSelectedClassForImport(c)}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>إضافة/استيراد</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* الخطوة 5: مراجعة وحفظ الإعدادات */}
        {step === 5 && (
          <div className="space-y-5 animate-fade-in text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shadow-lg">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">جاهز لبدء العمل في دفترك</h3>
              <p className="text-xs text-slate-300 mt-1">
                سيتم حفظ جميع هذه الإعدادات في حسابك بشكل دائم لتكون جاهزة في كل زيارة.
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-right space-y-2">
              <p><span className="text-slate-400">الأستاذ:</span> <strong className="text-white">{profile.name}</strong></p>
              <p><span className="text-slate-400">المادة:</span> <strong className="text-white">{profile.subject}</strong></p>
              <p><span className="text-slate-400">الثانوية:</span> <strong className="text-white">{profile.highSchool} ({profile.wilaya})</strong></p>
              <p><span className="text-slate-400">عدد الأقسام:</span> <strong className="text-white">{classesList.length} قسم</strong></p>
            </div>

            {saveError && (
              <p className="text-xs text-rose-400 font-bold">{saveError}</p>
            )}
          </div>
        )}

        {/* أزرار التنقل */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => (s - 1) as any)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
          ) : <div />}

          {step < 5 ? (
            <button
              onClick={() => setStep(s => (s + 1) as any)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>تأكيد الإعداد والبدء في الدفتر</span>
            </button>
          )}
        </div>

      </div>

      {/* نافذة استيراد قائمة التلاميذ للقسم */}
      {selectedClassForImport && (
        <StudentImportModal
          className={selectedClassForImport.name}
          existingStudents={selectedClassForImport.students}
          onSave={(updated) => {
            setClassesList(prev => prev.map(c => c.id === selectedClassForImport.id ? { ...c, students: updated } : c));
            setSelectedClassForImport(null);
          }}
          onClose={() => setSelectedClassForImport(null)}
        />
      )}
    </div>
  );
}
