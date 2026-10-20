import React, { useState } from 'react';
import {
  Search, AlertTriangle, ShieldCheck, User, Calendar,
  Award, Clock, CheckCircle2, ChevronDown, ChevronUp,
  FileText, Sparkles, BookOpen, ThumbsUp, ThumbsDown, MessageSquare
} from 'lucide-react';
import BrandLogo from './BrandLogo';

interface ParentPortalStudentData {
  id: string;
  firstName: string;
  lastName: string;
  parentCode: string;
  subjectName: string;
  className: string;
  level: string;
  stream: string;
  attendance: {
    current: 'present' | 'absent' | 'late';
    absencesCount: number;
    lateCount: number;
  };
  marks: {
    tpScore?: number;
    test1?: number;
    test2?: number;
    exam?: number;
    bonusPoints?: number;
    remark?: string;
  };
  behaviorLedger: {
    balance: number;
    transactions: Array<{
      id: string;
      date: string;
      type: string;
      reason: string;
      delta: number;
    }>;
  };
  parentNotes?: string;
  parentRecommendations?: string;
  strengths?: string;
  areasForImprovement?: string;
}

export default function ParentPortalView() {
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [studentData, setStudentData] = useState<ParentPortalStudentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  // أقسام البطاقات المفتوحة/المغلقة للهاتف
  const [expandedSections, setExpandedSections] = useState<{
    attendance: boolean;
    marks: boolean;
    behavior: boolean;
    notes: boolean;
  }>({
    attendance: true,
    marks: true,
    behavior: true,
    notes: true
  });

  const toggleSection = (section: 'attendance' | 'marks' | 'behavior' | 'notes') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentCodeInput.trim()) {
      setSearchError('يرجى إدخال كود التلميذ الموحد (مثال: BAC-8821)');
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    setLockoutRemaining(null);

    try {
      const res = await fetch('/api/parent/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentCode: parentCodeInput.trim() })
      });

      const json = await res.json();

      if (res.status === 429 || json.isLocked) {
        setSearchError(json.message || 'تم حظر البحث مؤقتاً لحماية الحسابات.');
        setLockoutRemaining(json.remainingSeconds || 60);
        setStudentData(null);
        return;
      }

      if (!res.ok || !json.success) {
        setSearchError(json.message || 'لم يتم العثور على التلميذ بالكود المرفق.');
        setStudentData(null);
        return;
      }

      setStudentData(json.student);
      setSearchError(null);
    } catch (err) {
      console.error('Parent lookup fetch error:', err);
      setSearchError('تعذر الاتصال بالسيرفر. يرجى التأكد من اتصال الإنترنت وإعادة المحاولة.');
      setStudentData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn dir-rtl">
      
      {/* هيدر قسم ولي الأمر */}
      <div className="text-center space-y-2.5">
        <div className="flex justify-center">
          <BrandLogo size="lg" showText={false} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>فضاء المتابعة المباشرة والآمنة لأولياء الأمور</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          الدفتر المباشر للتلميذ
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          أدخل كود التلميذ الموحد المسلم من أستاذ المادة المكونة (مثال: BAC-8821) للاطلاع الفوري المباشر على الحضور، العلامات، ونقاط السلوك.
        </p>
      </div>

      {/* نموذج البحث المباشر */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={parentCodeInput}
            onChange={e => {
              setParentCodeInput(e.target.value);
              if (searchError) setSearchError(null);
            }}
            placeholder="أدخل الرمز الموحد للتلميذ (مثال: BAC-8821)"
            className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-mono uppercase focus:outline-none focus:border-emerald-500 shadow-inner tracking-wider"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 min-h-[48px]"
          >
            <Search className="w-4 h-4" />
            <span>{isLoading ? 'جاري البحث...' : 'بحث'}</span>
          </button>
        </div>

        {searchError && (
          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{searchError}</span>
            </div>
            {lockoutRemaining && (
              <span className="px-2.5 py-1 rounded-xl bg-rose-900 text-rose-100 font-mono font-bold text-xs shrink-0">
                {lockoutRemaining}ث
              </span>
            )}
          </div>
        )}
      </form>

      {/* بطاقة عرض النتائج الشاملة للتلميذ */}
      {studentData && (
        <div className="space-y-4 animate-slideUp">
          
          {/* 1. بطاقة الهوية الدراسية المباشرة */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">
                  مادة: {studentData.subjectName}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {studentData.lastName} {studentData.firstName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  القسم: <strong className="text-slate-200">{studentData.className}</strong> ({studentData.level} - {studentData.stream})
                </p>
              </div>

              <div className="text-left shrink-0">
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono text-xs font-black border border-emerald-500/30 block text-center">
                  {studentData.parentCode}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">كود التلميذ الموحد</span>
              </div>
            </div>
          </div>

          {/* 2. قسم الحضور والغياب (Collapsible Accordion) */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition">
            <button
              type="button"
              onClick={() => toggleSection('attendance')}
              className="w-full p-4 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-right border-b border-slate-800/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">1. الحضور والغياب بالمادة</h4>
                  <span className="text-[10px] text-slate-400 block">سجل مواظبة التلميذ حصة بحصة</span>
                </div>
              </div>
              {expandedSections.attendance ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.attendance && (
              <div className="p-4 space-y-3 bg-slate-950/60 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الحالة الأخيرة</span>
                    <span className={`font-bold text-xs ${
                      studentData.attendance.current === 'present' ? 'text-emerald-400' :
                      studentData.attendance.current === 'late' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {studentData.attendance.current === 'present' ? 'حاضر ✓' :
                       studentData.attendance.current === 'late' ? 'متأخر ⏱' : 'غائب ✗'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">إجمالي الغيابات</span>
                    <span className={`font-bold text-xs ${studentData.attendance.absencesCount >= 3 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {studentData.attendance.absencesCount} غيابات
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">التأخرات المسجلة</span>
                    <span className="font-bold text-slate-200 text-xs">
                      {studentData.attendance.lateCount} مرات
                    </span>
                  </div>
                </div>

                {studentData.attendance.absencesCount >= 3 && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-200 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>تنبيه: تجاوز التلميذ 3 غيابات مسجلة. يرجى التنسيق مع الأستاذ والإدارة لاستدراك الدروس.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. قسم العلامات والتقويم المستمر (Collapsible Accordion) */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition">
            <button
              type="button"
              onClick={() => toggleSection('marks')}
              className="w-full p-4 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-right border-b border-slate-800/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">2. العلامات والتقويم المستمر</h4>
                  <span className="text-[10px] text-slate-400 block">نتائج الفروض والاختبارات بمادة الأستاذ</span>
                </div>
              </div>
              {expandedSections.marks ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.marks && (
              <div className="p-4 space-y-3 bg-slate-950/60 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">التقويم المستمر</span>
                    <span className="font-bold text-slate-200 text-sm">
                      {Math.max(0, Math.min(20, 10 + (studentData.marks.bonusPoints || 0)))} / 20
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الفرض 1</span>
                    <span className="font-bold text-slate-200 text-sm">
                      {studentData.marks.test1 !== undefined ? `${studentData.marks.test1} / 20` : 'غير مسجل'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الفرض 2</span>
                    <span className="font-bold text-slate-200 text-sm">
                      {studentData.marks.test2 !== undefined && studentData.marks.test2 > 0 ? `${studentData.marks.test2} / 20` : 'غير مسجل'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الاختبار الفصلي</span>
                    <span className="font-bold text-slate-200 text-sm">
                      {studentData.marks.exam !== undefined ? `${studentData.marks.exam} / 20` : 'غير مسجل'}
                    </span>
                  </div>
                </div>

                {studentData.marks.remark && (
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-300">
                    <strong className="text-[11px] text-amber-400 block mb-1">ملاحظة التقييم البيداغوجي:</strong>
                    <p>{studentData.marks.remark}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. قسم دفتر نقاط السلوك والتطبيقات (قسم مستقل تماماً عن العلامات الدراسية) */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition">
            <button
              type="button"
              onClick={() => toggleSection('behavior')}
              className="w-full p-4 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-right border-b border-slate-800/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">3. دفتر نقاط السلوك والتطبيقات (قسم مستقل)</h4>
                  <span className="text-[10px] text-slate-400 block">رصيد الزيادة والخصم وسجل المعاملات اليومية</span>
                </div>
              </div>
              {expandedSections.behavior ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.behavior && (
              <div className="p-4 space-y-3 bg-slate-950/60 text-xs">
                
                {/* رصيد السلوك الحالي */}
                <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-bold">الرصيد التراكمي الحقيقي للنقاط:</span>
                  <span className={`px-3 py-1 rounded-xl font-black text-sm font-mono ${
                    studentData.behaviorLedger.balance >= 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {studentData.behaviorLedger.balance >= 0 ? `+${studentData.behaviorLedger.balance}` : studentData.behaviorLedger.balance} نقطة
                  </span>
                </div>

                {/* سجل المعاملات والزيادات والنقصان */}
                {studentData.behaviorLedger.transactions.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 block">سجل المعاملات بالتاريخ والسبب:</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {studentData.behaviorLedger.transactions.map((tx, i) => (
                        <div key={tx.id || i} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {tx.delta >= 0 ? (
                              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <ThumbsDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                            <div>
                              <span className="text-slate-200 font-bold block">{tx.reason || 'مشاركة وسلوك بالقسم'}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{tx.date}</span>
                            </div>
                          </div>

                          <span className={`font-mono font-bold text-xs ${tx.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.delta >= 0 ? `+${tx.delta}` : tx.delta}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center py-2">لا توجد معاملات نقاط مسجلة سابقاً.</p>
                )}

              </div>
            )}
          </div>

          {/* 5. قسم ملاحظات وتوجيهات الأستاذ لولي الأمر (الملاحظات المسموح برؤيتها فقط) */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition">
            <button
              type="button"
              onClick={() => toggleSection('notes')}
              className="w-full p-4 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-right border-b border-slate-800/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">4. توجيهات وملاحظات الأستاذ</h4>
                  <span className="text-[10px] text-slate-400 block">التوصيات البيداغوجية والمنزلية لولي الأمر</span>
                </div>
              </div>
              {expandedSections.notes ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.notes && (
              <div className="p-4 space-y-3 bg-slate-950/60 text-xs">
                {studentData.parentNotes && (
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-200">
                    <strong className="text-[11px] text-purple-400 block mb-1">ملاحظة ولي الأمر الخاصة:</strong>
                    <p>{studentData.parentNotes}</p>
                  </div>
                )}

                {studentData.parentRecommendations && (
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-200">
                    <strong className="text-[11px] text-blue-400 block mb-1">توصيات المتابعة المنزلية:</strong>
                    <p>{studentData.parentRecommendations}</p>
                  </div>
                )}

                {studentData.strengths && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl text-emerald-200">
                    <strong className="text-[11px] text-emerald-400 block mb-1">نقاط القوة والتميز:</strong>
                    <p>{studentData.strengths}</p>
                  </div>
                )}

                {studentData.areasForImprovement && (
                  <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-2xl text-rose-200">
                    <strong className="text-[11px] text-rose-400 block mb-1">مجالات التحسين المطلوبة:</strong>
                    <p>{studentData.areasForImprovement}</p>
                  </div>
                )}

                {!studentData.parentNotes && !studentData.parentRecommendations && !studentData.strengths && !studentData.areasForImprovement && (
                  <p className="text-[11px] text-slate-500 text-center py-2">لا توجد ملاحظات أو توجيهات إضافية مسجلة حالياً.</p>
                )}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
