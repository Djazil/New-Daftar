import { ClassSession, ClassSessionStatus, BehaviorTransaction, Student, DayOfWeek, Level } from '../types';
import { db } from './firebaseSubscriptionService';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const SESSIONS_STORAGE_KEY = 'smart_notebook_class_sessions_v1';

export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  if (!dateStr) return 'الأحد';
  const d = new Date(dateStr);
  const dayNum = d.getDay(); // 0 is Sunday
  switch (dayNum) {
    case 0: return 'الأحد';
    case 1: return 'الإثنين';
    case 2: return 'الثلاثاء';
    case 3: return 'الأربعاء';
    case 4: return 'الخميس';
    case 5: return 'الخميس'; // الجمعة - نربطها بأقرب يوم عمل
    case 6: return 'الأحد';   // السبت - نربطها بالأحد
    default: return 'الأحد';
  }
}

export function loadLocalSessions(): ClassSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalSessions(sessions: ClassSession[]) {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Failed to save sessions to localStorage:', err);
  }
}

/**
 * جلب الحصة النشطة حالياً للأستاذ من السيرفر أو السحابة أو التخزين المحلي
 */
export async function getActiveTeacherSession(teacherEmail: string): Promise<ClassSession | null> {
  const cleanEmail = teacherEmail.trim().toLowerCase();

  // 1. محاولة الجلب من السيرفر المباشر
  try {
    const res = await fetch(`/api/sessions/active/${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.activeSession) {
        return json.activeSession as ClassSession;
      }
    }
  } catch (err) {
    console.warn('Network error checking active session from API:', err);
  }

  // 2. الفحص المحلي في التخزين
  const localList = loadLocalSessions();
  const localActive = localList.find(s => s.teacherEmail.toLowerCase() === cleanEmail && s.status === 'active');
  return localActive || null;
}

/**
 * إنشاء حصة جديدة مع الفحص الصارم للحد من تداخل الحصص النشطة
 */
export async function createClassSession(sessionData: Omit<ClassSession, 'id' | 'status' | 'attendance' | 'behaviorLogs'>): Promise<{
  success: boolean;
  message: string;
  session?: ClassSession;
  activeSessionConflict?: ClassSession;
}> {
  const cleanEmail = sessionData.teacherEmail.trim().toLowerCase();

  // التحقق من صحة أوقات البداية والنهاية
  if (sessionData.endTime && sessionData.startTime >= sessionData.endTime) {
    return {
      success: false,
      message: 'وقت نهاية الحصة يجب أن يكون بعد وقت البداية بشكل صحيح.'
    };
  }

  // 1. فحص الحصص النشطة
  const activeExisting = await getActiveTeacherSession(cleanEmail);
  if (activeExisting) {
    return {
      success: false,
      message: `توجد حصة نشطة بالفعل لم تنتهِ بعد لقسم «${activeExisting.className}». لا يمكنك بدء حصة جديدة حتى تتم إنهاء الحصة الحالية.`,
      activeSessionConflict: activeExisting
    };
  }

  const newSession: ClassSession = {
    ...sessionData,
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: 'active',
    dayOfWeek: getDayOfWeekFromDate(sessionData.date),
    attendance: {},
    behaviorLogs: [],
    startedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString()
  };

  // حفظ محلي فوري
  const localList = loadLocalSessions();
  localList.unshift(newSession);
  saveLocalSessions(localList);

  // مزامنة خادمة وسحابية
  try {
    const res = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession)
    });
    if (res.status === 409) {
      const json = await res.json();
      return {
        success: false,
        message: json.message || 'توجد حصة نشطة بالفعل على السيرفر.',
        activeSessionConflict: json.activeSession
      };
    }
  } catch (err) {
    console.warn('Network sync for create session failed:', err);
  }

  return {
    success: true,
    message: 'تم بدء الحصة المباشرة بنجاح.',
    session: newSession
  };
}

/**
 * الحفظ التلقائي الحي للحصة المباشرة
 */
export async function autoSaveLiveSession(session: ClassSession): Promise<boolean> {
  const updatedSession = { ...session, lastSyncedAt: new Date().toISOString() };
  
  // تحديث محلي فوري
  const localList = loadLocalSessions();
  const index = localList.findIndex(s => s.id === session.id);
  if (index >= 0) {
    localList[index] = updatedSession;
  } else {
    localList.unshift(updatedSession);
  }
  saveLocalSessions(localList);

  try {
    const res = await fetch('/api/sessions/update-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSession)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * إنهاء الحصة بشكل ذري مع اعتماد حالات الحضور الافتراضية "حاضر" وتحديث سجلات التلاميذ
 */
export async function completeClassSessionAtomic(
  session: ClassSession,
  allClassStudents: Student[],
  options?: {
    defaultUnsetAttendanceToPresent?: boolean;
    lessonTopic?: string;
    teacherNotes?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  completedSession?: ClassSession;
  updatedStudents?: Student[];
}> {
  const nowIso = new Date().toISOString();
  const autoPresent = options?.defaultUnsetAttendanceToPresent ?? true;

  // 1. تجهيز خريطة الحضور النهائية مع تحويل غير المحددين إلى "حاضر" تلقائياً
  const finalAttendance: Record<string, 'present' | 'absent' | 'late'> = { ...session.attendance };
  
  allClassStudents.forEach(st => {
    if (!finalAttendance[st.id]) {
      finalAttendance[st.id] = autoPresent ? 'present' : 'absent';
    }
  });

  // 2. تحديث سجلات التلاميذ المباشرة (عدد الغيابات، رصيد النقاط، وسجل المعاملات)
  const updatedStudents = allClassStudents.map(st => {
    const att = finalAttendance[st.id] || 'present';
    const wasAbsent = st.attendance === 'absent';
    const isNowAbsent = att === 'absent';

    let absences = st.absencesCount;
    if (isNowAbsent && !wasAbsent) absences += 1;

    // استخراج معاملات النقاط المسجلة للتلميذ في هذه الحصة
    const sessionLogs = session.behaviorLogs.filter((b: BehaviorTransaction) => b.studentId === st.id);
    let bonusDelta = 0;
    const newLogs = [...(st.logs || [])];

    sessionLogs.forEach((b: BehaviorTransaction) => {

      bonusDelta += b.delta;
      if (!newLogs.some(l => l.id === b.id)) {
        newLogs.unshift({
          id: b.id,
          date: session.date,
          type: b.delta >= 0 ? 'positive' : 'negative',
          reason: b.reason || 'مشاركة وسلوك في الحصة المباشرة',
          delta: b.delta,
          parentAcknowledged: false
        });
      }
    });

    return {
      ...st,
      attendance: att,
      absencesCount: absences,
      bonusPoints: Number((st.bonusPoints + bonusDelta).toFixed(2)),
      logs: newLogs
    };
  });

  const completedSession: ClassSession = {
    ...session,
    status: 'completed',
    attendance: finalAttendance,
    topic: options?.lessonTopic || session.topic,
    teacherNotes: options?.teacherNotes || session.teacherNotes,
    completedAt: nowIso,
    lastSyncedAt: nowIso
  };

  // تحديث التخزين المحلي
  const localList = loadLocalSessions();
  const idx = localList.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    localList[idx] = completedSession;
  } else {
    localList.unshift(completedSession);
  }
  saveLocalSessions(localList);

  // إجراء الحفظ الذري على السيرفر
  try {
    const res = await fetch('/api/sessions/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: completedSession,
        updatedStudents
      })
    });

    if (res.ok) {
      return {
        success: true,
        message: 'تم إنهاء الحصة وحفظ جميع البيانات بنجاح في عملية متناسقة.',
        completedSession,
        updatedStudents
      };
    }
  } catch (err) {
    console.warn('Server complete endpoint failed:', err);
  }

  // في حالة انقطاع الشبكة، أعد النتيجة المحلية الناجحة مع تذكير المزامنة
  return {
    success: true,
    message: 'تم إنهاء الحصة وحفظ البيانات محلياً. ستتم المزامنة التلقائية مع السيرفر عند استعادة الاتصال.',
    completedSession,
    updatedStudents
  };
}
