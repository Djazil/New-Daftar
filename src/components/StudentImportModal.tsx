import React, { useState } from 'react';
import {
  Upload, FileText, Camera, AlertCircle, CheckCircle2, Trash2, Plus,
  RefreshCw, Sparkles, X, Check, Edit3, Users, HelpCircle
} from 'lucide-react';
import { Student } from '../types';

interface StudentImportModalProps {
  className: string;
  existingStudents: Student[];
  onSave: (updatedStudents: Student[]) => void;
  onClose: () => void;
}

export default function StudentImportModal({
  className,
  existingStudents,
  onSave,
  onClose
}: StudentImportModalProps) {
  const [activeTab, setActiveTab] = useState<'ocr' | 'manual' | 'review'>('ocr');
  
  // حالة المستند المرفوع ونتائج OCR
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);

  React.useEffect(() => {
    let timer: any = null;
    if (isProcessing) {
      setOcrProgress(15);
      timer = setInterval(() => {
        setOcrProgress(prev => {
          if (prev >= 90) return 90;
          return prev + Math.floor(Math.random() * 20) + 10;
        });
      }, 500);
    } else {
      setOcrProgress(100);
      const t = setTimeout(() => setOcrProgress(0), 400);
      return () => clearTimeout(t);
    }
    return () => clearInterval(timer);
  }, [isProcessing]);

  // نص اللصق اليدوي المتعدد
  const [manualText, setManualText] = useState('');

  // مصفوفة التلاميذ للمراجعة والتعديل القابل للحفظ
  const [workingList, setWorkingList] = useState<Array<{
    id?: string;
    firstName: string;
    lastName: string;
    group: 1 | 2;
    birthDate: string;
    parentCode?: string;
  }>>(() => {
    return existingStudents.map(st => ({
      id: st.id,
      firstName: st.firstName,
      lastName: st.lastName,
      group: st.group || 1,
      birthDate: st.birthDate || '2008-05-01',
      parentCode: st.parentCode
    }));
  });

  const [newItem, setNewItem] = useState({ firstName: '', lastName: '', group: 1 as 1 | 2 });

  // معالجة رفع الملف وإرساله إلى API الـ OCR السيرفري
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setOcrError(null);

    try {
      // تحويل الملف إلى Base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        // استدعاء API السيرفر
        const res = await fetch('/api/ocr/extract-students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: selectedFile.type
          })
        });

        const data = await res.json();
        setIsProcessing(false);

        if (res.ok && data.success && Array.isArray(data.students)) {
          const extractedList = data.students.map((st: any) => ({
            firstName: st.firstName || 'تلميذ',
            lastName: st.lastName || '',
            group: 1 as 1 | 2,
            birthDate: '2008-05-01'
          }));

          setWorkingList(prev => [...prev, ...extractedList]);
          setActiveTab('review');
        } else {
          setOcrError(data.message || 'لم نتمكن من التعرف على الأسماء في هذه الصورة. يرجى تجربة صورة أوضح أو اللصق اليدوي.');
        }
      };

      reader.onerror = () => {
        setIsProcessing(false);
        setOcrError('تعذر قراءة الملف من الجهاز.');
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setIsProcessing(false);
      setOcrError('حدث خطأ أثناء معالجة القائمة: ' + (err?.message || 'حاول مجدداً'));
    }
  };

  // معالجة اللصق اليدوي المتعدد (اسم في كل سطر)
  const handleParseManualText = () => {
    if (!manualText.trim()) return;

    const lines = manualText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(line => {
      const parts = line.split(/\s+/);
      if (parts.length === 1) {
        return { firstName: parts[0], lastName: '', group: 1 as 1 | 2, birthDate: '2008-05-01' };
      }
      const lastName = parts.pop() || '';
      const firstName = parts.join(' ');
      return { firstName, lastName, group: 1 as 1 | 2, birthDate: '2008-05-01' };
    });

    setWorkingList(prev => [...prev, ...parsed]);
    setManualText('');
    setActiveTab('review');
  };

  // إضافة تلميذ فردي في القائمة الحالية
  const handleAddSingleStudent = () => {
    if (!newItem.firstName.trim() && !newItem.lastName.trim()) return;
    setWorkingList(prev => [
      ...prev,
      {
        firstName: newItem.firstName.trim() || 'تلميذ',
        lastName: newItem.lastName.trim(),
        group: newItem.group,
        birthDate: '2008-05-01'
      }
    ]);
    setNewItem({ firstName: '', lastName: '', group: 1 });
  };

  // حذف تلميذ من مصفوفة المراجعة
  const handleRemoveStudent = (index: number) => {
    setWorkingList(prev => prev.filter((_, i) => i !== index));
  };

  // تحديث بيانات تلميذ في المراجعة
  const handleUpdateStudentItem = (index: number, field: string, value: any) => {
    setWorkingList(prev => prev.map((st, i) => i === index ? { ...st, [field]: value } : st));
  };

  // حفظ القائمة المعتمدة وإرسالها للدفتر
  const handleFinalSubmit = () => {
    const finalStudents: Student[] = workingList.map((st, idx) => {
      // البحث عن التلميذ القديم للحفاظ على المعرف والدرجات السابقة
      const existing = existingStudents.find(e => e.id === st.id);
      if (existing) {
        return {
          ...existing,
          firstName: st.firstName.trim(),
          lastName: st.lastName.trim(),
          group: st.group
        };
      }

      // تلميذ جديد يتم إنشاؤه بدون ضياع
      const cleanClassPrefix = className.replace(/[^a-zA-Z0-9]/g, '_');
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      return {
        id: st.id || `st_${cleanClassPrefix}_${Date.now()}_${idx}`,
        firstName: st.firstName.trim() || 'تلميذ',
        lastName: st.lastName.trim(),
        birthDate: st.birthDate || '2008-05-01',
        group: st.group || 1,
        seatIndex: idx + 1,
        attendance: 'present',
        absencesCount: 0,
        bonusPoints: 0,
        tpScore: 0,
        test1: 0,
        test2: 0,
        exam: 0,
        remark: '',
        parentCode: st.parentCode || `P-${randomCode}`,
        logs: []
      };
    });

    onSave(finalStudents);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* رأس النافذة */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                إضافة واستيراد قائمة تلاميذ — {className}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اختر طريقة إضافة التلاميذ أو استيراد القوائم بالذكاء الاصطناعي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* أشرطة التبويب الثلاثة */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 p-1.5 gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ocr'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>استيراد بالذكاء الاصطناعي (PDF / صورة)</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>لصق قائمة إلكترونية</span>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 relative cursor-pointer ${
              activeTab === 'review'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-4 h-4 text-indigo-500" />
            <span>مراجعة وتعديل القائمة ({workingList.length})</span>
          </button>
        </div>

        {/* جسم المحتوى */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          
          {/* التبويب 1: استيراد بـ OCR والذكاء الاصطناعي */}
          {activeTab === 'ocr' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
                <Sparkles className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-bold">استخراج القوائم الذكي باستخدام Gemini Vision:</p>
                  <p className="mt-1 text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                    يمكنك التقاط صورة واضحة من الهاتف لقائمة التلاميذ الورقية، أو رفع ملف PDF أو صورة (PNG/JPG). سيقوم النظام بالتعرف على الأسماء وإعداد القائمة تلقائياً.
                  </p>
                </div>
              </div>

              {/* منطقة الرفع */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-3xl p-6 text-center transition bg-slate-50/50 dark:bg-slate-800/30">
                {isProcessing ? (
                  <div className="py-6 space-y-4 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center animate-pulse">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                    <div className="space-y-1 w-full max-w-sm">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                        <span>جارٍ تحليل واستخراج أسماء التلاميذ...</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">{ocrProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-600">
                        <div
                          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">قد يستغرق هذا بضع ثوانٍ حسب وضوح المستند وحجمه</p>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-4">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Upload className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                      اضغط لاختيار صورة أو ملف PDF للقائمة
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                      يدعم PNG, JPG, JPEG, PDF وإمكانية التصوير المباشر بالهاتف
                    </span>
                  </label>
                )}
              </div>

              {ocrError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{ocrError}</span>
                </div>
              )}
            </div>
          )}

          {/* التبويب 2: لصق قائمة إلكترونية */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                ضع اسم تلميذ واحد في كل سطر (مثال: <span className="font-bold text-blue-600 dark:text-blue-400">أحمد بن علي</span>). سيقوم النظام بتقسيم اللقب والاسم تلقائياً.
              </p>

              <textarea
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                rows={8}
                placeholder={`بن علي أحمد\nبن حمودة مريم\nزيدان ياسين\nبوعلام خديجة`}
                className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <button
                onClick={handleParseManualText}
                disabled={!manualText.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة الأسماء الملصقة إلى قائمة المراجعة</span>
              </button>
            </div>
          )}

          {/* التبويب 3: مراجعة وتعديل الأسماء */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              {/* نموذج إضافة فردي سريع */}
              <div className="p-3 bg-slate-100/70 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap sm:flex-nowrap gap-2 items-center">
                <input
                  type="text"
                  placeholder="اللقب"
                  value={newItem.lastName}
                  onChange={e => setNewItem(prev => ({ ...prev, lastName: e.target.value }))}
                  className="flex-1 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="الاسم"
                  value={newItem.firstName}
                  onChange={e => setNewItem(prev => ({ ...prev, firstName: e.target.value }))}
                  className="flex-1 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
                <select
                  value={newItem.group}
                  onChange={e => setNewItem(prev => ({ ...prev, group: Number(e.target.value) as 1 | 2 }))}
                  className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                >
                  <option value={1}>فوج 1</option>
                  <option value={2}>فوج 2</option>
                </select>
                <button
                  onClick={handleAddSingleStudent}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer"
                >
                  إضافة
                </button>
              </div>

              {/* الجدول التفاعلي للمراجعة */}
              {workingList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  لا توجد أسماء في القائمة بعد. استخدم التبويبات بالأعلى لاستيراد أو لصق الأسماء.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 sticky top-0 font-bold">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">اللقب</th>
                        <th className="p-2.5">الاسم</th>
                        <th className="p-2.5">الفوج</th>
                        <th className="p-2.5 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {workingList.map((st, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={st.lastName}
                              onChange={e => handleUpdateStudentItem(idx, 'lastName', e.target.value)}
                              className="w-full bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none px-1"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={st.firstName}
                              onChange={e => handleUpdateStudentItem(idx, 'firstName', e.target.value)}
                              className="w-full bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none px-1"
                            />
                          </td>
                          <td className="p-2.5">
                            <select
                              value={st.group}
                              onChange={e => handleUpdateStudentItem(idx, 'group', Number(e.target.value))}
                              className="bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs"
                            >
                              <option value={1}>فوج 1</option>
                              <option value={2}>فوج 2</option>
                            </select>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleRemoveStudent(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 rounded-lg transition"
                              title="حذف من القائمة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* أزرار الإجراءات السفلية */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            إلغاء
          </button>

          <button
            onClick={handleFinalSubmit}
            disabled={workingList.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>اعتماد وتأكيد القائمة ({workingList.length} تلميذ)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
