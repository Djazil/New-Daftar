export type Level = '1 ثانوي' | '2 ثانوي' | '3 ثانوي (بكالوريا)';

export type DayOfWeek = 'الأحد' | 'الإثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس';

export interface BehaviorLog {
  id: string;
  date: string;
  type: 'positive' | 'negative' | 'absence' | 'late';
  reason: string;
  delta: number;
  parentAcknowledged?: boolean;
  absenceType?: 'justified' | 'unjustified'; // نوع الغياب: مبرر أو غير مبرر
  justificationDocUrl?: string; // رابط أو صورة وثيقة التبرير الرقمية من الهاتف
  justificationNote?: string; // ملاحظات وتفاصيل التبرير (شهادة طبية، رخصة...)
  justifiedAt?: string; // تاريخ توثيق التبرير
}

export interface SubjectScoreRecord {
  subject: string;
  teacherName: string;
  continuousScore: number;
  tpScore?: number;
  testScore: number;
  examScore: number;
  average: number;
  coefficient: number;
  remark: string;
  logs?: BehaviorLog[];
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  group: 1 | 2;
  seatIndex: number; // seat index on the classroom grid
  attendance: 'present' | 'absent' | 'late';
  absencesCount: number;
  bonusPoints: number; // رصيد الزيادة والإنقاص
  tpScore: number; // الأعمال التطبيقية
  test1: number; // الفرض 1
  test2: number; // الفرض 2
  exam: number; // الاختبار
  remark: string;
  parentCode: string;
  logs: BehaviorLog[];
  // السجل الموحد لجميع المواد عند مختلف الأساتذة بالكود ذاته
  otherSubjects?: SubjectScoreRecord[];
  // التنسيق مع أولياء الأمور
  parentName?: string;
  parentPhone?: string;
  parentNotes?: string; // ملاحظات خاصة موجهة للولي
  parentRecommendations?: string; // توصيات وتوجيهات منزلية ودراسية للأولياء
  strengths?: string; // نقاط القوة والتميز في المادة
  areasForImprovement?: string; // نقاط التحسين والمتابعة
  coordinationStatus?: 'good' | 'followup' | 'urgent' | 'pending'; // حالة التنسيق
  lastCoordinationDate?: string; // تاريخ آخر تواصل مع الولي
  privateTeacherNotes?: string; // ملاحظات الأستاذ السرية والخاصة (لا تظهر لولي الأمر)
}

export interface LessonPlanNote {
  objectives: string;
  stages: string;
  materials: string;
  evaluation: string;
}

export interface CurriculumUnit {
  id: string;
  subject: string;
  level: Level;
  unitNumber: number;
  title: string;
  plannedHours: number;
  completedHours: number;
  status: 'completed' | 'in-progress' | 'pending';
  notes: string;
  competency?: string;
  lessonPlan?: LessonPlanNote;
}

export interface ClassGroup {
  id: string;
  name: string;
  level: Level;
  stream: string;
  room: string;
  schedule: string;
  hasTP: boolean;
  totalDesks?: number; // إمكانية تخصيص وزيادة عدد الطاولات في مخطط الجلوس
  students: Student[];
}

export interface TimetableSession {
  id: string;
  day: DayOfWeek;
  startTime: string; // e.g. '08:00'
  endTime: string;   // e.g. '09:00'
  classId: string;
  className: string;
  room: string;
  groupType: 'قسم كامل' | 'فوج 1' | 'فوج 2';
  type: 'درس نظري' | 'أعمال تطبيقية (TP)' | 'أعمال موجهة (TD)' | 'معالجة بيداغوجية' | 'فرض / اختبار' | 'استدراك';
  notes?: string;
}

export interface TeacherProfile {
  name: string;
  subject: string;
  highSchool: string;
  wilaya: string;
  isFirstTimeSetupDone: boolean;
}

export interface AuthUser {
  uid?: string;
  email: string;
  name: string;
  avatar?: string;
  isAdmin: boolean;
  isActive: boolean;
}

export interface UploadedPDFDoc {
  id: string;
  name: string;
  level: Level;
  subject: string;
  uploadDate: string;
  size: string;
  unitsCount: number;
}

// ==========================================
// نظام اشتراكات الأساتذة والتراخيص
// ==========================================

export type SubscriptionPlanId = 'lifetime' | '1year' | '6months' | '1month' | 'none';
export type SubscriptionStatus = 'none' | 'pending' | 'active' | 'suspended' | 'deleted';

export interface SubscriptionTier {
  id: SubscriptionPlanId;
  name: string;
  durationLabel: string;
  durationMonths: number | null; // null for lifetime
  durationDays: number | null;
  priceDZD: number;
  popular?: boolean;
  features: string[];
}

export interface PaymentProof {
  transactionRef?: string;
  senderName: string;
  phoneNumber?: string;
  ripNumber?: string;
  amount: number;
  paidAt: string;
  receiptNote?: string;
  receiptImageUrl?: string;
  sentViaWhatsApp?: boolean;
}

export interface TeacherSubscription {
  teacherEmail: string;
  teacherName: string;
  phoneNumber?: string;
  planId: SubscriptionPlanId | 'none';
  status: SubscriptionStatus;
  amountDZD: number;
  paymentProof?: PaymentProof;
  requestedAt?: string;
  activatedAt?: string;
  expiresAt: string | null; // ISO string or null for lifetime / none
  activatedByAdminEmail?: string;
  adminNotes?: string;
  isLifetime: boolean;
  suspendedAt?: string;
  suspensionReason?: string;
  canceledAt?: string;
}

export type AdminActionType =
  | 'activate'
  | 'cancel_subscription'
  | 'suspend'
  | 'unsuspend'
  | 'reset_notebook_data'
  | 'permanent_delete'
  | 'restore';

export interface AdminAuditLog {
  id: string;
  actionType: AdminActionType;
  adminEmail: string;
  targetTeacherEmail: string;
  timestamp: string;
  details?: string;
  result: 'success' | 'failure';
}

export type ClassSessionStatus = 'active' | 'completed' | 'cancelled';

export interface BehaviorTransaction {
  id: string;
  sessionId?: string;
  teacherEmail?: string;
  studentId: string;
  studentName?: string;
  delta: number;
  reason: string;
  timestamp: string;
}

export interface ClassSession {
  id: string;
  teacherEmail: string;
  classId: string;
  className: string;
  level: Level;
  subject: string;
  date: string; // YYYY-MM-DD
  dayOfWeek?: DayOfWeek;
  startTime: string; // HH:MM
  endTime?: string;
  status: ClassSessionStatus;
  topic?: string;
  curriculumUnitId?: string;
  attendance: Record<string, 'present' | 'absent' | 'late'>;
  behaviorLogs: BehaviorTransaction[];
  notes?: string;
  teacherNotes?: string;
  startedAt?: string;
  completedAt?: string;
  lastSyncedAt?: string;
}



