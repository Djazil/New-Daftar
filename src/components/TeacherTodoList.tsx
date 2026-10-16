import React, { useState, useEffect } from 'react';
import {
  CheckSquare, Plus, Trash2, Calendar, Clock, AlertTriangle,
  CheckCircle2, Sparkles, Filter, Tag, BookOpen, Users,
  FileSpreadsheet, Phone, Edit2, RotateCcw, Award, Check
} from 'lucide-react';
import { ClassGroup } from '../types';

export interface TodoItem {
  id: string;
  title: string;
  category: 'prep' | 'grading' | 'digital' | 'parent' | 'general';
  priority: 'urgent' | 'high' | 'normal';
  dueDate?: string;
  targetClassId?: string;
  targetClassName?: string;
  completed: boolean;
  createdAt: string;
}

interface TeacherTodoListProps {
  classes: ClassGroup[];
  darkMode?: boolean;
}

const INITIAL_TODOS: TodoItem[] = [
  {
    id: 'td-1',
    title: 'تصحيح أوراق الفرض المحروس الأول بقسم 3 ع ت 1',
    category: 'grading',
    priority: 'urgent',
    dueDate: '2026-10-18',
    targetClassName: '3 ع ت 1',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'td-2',
    title: 'تحضير تجربة المعايرة اللونية للوحدة الأولى في المخبر',
    category: 'prep',
    priority: 'high',
    dueDate: '2026-10-16',
    targetClassName: '3 ع ت 1',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'td-3',
    title: 'حجز علامات التقويم المستمر والـ TP في مصفوفة الرقمنة',
    category: 'digital',
    priority: 'high',
    dueDate: '2026-10-20',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'td-4',
    title: 'الاتصال بولي التلميذ (ياسين مراد) لمناقشة الغيابات المتكررة',
    category: 'parent',
    priority: 'urgent',
    dueDate: '2026-10-15',
    targetClassName: '3 ع ت 1',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'td-5',
    title: 'طباعة وتجهيز المذكرات البيداغوجية للأسابيع القادمة',
    category: 'prep',
    priority: 'normal',
    completed: true,
    createdAt: new Date().toISOString()
  }
];

export default function TeacherTodoList({ classes, darkMode = false }: TeacherTodoListProps) {
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const saved = localStorage.getItem('smart_notebook_todos_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_TODOS;
  });

  // الفلاتر
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'urgent'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // نموذج إضافة مهمة جديدة
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'prep' | 'grading' | 'digital' | 'parent' | 'general'>('prep');
  const [newPriority, setNewPriority] = useState<'urgent' | 'high' | 'normal'>('high');
  const [newDueDate, setNewDueDate] = useState('');
  const [newClassId, setNewClassId] = useState('');

  // حفظ التغييرات في localStorage
  useEffect(() => {
    try {
      localStorage.setItem('smart_notebook_todos_v1', JSON.stringify(todos));
    } catch (e) {
      console.error(e);
    }
  }, [todos]);

  // إضافة مهمة
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const matchedCls = classes.find(c => c.id === newClassId);
    const item: TodoItem = {
      id: `td-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      dueDate: newDueDate || undefined,
      targetClassId: matchedCls?.id,
      targetClassName: matchedCls?.name,
      completed: false,
      createdAt: new Date().toISOString()
    };

    setTodos(prev => [item, ...prev]);
    setNewTitle('');
    setNewDueDate('');
    setShowAddForm(false);
  };

  // تبديل حالة الإنجاز
  const toggleComplete = (id: string) => {
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // حذف مهمة
  const handleDelete = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  // إضافة مهمة سريعة بنقرة واحدة
  const handleQuickAddPreset = (presetTitle: string, category: 'prep' | 'grading' | 'digital' | 'parent' | 'general', priority: 'urgent' | 'high' | 'normal') => {
    const item: TodoItem = {
      id: `td-${Date.now()}`,
      title: presetTitle,
      category,
      priority,
      completed: false,
      createdAt: new Date().toISOString()
    };
    setTodos(prev => [item, ...prev]);
  };

  // إحصائيات
  const totalCount = todos.length;
  const completedCount = todos.filter(t => t.completed).length;
  const pendingCount = totalCount - completedCount;
  const urgentCount = todos.filter(t => !t.completed && t.priority === 'urgent').length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // التصفية
  const filteredTodos = todos.filter(todo => {
    if (filterStatus === 'pending' && todo.completed) return false;
    if (filterStatus === 'completed' && !todo.completed) return false;
    if (filterStatus === 'urgent' && (todo.completed || todo.priority !== 'urgent')) return false;

    if (filterCategory !== 'all' && todo.category !== filterCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        todo.title.toLowerCase().includes(q) ||
        (todo.targetClassName && todo.targetClassName.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'prep': return 'تحضير الدروس والمخابر';
      case 'grading': return 'التصحيح والتقويم';
      case 'digital': return 'الرقمنة وحجز النقاط';
      case 'parent': return 'التنسيق مع الأولياء';
      default: return 'مهام عامة';
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'prep': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'grading': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'digital': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'parent': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* هيدر قسم قائمة المهام */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-600/30 shrink-0">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-lg sm:text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                قائمة المهام والالتزامات البيداغوجية للأستاذ
              </h2>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                متابعة التحضير، تصحيح الأوراق، حجز النقاط، والتواصل مع أولياء الأمور بنقرة واحدة.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مهمة جديدة</span>
          </button>
        </div>

        {/* شريط الإحصائيات ونسبة الإنجاز */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>إجمالي المهام</span>
            <div className={`text-xl font-black font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalCount}</div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-bold text-amber-500 block">قيد المتابعة</span>
            <div className="text-xl font-black font-mono text-amber-500 mt-0.5">{pendingCount}</div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-bold text-emerald-500 block">المكتملة بنجاح</span>
            <div className="text-xl font-black font-mono text-emerald-500 mt-0.5">{completedCount}</div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-bold text-rose-500 block">مهام عاجلة جداً</span>
            <div className="text-xl font-black font-mono text-rose-500 mt-0.5">{urgentCount}</div>
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-bold">
            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>نسبة إنجاز المهام البيداغوجية:</span>
            <span className="text-blue-500 font-mono">{progressPct}%</span>
          </div>
          <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* اقتراحات سريعة بنقرة واحدة */}
        <div className="pt-2 border-t border-slate-200/20 space-y-2">
          <span className={`text-[11px] font-bold block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            ⚡ إضافة سريعة للمهام الشائعة بنقرة واحدة:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { title: 'تحضير مذكرة الدرس القادم', cat: 'prep', prio: 'high' },
              { title: 'تصحيح أوراق الفرض المحروس', cat: 'grading', prio: 'urgent' },
              { title: 'حجز العلامات في مصفوفة الرقمنة', cat: 'digital', prio: 'high' },
              { title: 'الاتصال بولي تلميذ بحاجة لمتابعة', cat: 'parent', prio: 'urgent' },
              { title: 'إعداد موضوع الاختبار الفصلي', cat: 'grading', prio: 'normal' }
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickAddPreset(preset.title, preset.cat as any, preset.prio as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800/80 hover:bg-blue-900/40 text-slate-300 hover:text-blue-300 border-slate-700'
                    : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-300'
                }`}
              >
                <span>+ {preset.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* نموذج إضافة مهمة جديدة */}
      {showAddForm && (
        <form onSubmit={handleAddTodo} className={`p-5 rounded-3xl border shadow-xl space-y-4 animate-fadeIn ${
          darkMode ? 'bg-slate-900 border-blue-500/40' : 'bg-white border-blue-200'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-200/20 pb-3">
            <h3 className={`font-black text-sm flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Plus className="w-4 h-4 text-blue-500" />
              <span>إضافة التزام أو مهمة جديدة</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              إلغاء ✕
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                عنوان المهمة الالتزام:
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="مثال: إعداد بطاقة المعالجة البيداغوجية للتلاميذ الحاصلين على أقل من 10..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className={`block font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  تصنيف المهمة:
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="prep">📚 تحضير الدروس والمخابر</option>
                  <option value="grading">📝 التصحيح والتقويم</option>
                  <option value="digital">💻 الرقمنة وحجز النقاط</option>
                  <option value="parent">🤝 التنسيق مع الأولياء</option>
                  <option value="general">📌 عامة</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  درجة الأهمية:
                </label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="urgent">🔴 عاجل جداً (أولوية قصوى)</option>
                  <option value="high">🟡 هام (خلال الأسبوع)</option>
                  <option value="normal">🔵 عادي</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  تخصيص للقسم (اختياري):
                </label>
                <select
                  value={newClassId}
                  onChange={e => setNewClassId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">جميع الأقسام</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>تاريخ الأجل:</span>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                حفظ المهمة 💾
              </button>
            </div>
          </div>
        </form>
      )}

      {/* شريط الفلترة والتصفية */}
      <div className={`p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll pb-1">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            الكل ({totalCount})
          </button>

          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            قيد الإنجاز ({pendingCount})
          </button>

          <button
            onClick={() => setFilterStatus('urgent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition ${
              filterStatus === 'urgent'
                ? 'bg-rose-600 text-white shadow-xs'
                : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            عاجلة جداً ({urgentCount})
          </button>

          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition ${
              filterStatus === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            المكتملة ({completedCount})
          </button>
        </div>

        {/* تصنيف الفئة والبحث */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
              darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="all">جميع التصنيفات</option>
            <option value="prep">📚 التحضير والدروس</option>
            <option value="grading">📝 التصحيح والتقويم</option>
            <option value="digital">💻 الرقمنة وحجز النقاط</option>
            <option value="parent">🤝 التنسيق مع الأولياء</option>
            <option value="general">📌 عامة</option>
          </select>
        </div>
      </div>

      {/* قائمة المهام */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className={`p-8 rounded-3xl text-center border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
          }`}>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30 text-emerald-500" />
            <p className="text-xs sm:text-sm font-bold">لا توجد مهام مطابقة لخيارات التصفية والبحث الحالية.</p>
            <p className="text-[11px] opacity-75 mt-1">يمكنك إضافة مهمة جديدة بالضغط على زر «إضافة مهمة جديدة» أعلاه.</p>
          </div>
        ) : (
          filteredTodos.map(todo => {
            return (
              <div
                key={todo.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
                  todo.completed
                    ? darkMode ? 'bg-slate-900/50 border-slate-800/80 opacity-60' : 'bg-slate-50 border-slate-200/80 opacity-70'
                    : todo.priority === 'urgent'
                    ? darkMode ? 'bg-rose-950/20 border-rose-500/40' : 'bg-rose-50/70 border-rose-200'
                    : darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleComplete(todo.id)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer ${
                      todo.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : darkMode ? 'border-slate-600 hover:border-emerald-500 bg-slate-950' : 'border-slate-300 hover:border-emerald-500 bg-white'
                    }`}
                  >
                    {todo.completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs sm:text-sm font-black leading-snug ${
                        todo.completed
                          ? 'line-through text-slate-400'
                          : darkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {todo.title}
                      </span>

                      {/* شارة الأولوية */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        todo.priority === 'urgent'
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                          : todo.priority === 'high'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      }`}>
                        {todo.priority === 'urgent' ? '🔴 عاجل جداً' : todo.priority === 'high' ? '🟡 هام' : '🔵 عادي'}
                      </span>

                      {/* شارة التصنيف */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadge(todo.category)}`}>
                        {getCategoryLabel(todo.category)}
                      </span>

                      {todo.targetClassName && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600/10 text-blue-600 border border-blue-500/20">
                          {todo.targetClassName}
                        </span>
                      )}
                    </div>

                    {todo.dueDate && (
                      <div className={`text-[11px] font-mono flex items-center gap-1 ${
                        new Date(todo.dueDate) < new Date() && !todo.completed
                          ? 'text-rose-500 font-bold'
                          : darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>الأجل: {todo.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/20 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => toggleComplete(todo.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      todo.completed
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <span>{todo.completed ? 'إلغاء الإكتمال' : 'تم الإنجاز ✓'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="حذف المهمة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
