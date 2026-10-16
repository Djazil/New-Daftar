import { Student, ClassGroup } from '../types';

interface RateLimitRecord {
  failedAttempts: number;
  lastAttemptAt: number;
  lockedUntil: number | null;
}

const RATE_LIMIT_STORAGE_KEY = 'parent_lookup_rate_limit_v1';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout after 5 consecutive failures
const ATTEMPT_WINDOW_MS = 3 * 60 * 1000; // 3 minutes attempt window

/**
 * خدمة الحماية من التخمين واستخراج بيانات التلاميذ بالجملة (Brute-force & Anti-scraping)
 */
export class ParentPortalSecurity {
  private static getRecord(): RateLimitRecord {
    try {
      const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { failedAttempts: 0, lastAttemptAt: 0, lockedUntil: null };
  }

  private static saveRecord(record: RateLimitRecord) {
    try {
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(record));
    } catch {}
  }

  /**
   * فحص ما إذا كان البحث محظوراً مؤقتاً بسبب المحاولات الخاطئة المتكررة
   */
  public static checkLockout(): { isLocked: boolean; remainingSeconds: number } {
    const record = this.getRecord();
    const now = Date.now();

    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }

    if (record.lockedUntil && now >= record.lockedUntil) {
      // انتهاء مدة الحظر: إعادة تعيين المحاولات
      this.saveRecord({ failedAttempts: 0, lastAttemptAt: now, lockedUntil: null });
      return { isLocked: false, remainingSeconds: 0 };
    }

    return { isLocked: false, remainingSeconds: 0 };
  }

  /**
   * تسجيل محاولة بحث فاشلة
   */
  public static recordFailedAttempt(): { isNowLocked: boolean; remainingSeconds: number } {
    const record = this.getRecord();
    const now = Date.now();

    // إذا مضت فترة طويلة، نعيد التصفير
    let currentAttempts = record.failedAttempts;
    if (now - record.lastAttemptAt > ATTEMPT_WINDOW_MS) {
      currentAttempts = 0;
    }

    currentAttempts += 1;

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = now + LOCKOUT_DURATION_MS;
      this.saveRecord({
        failedAttempts: currentAttempts,
        lastAttemptAt: now,
        lockedUntil
      });
      return { isNowLocked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
    }

    this.saveRecord({
      failedAttempts: currentAttempts,
      lastAttemptAt: now,
      lockedUntil: null
    });
    return { isNowLocked: false, remainingSeconds: 0 };
  }

  /**
   * تسجيل محاولة بحث ناجحة (إعادة تصفير العداد)
   */
  public static recordSuccessfulAttempt() {
    this.saveRecord({ failedAttempts: 0, lastAttemptAt: Date.now(), lockedUntil: null });
  }

  /**
   * تنظيف وتطهير مدخلات الكود لمنع محاولات الحقن
   */
  public static sanitizeCode(rawCode: string): string {
    if (!rawCode) return '';
    return rawCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\-_]/g, '')
      .substring(0, 20);
  }

  /**
   * تقييد البيانات المكشوفة لولي الأمر:
   * تعيد نسخة آمنة وقابلة للقراءة فقط من بيانات التلميذ،
   * مستبعدة أي بيانات داخلية حساسة للأستاذ أو التلاميذ الآخرين.
   */
  public static sanitizeStudentDataForParent(student: Student, classInfo: ClassGroup) {
    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      parentCode: student.parentCode,
      attendance: student.attendance,
      absencesCount: student.absencesCount,
      bonusPoints: student.bonusPoints,
      tpScore: student.tpScore,
      test1: student.test1,
      test2: student.test2,
      exam: student.exam,
      remark: student.remark,
      logs: student.logs || [],
      otherSubjects: student.otherSubjects || [],
      parentRecommendations: student.parentRecommendations,
      parentNotes: student.parentNotes,
      strengths: student.strengths,
      areasForImprovement: student.areasForImprovement,
      lastCoordinationDate: student.lastCoordinationDate,
      classSummary: {
        id: classInfo.id,
        name: classInfo.name,
        level: classInfo.level,
        stream: classInfo.stream,
        hasTP: classInfo.hasTP
      }
    };
  }
}
