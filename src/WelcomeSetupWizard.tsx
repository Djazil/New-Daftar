import React, { useState } from 'react';
import {
  GraduationCap, School, MapPin, Layers, Check,
  ArrowRight, ShieldCheck, Sparkles, Plus, Trash2,
  BookOpen, HelpCircle, AlertCircle
} from 'lucide-react';
import { TeacherProfile, ClassGroup, AuthUser, Level, Student } from './types';
import { SUBJECTS, STREAMS, OFFICIAL_CURRICULA_BY_SUBJECT } from './curriculumData';

interface WelcomeSetupWizardProps {
  user: AuthUser;
  initialProfile: TeacherProfile;
  initialClasses: ClassGroup[];
  onCompleteSetup: (profile: TeacherProfile, classes: ClassGroup[]) => void;
}

export default function WelcomeSetupWizard({
  user,
  initialProfile,
  initialClasses,
  onCompleteSetup
}: WelcomeSetupWizardProps) {
  // الحالة المحلية للنموذج
  const [selectedSubject, setSelectedSubject] = useState(initialProfile.subject || SUBJECTS[0]);
  const [highSchool, setHighSchool] = useState(initialProfile.highSchool || 'ثانوية الشهيد زيغود يوسف');
  const [wilaya, setWilaya] = useState(initialProfile.wilaya || 'الجزائر العاصمة');
  const [teacherName, setTeacherName] = useState(user.name || initialProfile.name || 'الأستاذ(ة)');
  
  // عدد الأقسام وإعداداتها
  const [classesCount, setClassesCount] = useState<number>(() => Math.max(1, Math.min(6, initialClasses.length || 2)));
  
  // أسماء الأقسام ومستوياتها
  const [configuredClasses, setConfiguredClasses] = useState<Array<{
    name: string;
    level: Level;
    stream: string;
    hasTP: boolean;
  }>>(() => {
    if (initialClasses && initialClasses.length > 0) {
      return initialClasses.slice(0, 6).map(c => ({
        name: c.name,
        level: c.level,
        stream: c.stream,
        hasTP: c.hasTP
      }));
    }
    return [
      { name: '3 ع ت 1', level: '3 ثانوي (بكالوريا)', stream: 'علوم تجريبية', hasTP: true },
      { name: '3 ع ت 2', level: '3 ثانوي (بكالوريا)', stream: 'علوم تجريبية', hasTP: true }
    ];
  });

  // تحديث عدد الأقسام وتوسيع أو تقليص القائمة
  const handleClassesCountChange = (count: number) => {
    setClassesCount(count);
    setConfiguredClasses(prev => {
      const current = [...prev];
      if (count > current.length) {
        for (let i = current.length; i < count; i++) {
          const num = i + 1;
          current.push({
            name: `${num === 1 ? '3 ع ت 1' : num === 2 ? '3 ع ت 2' : num === 3 ? '2 ر 1' : `قسم ${num}`}`,
            level: num <= 2 ? '3 ثانوي (بكالوريا)' : '2 ثانوي',
            stream: num <= 2 ? 'علوم تجريبية' : 'رياضيات',
            hasTP: true
          });
        }
      } else if (count < current.length) {
        return current.slice(0, count);
      }
      return current;
    });
  };

  // تعديل بيانات قسم معين
  const updateClassItem = (index: number, key: string, value: any) => {
    setConfiguredClasses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  // إنهاء الإعداد وتوليد الأقسام والتدرج
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedProfile: TeacherProfile = {
      name: teacherName,
      subject: selectedSubject,
      highSchool: highSchool.trim() || 'ثانوية الشهيد زيغود يوسف',
      wilaya: wilaya.trim() || 'الجزائر العاصمة',
      isFirstTimeSetupDone: true
    };

    // توليد الأقسام مع الحفاظ على التلاميذ الموجودين إن وجدوا
    const finalClasses: ClassGroup[] = configuredClasses.map((item, idx) => {
      const existing = initialClasses[idx];
      return {
        id: existing?.id || `class_${Date.now()}_${idx}`,
        name: item.name.trim() || `قسم ${idx + 1}`,
        level: item.level,
        stream: item.stream,
        room: existing?.room || `القاعة 0${idx + 1}`,
        schedule: existing?.schedule || '08:00 - 09:00',
        hasTP: item.hasTP,
        totalDesks: existing?.totalDesks || 24,
        students: existing?.students || []
      };
    });

    onCompleteSetup(updatedProfile, finalClasses);
  };

  const isAdmin = user.isAdmin || user.email.toLowerCase() === 'djazild@gmail.com';

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-10 flex flex-col justify-between">
      
      <div className="max-w-4xl mx-auto w-full space-y-8 my-auto">
        
        {/* شارة الترحيب وهوية الحساب */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-600/30">
                {teacherName[0] || 'د'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    مرحباً بك، {teacherName}!
                  </h1>
                  {isAdmin ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>حساب الأدمن المفعل (djazild@gmail.com)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {user.email}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  إعداد وتهيئة دفتر الأستاذ الذكي للعام الدراسي 2026 / 2027
                </p>
              </div>
            </div>

            <div className="text-left">
              <span className="text-[11px] text-slate-500 block">حالة الحساب</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>نشط ومعتمد</span>
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-4">
            يرجى تحديد مادتك والمؤسسة التعليمية وتخصيص الأقسام المسندة إليك لتهيئة التدرجات السنوية ومصفوفات التنقيط المتطابقة مع الرقمنة الوزارية فوراً.
          </p>
        </div>

        {/* نموذج الإعداد المنظم في بوكسات أنيقة */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* بوكس 1: اختيار المادة التعليمية */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">1. اختيار المادة المدرسة</h3>
              </div>
              <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                المختارة: {selectedSubject}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {SUBJECTS.map(sub => {
                const isSelected = selectedSubject === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`p-3 rounded-2xl text-xs font-bold text-right transition border flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30 ring-2 ring-blue-400/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate">{sub}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* بوكس 2: بيانات الأستاذ والمؤسسة والولاية */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <School className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">2. بيانات الأستاذ والمؤسسة التربوية</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم ولقب الأستاذ(ة):
                </label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  placeholder="الأستاذ بن عيسى"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  <span>اسم المؤسسة (الثانوية / الإكمالية):</span>
                </label>
                <input
                  type="text"
                  required
                  value={highSchool}
                  onChange={e => setHighSchool(e.target.value)}
                  placeholder="ثانوية الشهيد زيغود يوسف"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>الولاية:</span>
                </label>
                <input
                  type="text"
                  required
                  value={wilaya}
                  onChange={e => setWilaya(e.target.value)}
                  placeholder="الجزائر العاصمة"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* بوكس 3: عدد الأقسام المسندة وتخصيص أسمائها */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">3. عدد الأقسام المسندة وأسماؤها</h3>
              </div>
              
              {/* أزرار اختيار عدد الأقسام */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 px-2 font-semibold">العدد:</span>
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleClassesCountChange(num)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      classesCount === num
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* بطاقات تخصيص كل قسم بأناقة دون خروج النصوص */}
            <div className="space-y-3.5">
              <span className="text-xs text-slate-400 block font-semibold">
                قم بتسمية وتحديد مستويات وشعب الأقسام ({configuredClasses.length} أقسام):
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {configuredClasses.map((cls, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
                        القسم #{idx + 1}
                      </span>
                      <label className="text-[11px] text-slate-400 flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cls.hasTP}
                          onChange={e => updateClassItem(idx, 'hasTP', e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                        />
                        <span>أعمال تطبيقية (TP)</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">اسم القسم:</label>
                        <input
                          type="text"
                          required
                          value={cls.name}
                          onChange={e => updateClassItem(idx, 'name', e.target.value)}
                          placeholder="مثال: 3 ع ت 1"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">المستوى:</label>
                          <select
                            value={cls.level}
                            onChange={e => updateClassItem(idx, 'level', e.target.value as Level)}
                            className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="3 ثانوي (بكالوريا)">3 ثانوي (بكالوريا)</option>
                            <option value="2 ثانوي">2 ثانوي</option>
                            <option value="1 ثانوي">1 ثانوي</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">الشعبة:</label>
                          <select
                            value={cls.stream}
                            onChange={e => updateClassItem(idx, 'stream', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            {STREAMS.map(str => (
                              <option key={str} value={str}>{str}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* أزرار الحفظ والدخول إلى المنصة */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>يمكنك تعديل أي من هذه الإعدادات لاحقاً في أي وقت داخل المنصة.</span>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition transform active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>حفظ الإعدادات والدخول إلى المنصة البيداغوجية</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
