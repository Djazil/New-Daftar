import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard, Users, User, BookOpen, BarChart3, ShieldCheck,
  Plus, Upload, CheckCircle2, AlertTriangle, TrendingUp,
  UserPlus, FileSpreadsheet, Sparkles, Clock, Calendar,
  ChevronLeft, ChevronRight, Award, AlertCircle, Check, X, Eye, QrCode,
  Sliders, Trash2, Grid, List, RefreshCw, Download, Printer,
  Shuffle, Play, Pause, RotateCcw, Edit2, FileText, CheckCheck,
  Search, Bell, Settings, FileUp, ArrowUpDown, ArrowRight,
  GraduationCap, School, MapPin, ChevronDown, CheckSquare, Save,
  Maximize2, HelpCircle, Layers, ArrowRightLeft, BookMarked,
  Trophy, Scale, TrendingDown, Minus, Filter, LogOut, Box,
  HeartHandshake, Phone, MessageSquare, Share2, Copy, ExternalLink,
  Sun, Moon, Archive, ArchiveRestore, Lock
} from 'lucide-react';

import { Classroom3DLab } from './components/Classroom3DLab';

import {
  Level, Student, ClassGroup, CurriculumUnit, TimetableSession,
  TeacherProfile, UploadedPDFDoc, BehaviorLog, SubjectScoreRecord, DayOfWeek,
  AuthUser
} from './types';

import {
  SUBJECTS, STREAMS, TIME_SLOTS, DAYS_OF_WEEK,
  OFFICIAL_CURRICULA_BY_SUBJECT, INITIAL_TIMETABLE_SESSIONS,
  SAMPLE_OFFICIAL_PDFS
} from './curriculumData';

import LandingPage, { ADMIN_USER } from './LandingPage';
import WelcomeSetupWizard from './WelcomeSetupWizard';
import TeacherSubscriptionPage from './components/TeacherSubscriptionPage';
import TeacherAppleLandingPage from './components/TeacherAppleLandingPage';
import AdminSubscriptionManager from './components/AdminSubscriptionManager';
import AnalyticsCharts from './components/AnalyticsCharts';
import StudentDetailsModal from './components/StudentDetailsModal';
import AnalyticsSectionRedesign from './components/AnalyticsSectionRedesign';
import ClassSelectorModal from './components/ClassSelectorModal';
import InClassManagerMobile from './components/InClassManagerMobile';
import StudentGradesModal from './components/StudentGradesModal';
import TimetableSessionModal from './components/TimetableSessionModal';
import TeacherTodoList from './components/TeacherTodoList';
import NetworkErrorNotice from './components/NetworkErrorNotice';
import TeacherSettingsModal from './components/TeacherSettingsModal';
import BrandLogo from './components/BrandLogo';
import FirstTimeTeacherWizard from './components/FirstTimeTeacherWizard';
import {
  ADMIN_EMAIL, checkTeacherFeatureAccess, getTeacherSubscription,
  activateTeacherSubscription, fetchSubscriptionsFromServer,
  registerOrUpdateGoogleUser, submitSubscriptionRequestAsync,
  syncTeacherDataToServer, loadTeacherDataFromServer
} from './services/subscriptionService';
import { fetchOrCreateUserProfileInFirestore, emailToDocKey, auth } from './services/firebaseSubscriptionService';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { matchesStudentQuery, HighlightMatch, normalizeArabic } from './utils/searchUtils';


// ==========================================
// 1. البيانات الأولية مع الدعم متعدد المواد للمطابقة الموحدة بالكود
// ==========================================

const SAMPLE_MULTI_SUBJECTS_BAC = (sName: string): SubjectScoreRecord[] => [
  {
    subject: 'العلوم الفيزيائية', teacherName: 'الأستاذ المكون',
    continuousScore: 16.5, tpScore: 17, testScore: 17.25, examScore: 17.5,
    average: 17.2, coefficient: 6,
    remark: 'تلميذ نجيب ومتميز، إجابات نموذجية.',
    logs: [{ id: 'l-phy-1', date: '2026-10-12', type: 'positive', reason: 'حل تمرين المعادلات التفاضلية على السبورة', delta: 1, parentAcknowledged: true }]
  },
  {
    subject: 'الرياضيات', teacherName: 'الأستاذة عمارة',
    continuousScore: 15.0, testScore: 15.5, examScore: 16.0,
    average: 15.7, coefficient: 7,
    remark: 'عمل جاد ومواظبة ممتازة، تطور ملحوظ في دراسة الدوال.',
    logs: [{ id: 'l-m-1', date: '2026-10-08', type: 'positive', reason: 'مشاركة فعالة في حصة الأعمال الموجهة', delta: 0.5, parentAcknowledged: true }]
  },
  {
    subject: 'علوم الطبيعة والحياة', teacherName: 'الأستاذ بوجمعة',
    continuousScore: 16.0, tpScore: 16.5, testScore: 15.0, examScore: 16.0,
    average: 15.8, coefficient: 6,
    remark: 'تحكم جيد في منهجية الاستدلال العلمي لبكالوريا 2026.',
    logs: [{ id: 'l-b-1', date: '2026-10-11', type: 'positive', reason: 'إتقان الرسم التخطيطي لتركيب البروتين', delta: 1, parentAcknowledged: true }]
  },
  {
    subject: 'اللغة العربية وآدابها', teacherName: 'الأستاذ قادري',
    continuousScore: 14.0, testScore: 14.5, examScore: 14.0,
    average: 14.15, coefficient: 3,
    remark: 'أسلوب لغوي رصين وانضباط مثالي.',
    logs: []
  },
  {
    subject: 'الفلسفة', teacherName: 'الأستاذ معوش',
    continuousScore: 13.5, testScore: 13.0, examScore: 14.0,
    average: 13.6, coefficient: 2,
    remark: 'مستوى مقبول، ينصح بالتوسع في كتابة المقالات الجدلية.',
    logs: []
  },
  {
    subject: 'اللغة الإنجليزية', teacherName: 'الأستاذة حيمود',
    continuousScore: 17.0, testScore: 17.5, examScore: 18.0,
    average: 17.6, coefficient: 2,
    remark: 'Excellent participation and academic writing.',
    logs: [{ id: 'l-en-1', date: '2026-10-09', type: 'positive', reason: 'Oral presentation badge', delta: 0.5, parentAcknowledged: true }]
  },
  {
    subject: 'التاريخ والجغرافيا', teacherName: 'الأستاذ بن طالب',
    continuousScore: 15.0, testScore: 14.5, examScore: 15.5,
    average: 15.1, coefficient: 2,
    remark: 'حفظ واستيعاب للمصطلحات والتواريخ.',
    logs: []
  }
];

const INITIAL_CLASSES: ClassGroup[] = [
  {
    id: 'c1',
    name: '3 ع ت 1',
    level: '3 ثانوي (بكالوريا)',
    stream: 'علوم تجريبية',
    room: 'مخبر الفيزياء 02',
    schedule: '08:00 - 09:00',
    hasTP: true,
    totalDesks: 24, // [تعديل 5: إمكانية تخصيص وزيادة عدد الطاولات]
    students: [
      {
        id: 's1', firstName: 'أمين', lastName: 'بن عيسى', birthDate: '2008-03-14', group: 1, seatIndex: 0,
        attendance: 'present', absencesCount: 0, bonusPoints: 2.5, tpScore: 17, test1: 16.5, test2: 18, exam: 17.5,
        remark: 'تلميذ نجيب ومتميز، مشاركة فعالة في القسم.', parentCode: 'BAC-8821',
        parentName: 'السيد عبد القادر بن عيسى',
        parentPhone: '0550123456',
        parentNotes: 'تلميذ متفوق ذو أخلاق عالية، مشارك فعال في المناقشات وحل التمارين الصعبة على السبورة.',
        parentRecommendations: 'مواصلة حل مواضيع البكالوريا النموذجية السابقة، والمحافظة على وتيرة التدريب الأسبوعية في مادة الفيزياء.',
        strengths: 'سرعة الاستيعاب، دقة الحسابات، ومنهجية ممتازة في كتابة وتفسير الظواهر الفيزيائية.',
        areasForImprovement: 'تنظيم الملاحظات الفرعية وتعميق الحلول المقترحة في التمارين المركبة.',
        coordinationStatus: 'good',
        lastCoordinationDate: '2026-10-12',
        logs: [
          { id: 'l1', date: '2026-10-12', type: 'positive', reason: 'حل تمرين المعادلات التفاضلية على السبورة', delta: 1, parentAcknowledged: true },
          { id: 'l2', date: '2026-10-10', type: 'positive', reason: 'إنجاز متقن للعمل المخبري', delta: 0.5, parentAcknowledged: true }
        ],
        otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC('أمين بن عيسى')
      },
      {
        id: 's2', firstName: 'سارة', lastName: 'بلقاسم', birthDate: '2008-07-22', group: 1, seatIndex: 1,
        attendance: 'present', absencesCount: 1, bonusPoints: 1.5, tpScore: 15, test1: 14, test2: 15.5, exam: 16,
        remark: 'عمل مستمر وتطور ملحوظ في الفروض.', parentCode: 'BAC-4910',
        parentName: 'السيدة فتيحة بلقاسم',
        parentPhone: '0661987654',
        parentNotes: 'تلميذة مجتهدة وهادئة، تحقق تقدماً ملحوظاً في فهم الوحدات التعليمية.',
        parentRecommendations: 'التركيز على مراجعة العلاقات الرياضية الخاصة بالوحدة الثانية وحل التمارين التطبيقية.',
        strengths: 'الجدية والالتزام، كراس منظم، وحضور ذهني دائم أثناء الحصة.',
        areasForImprovement: 'المبادرة بالمشاركة الشفوية أكثر لطرح الاستفسارات وكسر حاجز التردد.',
        coordinationStatus: 'good',
        lastCoordinationDate: '2026-10-11',
        logs: [
          { id: 'l3', date: '2026-10-11', type: 'positive', reason: 'إجابة ذكية أثناء الدرس', delta: 0.5, parentAcknowledged: false }
        ],
        otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC('سارة بلقاسم')
      },
      {
        id: 's3', firstName: 'ياسين', lastName: 'مراد', birthDate: '2008-01-05', group: 2, seatIndex: 2,
        attendance: 'absent', absencesCount: 4, bonusPoints: -2.0, tpScore: 10, test1: 12, test2: 7.5, exam: 8.5,
        remark: 'تراجع مقلق في النتائج بسبب الغيابات وعدم التركيز.', parentCode: 'BAC-3319',
        parentName: 'السيد كمال مراد',
        parentPhone: '0770234567',
        parentNotes: 'تراجع مقلق في المستوى بسبب تكرار الغيابات (4 غيابات) وإهمال الواجبات. نرجو من ولي الأمر التنسيق العاجل مع الأستاذ.',
        parentRecommendations: 'ضرورة المتابعة المنزلية الصارمة للمواظبة، واستدراك الدروس الفائتة، وحضور حصص المعالجة البيداغوجية بالمؤسسة.',
        strengths: 'قدرات استيعاب جيدة حينما يكون منتبهاً وحاضراً بالقسم.',
        areasForImprovement: 'الانضباط التام في الحضور، حل الواجبات المنزلية، وتجنب التشتت.',
        coordinationStatus: 'urgent',
        lastCoordinationDate: '2026-10-13',
        logs: [
          { id: 'l4', date: '2026-10-13', type: 'absence', reason: 'غياب غير مبرر عن حصة الدرس', delta: 0, parentAcknowledged: false },
          { id: 'l5', date: '2026-10-09', type: 'negative', reason: 'عدم إنجاز الواجب المنزلي رقم 2', delta: -1, parentAcknowledged: true }
        ],
        otherSubjects: [
          {
            subject: 'العلوم الفيزيائية', teacherName: 'الأستاذ المكون',
            continuousScore: 12.0, tpScore: 10, testScore: 9.75, examScore: 8.5,
            average: 9.3, coefficient: 6,
            remark: 'نتائج دون المتوسط بسبب تراكم الغيابات.',
            logs: [{ id: 'l-y1', date: '2026-10-13', type: 'absence', reason: 'غياب غير مبرر', delta: 0, parentAcknowledged: false }]
          },
          {
            subject: 'الرياضيات', teacherName: 'الأستاذة عمارة',
            continuousScore: 11.0, testScore: 10.0, examScore: 9.0,
            average: 9.7, coefficient: 7,
            remark: 'تراجع ملحوظ، يحتاج إلى معالجة واستدراك فوري.',
            logs: []
          },
          {
            subject: 'علوم الطبيعة والحياة', teacherName: 'الأستاذ بوجمعة',
            continuousScore: 12.0, testScore: 11.0, examScore: 10.0,
            average: 10.7, coefficient: 6,
            remark: 'مستوى متوسط بحاجة إلى تركيز مضاعف.',
            logs: []
          }
        ]
      },
      {
        id: 's4', firstName: 'مريم', lastName: 'رحماني', birthDate: '2008-11-19', group: 2, seatIndex: 3,
        attendance: 'present', absencesCount: 0, bonusPoints: 0.5, tpScore: 13, test1: 11, test2: 12.5, exam: 13,
        remark: 'نتائج متوسطة، بإمكانها تقديم الأفضل بمزيد من التركيز.', parentCode: 'BAC-7742',
        parentName: 'السيد رابح رحماني',
        parentPhone: '0555345678',
        parentNotes: 'مستوى متوسط ومستقر، تمتلك إمكانات واعدة بحاجة إلى تحفيز ومرافقة في التمارين الصعبة.',
        parentRecommendations: 'مراجعة وتلخيص القوانين في بطاقات استذكار سريعة وحل موضوعين نهاية كل أسبوع.',
        strengths: 'المواظبة على إحضار الكراس والأدوات، احترام الزملاء والمدرسين.',
        areasForImprovement: 'التحكم في وقت الاختبار وتفادي الارتباك أثناء حل المسائل.',
        coordinationStatus: 'followup',
        lastCoordinationDate: '2026-10-09',
        logs: [],
        otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC('مريم رحماني')
      },
      {
        id: 's5', firstName: 'كريم', lastName: 'زروقي', birthDate: '2007-12-30', group: 1, seatIndex: 4,
        attendance: 'late', absencesCount: 2, bonusPoints: -1.0, tpScore: 11, test1: 9, test2: 8.5, exam: 9.5,
        remark: 'يحتاج إلى مضاعفة الجهد والانضباط في المواعيد.', parentCode: 'BAC-1094',
        parentName: 'السيد لخضر زروقي',
        parentPhone: '0662456789',
        parentNotes: 'تلميذ يحتاج إلى انضباط في مواعيد الحصص الصباحية، وتفادي نسيان كراس التطبيقات.',
        parentRecommendations: 'تثبيت جدول نوم منتظم في البيت والحرص على مراقبة محفظة التلميذ قبل الذهاب للثانوية.',
        strengths: 'التفاعل الإيجابي مع الأستاذ عند تنبيهه والتزامه بالهدوء.',
        areasForImprovement: 'الوصول في الوقت المحدد، إحضار الأدوات كاملة، وحل التمارين التقييمية.',
        coordinationStatus: 'followup',
        lastCoordinationDate: '2026-10-11',
        logs: [
          { id: 'l6', date: '2026-10-11', type: 'negative', reason: 'نسيان كراس الدرس والأدوات', delta: -0.5, parentAcknowledged: false }
        ],
        otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC('كريم زروقي')
      },
      {
        id: 's6', firstName: 'لينا', lastName: 'بوزيد', birthDate: '2008-05-18', group: 2, seatIndex: 5,
        attendance: 'present', absencesCount: 0, bonusPoints: 3.0, tpScore: 18.5, test1: 18, test2: 19, exam: 18.5,
        remark: 'نتائج ممتازة وانضباط مثالي، واصلي تألقك.', parentCode: 'BAC-9981',
        parentName: 'الدكتور طارق بوزيد',
        parentPhone: '0771567890',
        parentNotes: 'تلميذة متألقة ورائدة في القسم، نموذج يحتذى به في الانضباط والإتقان.',
        parentRecommendations: 'الحفاظ على هذا المستوى العالي والتدرب على التمارين الأولمبية والمسائل المفتوحة.',
        strengths: 'ذكاء حاد، دقة في المنهجية، وشغف كبير بمادة التخصص.',
        areasForImprovement: 'المحافظة على التوازن النفسي وتجنب الإجهاد الزائد قبل الامتحانات.',
        coordinationStatus: 'good',
        lastCoordinationDate: '2026-10-12',
        logs: [
          { id: 'l7', date: '2026-10-12', type: 'positive', reason: 'بطلة الحصة - إجابات نموذجية كاملة', delta: 1, parentAcknowledged: true }
        ],
        otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC('لينا بوزيد')
      }
    ]
  },
  {
    id: 'c2',
    name: '2 ع ت 2',
    level: '2 ثانوي',
    stream: 'علوم تجريبية',
    room: 'القاعة 14',
    schedule: '10:00 - 11:00',
    hasTP: true,
    totalDesks: 24,
    students: [
      {
        id: 's201', firstName: 'عمر', lastName: 'حداد', birthDate: '2009-04-12', group: 1, seatIndex: 0,
        attendance: 'present', absencesCount: 0, bonusPoints: 1.0, tpScore: 14, test1: 13.5, test2: 14, exam: 15,
        remark: 'تلميذ مجتهد ومواظب.', parentCode: 'SEC-2210', logs: [],
        otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC('عمر حداد')
      },
      {
        id: 's202', firstName: 'إيمان', lastName: 'سعدي', birthDate: '2009-08-03', group: 1, seatIndex: 1,
        attendance: 'present', absencesCount: 3, bonusPoints: -1.5, tpScore: 9, test1: 8, test2: 7, exam: 8.5,
        remark: 'نتائج ضعيفة، يجب تدارك النقائص في حصص المعالجة.', parentCode: 'SEC-5531', logs: [],
        otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC('إيمان سعدي')
      }
    ]
  },
  {
    id: 'c3',
    name: '1 ج م ع 1',
    level: '1 ثانوي',
    stream: 'جذع مشترك علوم وتكنولوجيا',
    room: 'القاعة 05',
    schedule: '13:00 - 14:00',
    hasTP: true,
    totalDesks: 24,
    students: [
      {
        id: 's101', firstName: 'ريان', lastName: 'منصوري', birthDate: '2010-02-17', group: 1, seatIndex: 0,
        attendance: 'present', absencesCount: 0, bonusPoints: 2.0, tpScore: 16, test1: 15, test2: 16, exam: 15.5,
        remark: 'انطلاقة موفقة جداً في الطور الثانوي.', parentCode: 'FIR-1120', logs: [],
        otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC('ريان منصوري')
      }
    ]
  }
];

export const calcContinuousScore = (bonus: number): number => {
  return Math.min(20, Math.max(0, Number((14 + bonus).toFixed(2))));
};

export const calcStudentAverage = (s: Student, hasTP: boolean): number => {
  const cc = calcContinuousScore(s.bonusPoints);
  const f1 = s.test1 || 0;
  const f2 = s.test2 || 0;
  const avgTests = (f1 + f2) / 2;
  const evalAvg = hasTP ? (cc + (s.tpScore || 0) + avgTests) / 3 : (cc + avgTests) / 2;
  const finalAvg = (evalAvg + (s.exam || 0) * 2) / 3;
  return Number(finalAvg.toFixed(2));
};

// حساب المعدل العام التراكمي للتلميذ عبر جميع المواد بالمعاملات الوزارية
export const calcStudentGeneralAverage = (s: Student, currentSubName: string, hasTP: boolean): { generalAvg: number; totalCoef: number } => {
  const currentSubAvg = calcStudentAverage(s, hasTP);
  let totalPoints = currentSubAvg * 6; // معامل المادة الحالية
  let totalCoef = 6;

  if (s.otherSubjects && s.otherSubjects.length > 0) {
    s.otherSubjects.forEach(sub => {
      if (sub.subject !== currentSubName) {
        totalPoints += sub.average * sub.coefficient;
        totalCoef += sub.coefficient;
      }
    });
  }

  const generalAvg = Number((totalPoints / totalCoef).toFixed(2));
  return { generalAvg, totalCoef };
};

export const generateSmartRemark = (s: Student, hasTP: boolean): string => {
  const avg = calcStudentAverage(s, hasTP);
  const trend = s.test2 - s.test1;

  if (avg >= 16) return 'نتائج ممتازة وعمل متقن، واصل تألقك نحو التميز.';
  if (avg >= 14) {
    return trend >= 0
      ? 'عمل جيد جداً وتطور مستمر، واصل على هذا المنوال.'
      : 'مستوى جيد، يرجى الحفاظ على التركيز لتجنب أي تراجع.';
  }
  if (avg >= 12) {
    return s.bonusPoints > 0
      ? 'نتائج حسنة ومشاركة طيبة، بإمكانك تحقيق الأفضل.'
      : 'نتائج مقبولة، نرجو زيادة التفاعل والمشاركة داخل القسم.';
  }
  if (avg >= 10) {
    return s.absencesCount > 2
      ? 'نتائج متوسطة، يرجى المواظبة على الحضور لتدارك النقائص.'
      : 'معدل متوسط، يحتاج التلميذ إلى مضاعفة الجهد والمراجعة المنتظمة.';
  }
  if (avg >= 8) {
    return 'نتائج دون المتوسط، يجب التركيز أكثر والالتزام بحل الواجبات.';
  }
  return 'نتائج ضعيفة ومقلقة، يحتاج التلميذ إلى متابعة مستمرة ومعالجة بيداغوجية عاجلة.';
};

// ==========================================
// 2. المكون الأساسي
// ==========================================

// مفاتيح حفظ جلسة الحساب طوال فترة فتح المتصفح الحالية فقط (Session Persistence)
const BROWSER_SESSION_AUTH_KEY = 'teacher_auth_session_v1';
const LEGACY_LOCAL_AUTH_KEY = 'teacher_auth_user_v1';

function getSavedSessionUser(): AuthUser | null {
  try {
    const rawSession = sessionStorage.getItem(BROWSER_SESSION_AUTH_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed && typeof parsed.email === 'string' && parsed.email.trim()) {
        return parsed as AuthUser;
      }
    }
    // ترقية سلسة إذا كان المستخدم مسجلاً للتو في نفس الجلسة قبل التحديث
    const rawLocal = localStorage.getItem(LEGACY_LOCAL_AUTH_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && typeof parsed.email === 'string' && parsed.email.trim()) {
        sessionStorage.setItem(BROWSER_SESSION_AUTH_KEY, JSON.stringify(parsed));
        localStorage.removeItem(LEGACY_LOCAL_AUTH_KEY);
        return parsed as AuthUser;
      }
    }
  } catch {}
  return null;
}

function saveBrowserSessionUser(user: AuthUser | null): void {
  try {
    if (user && user.email) {
      sessionStorage.setItem(BROWSER_SESSION_AUTH_KEY, JSON.stringify(user));
      localStorage.removeItem(LEGACY_LOCAL_AUTH_KEY);
    } else {
      sessionStorage.removeItem(BROWSER_SESSION_AUTH_KEY);
      localStorage.removeItem(LEGACY_LOCAL_AUTH_KEY);
    }
  } catch {}
}

function formatFriendlyOcrError(rawMsg?: string): string {
  if (!rawMsg) {
    return 'خادم القراءة الذكية يشهد ضغطاً مؤقتاً حالياً، يرجى الضغط على "إعادة المحاولة الآن" بعد لحظات.';
  }
  if (rawMsg.includes('{') || rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand') || rawMsg.includes('429')) {
    return 'خادم القراءة الذكية يشهد ضغطاً مؤقتاً حالياً. يرجى الضغط على "إعادة المحاولة الآن" بعد ثوانٍ قليلة.';
  }
  return rawMsg;
}

export default function App() {
  // حالة تسجيل الدخول المستمرة طوال جلسة المتصفح الحالية دون الخروج عند إعادة التحميل
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getSavedSessionUser());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(() => !getSavedSessionUser());

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseAuthUser) => {
      // في حال وجود مستخدم حقيقي غير مجهول الهوية عبر Firebase Auth
      if (firebaseAuthUser && !firebaseAuthUser.isAnonymous && firebaseAuthUser.email) {
        const email = firebaseAuthUser.email;
        const name = firebaseAuthUser.displayName || email.split('@')[0] || 'أستاذ';
        const avatar = firebaseAuthUser.photoURL || undefined;
        const uid = firebaseAuthUser.uid;
        const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        const authUser: AuthUser = {
          uid,
          email,
          name,
          avatar,
          isAdmin,
          isActive: false
        };

        const [, userProf] = await Promise.all([
          registerOrUpdateGoogleUser(authUser).catch(() => null),
          fetchOrCreateUserProfileInFirestore(authUser).catch(() => null)
        ]);
        const access = checkTeacherFeatureAccess(email);
        const status = access.status === 'active' || userProf?.status === 'active' ? 'active' : (userProf?.status || access.status);
        const isActive = status === 'active' || isAdmin;

        const verifiedUser: AuthUser = {
          ...authUser,
          uid,
          isActive,
          isAdmin: userProf?.role === 'admin' || isAdmin
        };

        if (isMounted) {
          saveBrowserSessionUser(verifiedUser);
          setCurrentUser(verifiedUser);
          setIsAuthLoading(false);
        }
        return;
      }

      // في حال كانت مصادقة Firebase مجهولة الهوية (Anonymous) أو فارغة عند إعادة تحميل الصفحة:
      // نتحقق من الجلسة النشطة المحفوظة في sessionStorage طوال فترة فتح المتصفح الحالية
      const savedSessionUser = getSavedSessionUser();
      if (savedSessionUser && savedSessionUser.email) {
        const isAdmin = savedSessionUser.isAdmin || savedSessionUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const uid = savedSessionUser.uid || emailToDocKey(savedSessionUser.email);

        try {
          await registerOrUpdateGoogleUser(savedSessionUser);
          const userProf = await fetchOrCreateUserProfileInFirestore({
            ...savedSessionUser,
            uid
          });
          const access = checkTeacherFeatureAccess(savedSessionUser.email);
          const isActive = access.status === 'active' || userProf?.status === 'active' || isAdmin;

          const restoredUser: AuthUser = {
            ...savedSessionUser,
            uid,
            isActive,
            isAdmin: userProf?.role === 'admin' || isAdmin
          };

          if (isMounted) {
            saveBrowserSessionUser(restoredUser);
            setCurrentUser(restoredUser);
            setIsAuthLoading(false);
          }
        } catch {
          // في حال انقطاع مؤقت، حافظ على الجلسة المحفوظة ولا تخرج من الحساب
          if (isMounted) {
            setCurrentUser(savedSessionUser);
            setIsAuthLoading(false);
          }
        }
      } else {
        if (isMounted) {
          setCurrentUser(null);
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const [isWelcomeWizardOpen, setIsWelcomeWizardOpen] = useState(false);
  const [isParentPreviewOpen, setIsParentPreviewOpen] = useState(false);
  const [isAdminManagerOpen, setIsAdminManagerOpen] = useState(false);
  const [subscriptionRefreshTick, setSubscriptionRefreshTick] = useState(0);

  // الاستماع لأي تحديث في حالة الاشتراكات (عبر السحابة أو كود التفعيل الاحتياطي) لفتح الدفتر فوراً
  useEffect(() => {
    const handleSubUpdate = () => {
      setSubscriptionRefreshTick(t => t + 1);
    };
    window.addEventListener('smart_notebook_subscriptions_updated', handleSubUpdate);
    return () => window.removeEventListener('smart_notebook_subscriptions_updated', handleSubUpdate);
  }, []);

  // حالة النافذة التفاعلية لاختيار السنة والقسم
  const [isClassSelectorOpen, setIsClassSelectorOpen] = useState(false);

  // حالة نافذة حجز نقاط التلميذ المخصصة للهاتف
  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<{ student: Student; classInfo: ClassGroup } | null>(null);

  // نظام الحفظ ثلاثي المراحل ومؤشر المزامنة السحابية (Phase 10)
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');

  // نافذة تحديد نوع الغياب والتبرير الرقمي
  const [absenceJustificationStudent, setAbsenceJustificationStudent] = useState<Student | null>(null);
  const [previewJustificationDoc, setPreviewJustificationDoc] = useState<string | null>(null);

  // حالة تحميل واستعادة بيانات الأستاذ لمنع فتح نموذج التهيئة بالخطأ أثناء تحديث الصفحة
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  // حالة الملف التعريفي للأستاذ
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(() => {
    // محاولة قراءة التخزين المعزول أولاً من الجلسة الحالية
    const u = getSavedSessionUser();
    if (u && u.email) {
      try {
        const key = u.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const namespacedSaved = localStorage.getItem(`teacher_profile_${key}`);
        if (namespacedSaved) {
          const parsed = JSON.parse(namespacedSaved);
          if (parsed && typeof parsed.isFirstTimeSetupDone === 'boolean') {
            return parsed;
          }
        }
      } catch {}
    }

    const saved = localStorage.getItem('teacher_profile_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      name: 'الأستاذ المشرف djazild',
      subject: SUBJECTS[0],
      highSchool: 'ثانوية الشهيد زيغود يوسف',
      wilaya: 'الجزائر العاصمة',
      isFirstTimeSetupDone: false
    };
  });

  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    const saved = localStorage.getItem('teacher_classes_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_CLASSES;
  });

  const [activeClassId, setActiveClassId] = useState<string>(classes[0]?.id || 'c1');

  // التدرج السنوي
  const [curriculum, setCurriculum] = useState<CurriculumUnit[]>(() => {
    const saved = localStorage.getItem('teacher_curriculum_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return OFFICIAL_CURRICULA_BY_SUBJECT['العلوم الفيزيائية'] || [];
  });

  // جدول التوقيت (من 8 صباحاً إلى 5 مساءً)
  const [timetableSessions, setTimetableSessions] = useState<TimetableSession[]>(() => {
    const saved = localStorage.getItem('teacher_timetable_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_TIMETABLE_SESSIONS;
  });

  const [uploadedPDFs, setUploadedPDFs] = useState<UploadedPDFDoc[]>(() => {
    const saved = localStorage.getItem('teacher_pdfs_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return SAMPLE_OFFICIAL_PDFS;
  });

  // التنقل بين الشاشات (يشمل قسم قائمة المهام To-Do جديد)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timetable' | 'inclass' | 'classes' | 'grading' | 'curriculum' | 'analytics' | 'todo'>('dashboard');

  // الوضع الليلي والنهاري
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('smart_notebook_theme') === 'dark';
  });

  // حفظ تفضيل الثيم في localStorage وتطبيق الفئة المعيارية
  useEffect(() => {
    localStorage.setItem('smart_notebook_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // نمط عرض جدول التوقيت: إما العمود اليومي المخصص للهاتف أو الشبكة الكاملة
  const [timetableDisplayMode, setTimetableDisplayMode] = useState<'dayList' | 'fullGrid'>('dayList');

  // [تعديل 2: تقسيم قسم الإحصائيات إلى قوائم منسدلة بعناوين مختصرة]
  const [analyticsSelectedDropdown, setAnalyticsSelectedDropdown] = useState<'all' | 'charts' | 'kpis' | 'absences' | 'comparison' | 'students' | 'diagnostic'>('all');
  const [openAnalyticsAccordions, setOpenAnalyticsAccordions] = useState<Record<string, boolean>>({
    kpis: true,
    absences: true,
    comparison: true,
    students: true,
    diagnostic: true,
  });

  const toggleAnalyticsAccordion = (key: string) => {
    setOpenAnalyticsAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllAnalyticsAccordions = () => {
    setOpenAnalyticsAccordions({
      kpis: true,
      absences: true,
      comparison: true,
      students: true,
      diagnostic: true,
    });
  };

  const collapseAllAnalyticsAccordions = () => {
    setOpenAnalyticsAccordions({
      kpis: false,
      absences: false,
      comparison: false,
      students: false,
      diagnostic: false,
    });
  };

  // مخطط الجلوس وواجهة الحصة للهاتف [تعديل 5 والمرحلة 3]
  const [inClassView, setInClassView] = useState<'touch' | 'seating' | 'list' | '3dLab'>('touch');
  const [isEditingSeating, setIsEditingSeating] = useState(false);
  const [seatingColumns, setSeatingColumns] = useState(4); // 4 أعمدة للطاولات
  const [draggingSeatIdx, setDraggingSeatIdx] = useState<number | null>(null);
  const [dragOverSeatIdx, setDragOverSeatIdx] = useState<number | null>(null);
  const [groupFilter, setGroupFilter] = useState<'all' | 1 | 2>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // أدوات الحصة المباشرة
  const [pickedStudent, setPickedStudent] = useState<Student | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(600);
  const [timerActive, setTimerActive] = useState(false);
  const [customReason, setCustomReason] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // النوافذ المنبثقة
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'profile' | 'subject' | 'classes' | 'grading' | 'preferences'>('profile');
  const [newClassModal, setNewClassModal] = useState(false);
  const [newClassForm, setNewClassForm] = useState({
    name: '', level: '3 ثانوي (بكالوريا)' as Level, stream: 'علوم تجريبية', room: 'القاعة 01', schedule: '08:00 - 09:00', hasTP: true
  });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // [تعديل 7: نافذة تعديل الحصة يدوياً عند الضغط عليها]
  const [sessionEditModalOpen, setSessionEditModalOpen] = useState(false);
  const [editingSessionForm, setEditingSessionForm] = useState<Partial<TimetableSession>>({
    day: 'الأحد', startTime: '08:00', endTime: '09:00', className: '', classId: '', room: '', groupType: 'قسم كامل', type: 'درس نظري', notes: ''
  });
  const [isNewSessionInSlot, setIsNewSessionInSlot] = useState(false);

  // إضافة المذكرات والتدرج يدوياً
  const [showManualUnitModal, setShowManualUnitModal] = useState(false);
  const [manualUnitForm, setManualUnitForm] = useState({
    level: '3 ثانوي (بكالوريا)' as Level, unitNumber: 1, title: '', plannedHours: 14, competency: '', notes: '', objectives: '', stages: '', materials: ''
  });
  const [viewingLessonPlan, setViewingLessonPlan] = useState<CurriculumUnit | null>(null);

  // [تعديل 1: الإحصائيات مع جدول قوائم التلاميذ ومعدلاتهم]
  const [analyticsFilterGroup, setAnalyticsFilterGroup] = useState<'all' | 1 | 2 | 'remedial' | 'absentWarning'>('all');
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');
  const [analyticsSortBy, setAnalyticsSortBy] = useState<'default' | 'avg_desc' | 'avg_asc' | 'absences_desc' | 'name_asc' | 'group'>('default');
  const [selectedStudentForDiagnostic, setSelectedStudentForDiagnostic] = useState<string | null>(null);

  // مقارنة أداء الفوج الأول والفوج الثاني في مادة الأستاذ
  const [groupComparisonCategory, setGroupComparisonCategory] = useState<'all' | 'evaluation' | 'average' | 'discipline'>('all');
  const [showGroupComparisonDetails, setShowGroupComparisonDetails] = useState(true);

  // نظام تنبيهات الغيابات غير المبررة (تجاوز 3 غيابات) وإرسال إشعار تذكيري للولي
  const [absenceReminderModalOpen, setAbsenceReminderModalOpen] = useState(false);
  const [absenceReminderStudent, setAbsenceReminderStudent] = useState<Student | null>(null);
  const [customAbsenceNoticeText, setCustomAbsenceNoticeText] = useState('');

  // [خاصية البحث المباشر عن اسم التلميذ في المنصة وإدارة القوائم والتنسيق مع الأولياء]
  const [globalStudentSearch, setGlobalStudentSearch] = useState('');
  const [isGlobalSearchActive, setIsGlobalSearchActive] = useState(false);
  const [classListSearch, setClassListSearch] = useState('');
  const [gradingSearch, setGradingSearch] = useState('');
  const [classListGroupFilter, setClassListGroupFilter] = useState<'all' | 1 | 2>('all');
  const [classListCoordinationFilter, setClassListCoordinationFilter] = useState<'all' | 'urgent' | 'followup' | 'good'>('all');
  const [classListSubTab, setClassListSubTab] = useState<'list' | 'coordination'>('list');
  // نظام أرشفة الأقسام المنتهية في قسم إدارة القوائم
  const [classesManagementMode, setClassesManagementMode] = useState<'active' | 'archive'>('active');
  const [archiveModalClass, setArchiveModalClass] = useState<ClassGroup | null>(null);
  const [archiveForm, setArchiveForm] = useState<{ academicYear: string; archiveNote: string }>({
    academicYear: '2026/2027',
    archiveNote: ''
  });
  const [archiveYearFilter, setArchiveYearFilter] = useState<string>('all');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');
  const [selectedArchivedClassId, setSelectedArchivedClassId] = useState<string | null>(null);
  const [archivedStudentSearch, setArchivedStudentSearch] = useState<string>('');
  const [archivedStudentGroupFilter, setArchivedStudentGroupFilter] = useState<'all' | 1 | 2>('all');
  const [isBatchDeleteMode, setIsBatchDeleteMode] = useState(false);
  const [selectedStudentIdsForDelete, setSelectedStudentIdsForDelete] = useState<string[]>([]);
  const [studentToDeleteModal, setStudentToDeleteModal] = useState<{ student: Student; classInfo: ClassGroup } | null>(null);
  const [showBatchDeleteConfirmModal, setShowBatchDeleteConfirmModal] = useState(false);
  const [coordinationStudent, setCoordinationStudent] = useState<Student | null>(null);
  const [coordinationTargetClassId, setCoordinationTargetClassId] = useState<string | null>(null);
  const [coordinationForm, setCoordinationForm] = useState({
    parentName: '',
    parentPhone: '',
    parentNotes: '',
    parentRecommendations: '',
    strengths: '',
    areasForImprovement: '',
    coordinationStatus: 'good' as 'good' | 'followup' | 'urgent' | 'pending'
  });
  const [studentActionDropdownId, setStudentActionDropdownId] = useState<string | null>(null);

  // [تحديث جديد: نافذة تفاصيل التلميذ عند الضغط على اسمه في جدول القائمة]
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<{ student: Student; classInfo: ClassGroup } | null>(null);

  // [تحديث جديد: عرض جدول التوقيت العام أو توقيت المادة حسب القسم المحدد واليوم]
  const [timetableActiveView, setTimetableActiveView] = useState<'general' | 'byClass'>('general');
  const [timetableClassFilter, setTimetableClassFilter] = useState<string>('');

  // [تحديث حماية الشبكة تعذر التحقق]: حالة انقطاع اتصال السيرفر وشاشة إعادة المحاولة
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [isRetryingNetwork, setIsRetryingNetwork] = useState(false);
  const [timetableDayFilter, setTimetableDayFilter] = useState<DayOfWeek | 'all'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // المسح الضوئي وإضافة تلميذ
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrErrorMsg, setOcrErrorMsg] = useState<string | null>(null);
  const [lastOcrPayload, setLastOcrPayload] = useState<{ base64: string; mimeType: string } | null>(null);
  const [scannedPreview, setScannedPreview] = useState<Array<{ firstName: string; lastName: string; birthDate: string; group: 1 | 2 }>>([]);
  const [newStudentForm, setNewStudentForm] = useState({ firstName: '', lastName: '', birthDate: '2008-05-01', group: 1 as 1 | 2 });

  // شريط التقدم التدريجي أثناء قيام الـ OCR بمعالجة الصورة
  useEffect(() => {
    let interval: any = null;
    if (isScanning) {
      setOcrProgress(12);
      interval = setInterval(() => {
        setOcrProgress(prev => {
          if (prev >= 92) return 92;
          return Math.min(92, prev + Math.floor(Math.random() * 14) + 8);
        });
      }, 450);
    } else {
      setOcrProgress(100);
      const resetTimer = setTimeout(() => setOcrProgress(0), 500);
      return () => clearTimeout(resetTimer);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  // حفظ محلي دائم مع عزل بيانات الأساتذة وفق قواعد الأمان (سيناريو 7)
  const teacherStorageKey = useMemo(() => {
    return currentUser ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guest';
  }, [currentUser?.email]);

  const loadedTeacherKeyRef = React.useRef<string | null>(null);

  // استرجاع بيانات الأستاذ المعزولة من السيرفر والتخزين الدائم (فقط عند دخول الأستاذ لأول مرة أو انتقال حالته إلى active)
  useEffect(() => {
    if (!currentUser) {
      loadedTeacherKeyRef.current = null;
      setIsDataLoading(false);
      return;
    }
    const access = checkTeacherFeatureAccess(currentUser.email);
    if (access.status !== 'active') {
      loadedTeacherKeyRef.current = null;
      setIsWelcomeWizardOpen(false);
      setIsDataLoading(false);
      return;
    }

    const cleanKey = teacherStorageKey;
    // إذا تم تحميل بيانات هذا الأستاذ بالفعل في الجلسة الحالية، لا نعيد تفعيل شاشة التحميل ولا نهدم النوافذ المفتوحة (مثل لوحة المشرف)
    if (loadedTeacherKeyRef.current === cleanKey) {
      setIsDataLoading(false);
      return;
    }
    loadedTeacherKeyRef.current = cleanKey;
    setIsDataLoading(true);

    // حاول قراءة التخزين المحلي فوراً أولاً لتفادي أي تذبذب بصري أثناء انتظار السيرفر
    const savedLocalProfileStr = localStorage.getItem(`teacher_profile_${cleanKey}`) || localStorage.getItem('teacher_profile_v3');
    if (savedLocalProfileStr) {
      try {
        const p = JSON.parse(savedLocalProfileStr);
        if (p && typeof p.isFirstTimeSetupDone === 'boolean') {
          setTeacherProfile(p);
          if (p.isFirstTimeSetupDone) {
            setIsWelcomeWizardOpen(false);
          }
        }
      } catch {}
    }

    loadTeacherDataFromServer(currentUser.email).then((serverData) => {
      if (serverData && serverData.teacherProfile) {
        setTeacherProfile(serverData.teacherProfile);
        if (serverData.teacherProfile.isFirstTimeSetupDone) {
          setIsWelcomeWizardOpen(false);
        }
        if (Array.isArray(serverData.classes)) {
          setClasses(serverData.classes);
        }
        if (Array.isArray(serverData.curriculum)) {
          setCurriculum(serverData.curriculum);
        }
        if (Array.isArray(serverData.timetableSessions)) {
          setTimetableSessions(serverData.timetableSessions);
        }
      } else {
        // قراءة التخزين المحلي كدعم احتياطي عند غياب بيانات السيرفر
        const savedClasses = localStorage.getItem(`teacher_classes_${cleanKey}`);
        if (savedClasses) {
          try {
            setClasses(JSON.parse(savedClasses));
          } catch {}
        } else if (cleanKey === 'djazild_gmail_com') {
          // حساب المشرف العام يحفظ ويسترجع بياناته النموذجية
          setClasses(INITIAL_CLASSES);
        } else {
          // الأستاذ العادي الجديد يبدأ بدون أي بيانات أو أقسام تجريبية
          setClasses([]);
        }

        const savedProfile = localStorage.getItem(`teacher_profile_${cleanKey}`) || localStorage.getItem('teacher_profile_v3');
        if (savedProfile) {
          try {
            const p = JSON.parse(savedProfile);
            setTeacherProfile(p);
            if (p.isFirstTimeSetupDone) {
              setIsWelcomeWizardOpen(false);
            }
          } catch {}
        } else {
          // إذا كانت الأقسام موجودة بالفعل في التخزين، فهذا يعني أن الأستاذ أكمل الإعداد مسبقاً
          const hasExistingClasses = (savedClasses && JSON.parse(savedClasses).length > 0) || cleanKey === 'djazild_gmail_com';
          setTeacherProfile({
            name: currentUser.name,
            subject: SUBJECTS[0],
            highSchool: 'ثانوية الشهيد زيغود يوسف',
            wilaya: 'الجزائر العاصمة',
            isFirstTimeSetupDone: hasExistingClasses
          });
          if (hasExistingClasses) {
            setIsWelcomeWizardOpen(false);
          }
        }
      }
    }).finally(() => {
      setIsDataLoading(false);
    });
  }, [teacherStorageKey, subscriptionRefreshTick]);

  // مزامنة التعديلات خادمياً ومحلياً بنظام الحفظ التلقائي متعدد المستويات (فقط للحسابات النشطة active)
  useEffect(() => {
    if (!currentUser || isDataLoading) return;
    const access = checkTeacherFeatureAccess(currentUser.email);
    if (access.status !== 'active') {
      return;
    }
    setCloudSyncStatus('saving');

    const payload = {
      teacherProfile,
      classes,
      curriculum,
      timetableSessions,
      uploadedPDFs
    };

    try {
      localStorage.setItem(`teacher_profile_${teacherStorageKey}`, JSON.stringify(teacherProfile));
      localStorage.setItem(`teacher_profile_v3`, JSON.stringify(teacherProfile));
      localStorage.setItem(`teacher_classes_${teacherStorageKey}`, JSON.stringify(classes));
      localStorage.setItem(`teacher_curriculum_${teacherStorageKey}`, JSON.stringify(curriculum));
      localStorage.setItem(`teacher_timetable_${teacherStorageKey}`, JSON.stringify(timetableSessions));
      localStorage.setItem(`teacher_pdfs_${teacherStorageKey}`, JSON.stringify(uploadedPDFs));
    } catch {}

    syncTeacherDataToServer(currentUser.email, payload).then((ok) => {
      if (ok) {
        setCloudSyncStatus('synced');
      } else {
        setCloudSyncStatus('offline');
      }
    });
  }, [teacherProfile, classes, curriculum, timetableSessions, uploadedPDFs, teacherStorageKey]);

  // حماية الأستاذ من الخروج أثناء وجود حفظ سحابي قيد التنفيذ
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cloudSyncStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'هناك بيانات قيد الحفظ السحابي، هل تريد بالتأكيد مغادرة الصفحة؟';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cloudSyncStatus]);

  // مؤقت الحصة
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
      showNotice('🔔 انتهى وقت المؤقت للحصة أو الفرض!');
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  // دالة إعادة محاولة الاتصال والتحقق من حالة الحساب عند انقطاع الشبكة
  const handleRetryNetwork = async () => {
    setIsRetryingNetwork(true);
    try {
      await fetchSubscriptionsFromServer();
      if (currentUser) {
        await registerOrUpdateGoogleUser(currentUser);
      }
      setHasNetworkError(false);
      setSubscriptionRefreshTick(t => t + 1);
      showNotice('تمت استعادة الاتصال بالسيرفر والتحقق من حالة الحساب بنجاح');
    } catch {
      setHasNetworkError(true);
      showNotice('تعذر الاتصال بالسيرفر. يرجى التأكد من اتصال الإنترنت وإعادة المحاولة.');
    } finally {
      setIsRetryingNetwork(false);
    }
  };

  // مزامنة الاشتراكات المركزية من السيرفر عند فتح التطبيق مع معالجة حماية انقطاع الشبكة
  useEffect(() => {
    fetchSubscriptionsFromServer()
      .then(() => {
        setHasNetworkError(false);
        if (currentUser) {
          registerOrUpdateGoogleUser(currentUser)
            .then(() => {
              setSubscriptionRefreshTick(t => t + 1);
            })
            .catch(() => {
              // حظر الوصول مؤقتا عند تعذر قراءة حالة الحساب
              setHasNetworkError(true);
            });
        } else {
          setSubscriptionRefreshTick(t => t + 1);
        }
      })
      .catch(() => {
        setHasNetworkError(true);
      });
  }, []);

  // فتح نافذة إعدادات المادة والأقسام تلقائياً فقط للحساب المكتمل تفعيله ولم يكمل الإعداد
  useEffect(() => {
    if (currentUser && !isDataLoading) {
      const access = checkTeacherFeatureAccess(currentUser.email);
      if (access.status === 'active' && !teacherProfile.isFirstTimeSetupDone) {
        setIsWelcomeWizardOpen(true);
      } else {
        setIsWelcomeWizardOpen(false);
      }
    }
  }, [currentUser, subscriptionRefreshTick, teacherProfile.isFirstTimeSetupDone, isDataLoading]);

  const showNotice = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // معالجات تسجيل الدخول والإعداد الأولي مع حفظ الجلسة طوال فترة فتح المتصفح الحالية فقط
  const handleGoogleSignIn = async (user: AuthUser) => {
    const firebaseUid = user.uid || (!auth.currentUser?.isAnonymous && auth.currentUser?.uid) || emailToDocKey(user.email);
    const userWithUid: AuthUser = {
      ...user,
      uid: firebaseUid
    };

    saveBrowserSessionUser(userWithUid);
    setCurrentUser(userWithUid);
    const isAdmin = userWithUid.isAdmin || userWithUid.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    
    // تسجيل وتحديث الحساب تلقائياً في السيرفر ولوحة التحكم وفي Firestore users/{uid} بالحالة الافتراضية pending للأستاذ الجديد
    await registerOrUpdateGoogleUser(userWithUid);
    const userProfDoc = await fetchOrCreateUserProfileInFirestore(userWithUid);

    if (isAdmin) {
      localStorage.setItem('smart_notebook_is_admin_device', 'true');
      setTeacherProfile(prev => ({
        ...prev,
        name: 'الأستاذ المشرف djazild'
      }));
    } else {
      setTeacherProfile(prev => ({
        ...prev,
        name: userWithUid.name
      }));
    }

    const cleanUserKey = userWithUid.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const savedUserProf = localStorage.getItem(`teacher_profile_${cleanUserKey}`) || localStorage.getItem('teacher_profile_v3');
    let userSetupDone = teacherProfile.isFirstTimeSetupDone;
    if (userProfDoc && typeof userProfDoc.isFirstTimeSetupDone === 'boolean') {
      userSetupDone = userProfDoc.isFirstTimeSetupDone;
    } else if (savedUserProf) {
      try {
        const parsedP = JSON.parse(savedUserProf);
        if (typeof parsedP.isFirstTimeSetupDone === 'boolean') {
          userSetupDone = parsedP.isFirstTimeSetupDone;
        }
      } catch {}
    }

    const access = checkTeacherFeatureAccess(userWithUid.email);
    const updatedUserWithStatus: AuthUser = {
      ...userWithUid,
      isActive: access.hasAccess || isAdmin,
      isAdmin
    };
    saveBrowserSessionUser(updatedUserWithStatus);
    setCurrentUser(updatedUserWithStatus);

    if (access.hasAccess) {
      setIsWelcomeWizardOpen(!userSetupDone);
      showNotice(`مرحباً بك يا ${userWithUid.name}! اشتراكك مفعل وساري المفعول.`);
    } else {
      setIsWelcomeWizardOpen(false);
      showNotice(`مرحباً بك يا ${userWithUid.name}! تم تسجيل حسابك بنجاح بانتظار التفعيل من المدير أو اختيار الخطة.`);
    }
    setSubscriptionRefreshTick(t => t + 1);
  };

  // تبديل الحساب السريع لاختبار سيناريوهات الأمان والاشتراكات
  const handleSwitchUser = (user: AuthUser | null) => {
    setCurrentUser(user);
    saveBrowserSessionUser(user);
    if (user) {
      const isAdmin = user.isAdmin || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      if (isAdmin) {
        localStorage.setItem('smart_notebook_is_admin_device', 'true');
      }
      const access = checkTeacherFeatureAccess(user.email);
      if (!access.hasAccess) {
        setIsWelcomeWizardOpen(false);
      }
    } else {
      setIsWelcomeWizardOpen(false);
      setIsParentPreviewOpen(false);
    }
    setSubscriptionRefreshTick(t => t + 1);
  };

  const handleLogout = async () => {
    saveBrowserSessionUser(null);
    setCurrentUser(null);
    try {
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        await signOut(auth);
      }
    } catch {}
    setIsWelcomeWizardOpen(false);
    setIsParentPreviewOpen(false);
    showNotice('تم تسجيل الخروج بنجاح. عودة إلى بوابة الدخول.');
    setSubscriptionRefreshTick(t => t + 1);
  };

  const handleCompleteSetupWizard = (updatedProfile: TeacherProfile, updatedClasses: ClassGroup[]) => {
    const finalProfile = { ...updatedProfile, isFirstTimeSetupDone: true };
    setTeacherProfile(finalProfile);
    setClasses(updatedClasses);
    if (updatedClasses.length > 0) {
      setActiveClassId(updatedClasses[0].id);
    }
    const defaultUnits = OFFICIAL_CURRICULA_BY_SUBJECT[updatedProfile.subject] || OFFICIAL_CURRICULA_BY_SUBJECT['العلوم الفيزيائية'] || [];
    setCurriculum(defaultUnits);
    setIsWelcomeWizardOpen(false);
    showNotice(`تم حفظ إعدادات مادتك (${updatedProfile.subject}) مع ${updatedClasses.length} أقسام بنجاح! مرحباً بك.`);
  };

  // فصل الأقسام النشطة عن الأقسام المؤرشفة
  const activeClasses = useMemo(
    () => classes.filter(c => !c.isArchived),
    [classes]
  );

  const archivedClasses = useMemo(
    () => classes.filter(c => Boolean(c.isArchived)),
    [classes]
  );

  // إخفاء حصص الأقسام المؤرشفة تلقائياً من جدول التوقيت الأسبوعي مع الاحتفاظ بها لاستعادتها عند إلغاء الأرشفة
  const activeTimetableSessions = useMemo(() => {
    const archivedIds = new Set(archivedClasses.map(c => c.id));
    const archivedNames = new Set(archivedClasses.map(c => c.name));
    return timetableSessions.filter(
      s => !archivedIds.has(s.classId) && !archivedNames.has(s.className)
    );
  }, [timetableSessions, archivedClasses]);

  // القسم النشط (يُختار من الأقسام النشطة غير المؤرشفة أولاً)
  const activeClass = useMemo(
    () => activeClasses.find(c => c.id === activeClassId) || activeClasses[0] || classes[0] || INITIAL_CLASSES[0],
    [activeClasses, classes, activeClassId]
  );

  // القسم المؤرشف المحدد للمعاينة (وضع القراءة والطباعة فقط)
  const selectedArchivedClass = useMemo(
    () => archivedClasses.find(c => c.id === selectedArchivedClassId) || archivedClasses[0] || null,
    [archivedClasses, selectedArchivedClassId]
  );

  // قائمة المواسم الدراسية المتوفرة في الأرشيف
  const availableArchiveYears = useMemo(() => {
    const years = new Set<string>(['2026/2027', '2025/2026', '2024/2025']);
    archivedClasses.forEach(c => {
      if (c.academicYear) years.add(c.academicYear);
    });
    return Array.from(years);
  }, [archivedClasses]);

  // تصفية الأقسام المؤرشفة حسب الموسم الدراسي والبحث
  const filteredArchivedClasses = useMemo(() => {
    return archivedClasses.filter(cls => {
      const matchesYear = archiveYearFilter === 'all' || (cls.academicYear || '2026/2027') === archiveYearFilter;
      const q = archiveSearchQuery.trim();
      if (!q) return matchesYear;
      const normQ = normalizeArabic(q);
      const matchText = normalizeArabic(`${cls.name} ${cls.level} ${cls.stream} ${cls.archiveNote || ''} ${cls.academicYear || ''}`);
      return matchesYear && matchText.includes(normQ);
    });
  }, [archivedClasses, archiveYearFilter, archiveSearchQuery]);

  // تصفية تلاميذ القسم المؤرشف المحدد في وضع القراءة والطباعة فقط
  const filteredArchivedStudents = useMemo(() => {
    if (!selectedArchivedClass) return [];
    const hasSearch = Boolean(archivedStudentSearch.trim());
    return selectedArchivedClass.students.filter(st => {
      if (!hasSearch && archivedStudentGroupFilter !== 'all' && st.group !== archivedStudentGroupFilter) {
        return false;
      }
      if (hasSearch && !matchesStudentQuery(st, archivedStudentSearch)) {
        return false;
      }
      return true;
    });
  }, [selectedArchivedClass, archivedStudentSearch, archivedStudentGroupFilter]);

  // فتح نافذة أرشفة القسم
  const openArchiveClassModal = (cls: ClassGroup) => {
    setArchiveModalClass(cls);
    setArchiveForm({
      academicYear: cls.academicYear || '2026/2027',
      archiveNote: cls.archiveNote || ''
    });
  };

  // تأكيد أرشفة القسم ونقله إلى خزانة الأرشيف مع إخفاء حصصه تلقائياً
  const handleConfirmArchiveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveModalClass) return;
    const targetId = archiveModalClass.id;
    const targetName = archiveModalClass.name;
    const today = new Date().toISOString().split('T')[0];
    const year = archiveForm.academicYear.trim() || '2026/2027';
    const note = archiveForm.archiveNote.trim();

    const remainingActive = activeClasses.filter(c => c.id !== targetId);

    setClasses(prev =>
      prev.map(c =>
        c.id === targetId
          ? {
              ...c,
              isArchived: true,
              archivedAt: today,
              academicYear: year,
              archiveNote: note
            }
          : c
      )
    );

    if (activeClassId === targetId && remainingActive.length > 0) {
      setActiveClassId(remainingActive[0].id);
    }

    setSelectedArchivedClassId(targetId);
    setArchiveModalClass(null);
    showNotice(`📦 تم نقل قسم «${targetName}» إلى أرشيف (${year}) وإخفاء حصصه من جدول التوقيت مع حفظ كافة البيانات!`);
  };

  // استعادة قسم من الأرشيف إلى الأقسام النشطة وإعادة إظهار حصصه في جدول التوقيت
  const handleRestoreArchivedClass = (cls: ClassGroup) => {
    setClasses(prev =>
      prev.map(c =>
        c.id === cls.id
          ? {
              ...c,
              isArchived: false
            }
          : c
      )
    );
    setActiveClassId(cls.id);
    setClassesManagementMode('active');
    showNotice(`✓ تمت استعادة قسم «${cls.name}» إلى لوحة القيادة النشطة وإعادة تفعيل حصصه في جدول التوقيت!`);
  };

  // التلاميذ الذين تجاوزوا 3 غيابات غير مبررة (نظام التنبيهات المرئي)
  const studentsWithAbsenceAlert = useMemo(() => {
    return activeClass.students.filter(s => s.absencesCount >= 3);
  }, [activeClass]);

  // مقارنة أداء الفوج الأول والفوج الثاني في مادة الأستاذ
  const groupComparison = useMemo(() => {
    const g1 = activeClass.students.filter(s => s.group === 1);
    const g2 = activeClass.students.filter(s => s.group === 2);
    const hasTP = activeClass.hasTP;

    const calcMetrics = (studentsList: Student[]) => {
      const count = studentsList.length;
      if (count === 0) {
        return {
          count: 0,
          continuousAvg: 0,
          tpAvg: 0,
          test1Avg: 0,
          test2Avg: 0,
          examAvg: 0,
          overallAvg: 0,
          successRate: 0,
          excellenceRate: 0,
          remedialRate: 0,
          maxScore: 0,
          minScore: 0,
          absencesAvg: 0,
          totalAbsences: 0,
        };
      }
      const continuousAvg = Number((studentsList.reduce((acc, s) => acc + calcContinuousScore(s.bonusPoints), 0) / count).toFixed(2));
      const tpAvg = hasTP ? Number((studentsList.reduce((acc, s) => acc + s.tpScore, 0) / count).toFixed(2)) : 0;
      const test1Avg = Number((studentsList.reduce((acc, s) => acc + s.test1, 0) / count).toFixed(2));
      const test2Avg = Number((studentsList.reduce((acc, s) => acc + s.test2, 0) / count).toFixed(2));
      const examAvg = Number((studentsList.reduce((acc, s) => acc + s.exam, 0) / count).toFixed(2));
      
      const avgs = studentsList.map(s => calcStudentAverage(s, hasTP));
      const overallAvg = Number((avgs.reduce((acc, a) => acc + a, 0) / count).toFixed(2));
      const successCount = avgs.filter(a => a >= 10).length;
      const successRate = Math.round((successCount / count) * 100);
      const excellenceCount = avgs.filter(a => a >= 14).length;
      const excellenceRate = Math.round((excellenceCount / count) * 100);
      const remedialCount = avgs.filter(a => a < 10).length;
      const remedialRate = Math.round((remedialCount / count) * 100);
      const maxScore = avgs.length ? Math.max(...avgs) : 0;
      const minScore = avgs.length ? Math.min(...avgs) : 0;
      
      const totalAbsences = studentsList.reduce((acc, s) => acc + s.absencesCount, 0);
      const absencesAvg = Number((totalAbsences / count).toFixed(2));

      return {
        count,
        continuousAvg,
        tpAvg,
        test1Avg,
        test2Avg,
        examAvg,
        overallAvg,
        successRate,
        excellenceRate,
        remedialRate,
        maxScore,
        minScore,
        absencesAvg,
        totalAbsences,
      };
    };

    return {
      g1: calcMetrics(g1),
      g2: calcMetrics(g2),
      hasTP,
      g1Count: g1.length,
      g2Count: g2.length,
    };
  }, [activeClass]);

  // بنية صفوف جدول المقارنة بين الفوجين
  const comparisonRows = useMemo(() => {
    const { g1, g2, hasTP } = groupComparison;

    const rows = [
      {
        id: 'overallAvg',
        label: 'المعدل الفصلي العام في المادة',
        category: 'average' as const,
        val1: g1.overallAvg,
        val2: g2.overallAvg,
        unit: '/ 20',
        higherIsBetter: true,
        threshold: 0.5,
        description: 'متوسط كافة عناصر التقويم (المستمر + الفروض + الاختبار)',
      },
      {
        id: 'successRate',
        label: 'نسبة النجاح (معدل ≥ 10 / 20)',
        category: 'average' as const,
        val1: g1.successRate,
        val2: g2.successRate,
        unit: '%',
        higherIsBetter: true,
        threshold: 5,
        description: 'نسبة التلاميذ المحققين للمعدل فما فوق',
      },
      {
        id: 'excellenceRate',
        label: 'نسبة الامتياز والجودة (معدل ≥ 14 / 20)',
        category: 'average' as const,
        val1: g1.excellenceRate,
        val2: g2.excellenceRate,
        unit: '%',
        higherIsBetter: true,
        threshold: 5,
        description: 'نسبة التلاميذ أصحاب التقديرات الجيدة والممتازة',
      },
      {
        id: 'remedialRate',
        label: 'نسبة التلاميذ دون المعدل (< 10 / 20)',
        category: 'average' as const,
        val1: g1.remedialRate,
        val2: g2.remedialRate,
        unit: '%',
        higherIsBetter: false,
        threshold: 5,
        description: 'الفئة المستهدفة بحصص الدعم والمعالجة البيداغوجية (الأقل أفضل)',
      },
      {
        id: 'examAvg',
        label: 'متوسط الاختبار الفصلي',
        category: 'evaluation' as const,
        val1: g1.examAvg,
        val2: g2.examAvg,
        unit: '/ 20',
        higherIsBetter: true,
        threshold: 0.5,
        description: 'نقطة الامتحان الفصلي الموحد',
      },
      {
        id: 'test1Avg',
        label: 'متوسط الفرض الأول',
        category: 'evaluation' as const,
        val1: g1.test1Avg,
        val2: g2.test1Avg,
        unit: '/ 20',
        higherIsBetter: true,
        threshold: 0.5,
        description: 'تقويم مرحلي للمكتسبات الأولى',
      },
      {
        id: 'test2Avg',
        label: 'متوسط الفرض الثاني',
        category: 'evaluation' as const,
        val1: g1.test2Avg,
        val2: g2.test2Avg,
        unit: '/ 20',
        higherIsBetter: true,
        threshold: 0.5,
        description: 'تقويم مرحلي لتعميق الكفاءات',
      },
      ...(hasTP ? [{
        id: 'tpAvg',
        label: 'متوسط الأعمال التطبيقية والمخبر (TP)',
        category: 'evaluation' as const,
        val1: g1.tpAvg,
        val2: g2.tpAvg,
        unit: '/ 20',
        higherIsBetter: true,
        threshold: 0.5,
        description: 'التجريب المخبري والتطبيقات العملية في المادة',
      }] : []),
      {
        id: 'continuousAvg',
        label: 'متوسط التقويم المستمر والانضباط',
        category: 'evaluation' as const,
        val1: g1.continuousAvg,
        val2: g2.continuousAvg,
        unit: '/ 20',
        higherIsBetter: true,
        threshold: 0.5,
        description: 'المشاركة الصفية، الواجبات، والسلوك والمواظبة',
      },
      {
        id: 'maxScore',
        label: 'أعلى معدل مسجل في الفوج',
        category: 'average' as const,
        val1: g1.maxScore,
        val2: g2.maxScore,
        unit: '/ 20',
        higherIsBetter: true,
        threshold: 0.5,
        description: 'أفضل إنجاز فردي مسجل داخل كل فوج',
      },
      {
        id: 'absencesAvg',
        label: 'معدل الغيابات غير المبررة (لكل تلميذ)',
        category: 'discipline' as const,
        val1: g1.absencesAvg,
        val2: g2.absencesAvg,
        unit: ' غياب',
        higherIsBetter: false,
        threshold: 0.3,
        description: 'مؤشر المواظبة والحضور النظامي (الأقل أفضل)',
      },
      {
        id: 'totalAbsences',
        label: 'إجمالي الغيابات المرصودة في الفوج',
        category: 'discipline' as const,
        val1: g1.totalAbsences,
        val2: g2.totalAbsences,
        unit: ' غياب',
        higherIsBetter: false,
        threshold: 2,
        description: 'مجموع حصص الغياب غير المبررة (الأقل أفضل)',
      },
    ];

    return rows;
  }, [groupComparison]);

  // فتح نافذة إرسال الإشعار التذكيري للولي
  const openAbsenceReminderModal = (st: Student) => {
    setAbsenceReminderStudent(st);
    setCustomAbsenceNoticeText(
      `إلى ولي أمر التلميذ(ة): ${st.lastName} ${st.firstName}
القسم: ${activeClass.name}
المؤسسة: ${teacherProfile.highSchool}
المادة: ${teacherProfile.subject}

تحية تربوية طيبة،
نحيطكم علماً بأن ابنكم(تكم) قد تجاوز الحد المسموح به للغيابات غير المبررة بتسجيله (${st.absencesCount} غيابات).
نرجو منكم التقرب من إدارة المؤسسة لتبرير هذه الغيابات عاجلاً في أجل أقصاه 48 ساعة لتفادي الإجراءات التأديبية المنصوص عليها قانوناً.
رمز المتابعة الإلكترونية للتلميذ: ${st.parentCode}`
    );
    setAbsenceReminderModalOpen(true);
  };

  // تأكيد إرسال الإشعار وتوثيقه في ملف التلميذ وسجله لدى الولي
  const sendAbsenceReminderToParent = () => {
    if (!absenceReminderStudent) return;
    const today = new Date().toISOString().split('T')[0];
    const newNoticeLog: BehaviorLog = {
      id: `abs-notice-${Date.now()}`,
      date: today,
      type: 'absence',
      reason: `⚠️ إشعار تذكيري رسمي لولي الأمر: تجاوز ${absenceReminderStudent.absencesCount} غيابات غير مبررة (تم الإرسال)`,
      delta: 0,
      parentAcknowledged: false
    };

    updateStudent(absenceReminderStudent.id, s => ({
      ...s,
      logs: [newNoticeLog, ...s.logs]
    }));

    setAbsenceReminderModalOpen(false);
    showNotice(`تم إرسال وتوثيق الإشعار التذكيري لولي أمر التلميذ (${absenceReminderStudent.lastName} ${absenceReminderStudent.firstName}) بنجاح!`);
  };

  // عدد الطاولات الإجمالي المخصص لهذا القسم [تعديل 5]
  const totalDesksCount = activeClass.totalDesks || 24;

  const selectedStudent = useMemo(
    () => activeClass.students.find(s => s.id === selectedStudentId) || null,
    [activeClass, selectedStudentId]
  );

  const filteredStudents = useMemo(() => {
    return activeClass.students.filter(s => {
      const hasSearch = Boolean(searchQuery.trim());
      const matchesGroup = groupFilter === 'all' || hasSearch || s.group === groupFilter;
      const matchesSearch = matchesStudentQuery(s, searchQuery);
      return matchesGroup && matchesSearch;
    });
  }, [activeClass, groupFilter, searchQuery]);

  // قائمة التلاميذ المطابقين لحرف البحث في وضع الحصة المباشرة
  const inClassMatchingStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return activeClass.students.filter(s => matchesStudentQuery(s, searchQuery));
  }, [activeClass.students, searchQuery]);

  // قائمة التلاميذ المفلترة في مصفوفة التنقيط والرقمنة لحجز النقاط السريع
  const filteredGradingStudents = useMemo(() => {
    if (!gradingSearch.trim()) return activeClass.students;
    return activeClass.students.filter(st => matchesStudentQuery(st, gradingSearch));
  }, [activeClass.students, gradingSearch]);

  // [تعديل 1: تلاميذ القسم المفلترون في جدول الإحصائيات مع إمكانية الترتيب]
  const analyticsStudentsList = useMemo(() => {
    const hasSearch = Boolean(analyticsSearchQuery.trim());
    const filtered = activeClass.students.filter(s => {
      const avg = calcStudentAverage(s, activeClass.hasTP);
      let matchFilter = true;
      if (!hasSearch) {
        if (analyticsFilterGroup === 1) matchFilter = s.group === 1;
        if (analyticsFilterGroup === 2) matchFilter = s.group === 2;
        if (analyticsFilterGroup === 'remedial') matchFilter = avg < 10;
        if (analyticsFilterGroup === 'absentWarning') matchFilter = s.absencesCount >= 3;
      }
      const matchSearch = matchesStudentQuery(s, analyticsSearchQuery);
      return matchFilter && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      if (analyticsSortBy === 'avg_desc') {
        return calcStudentAverage(b, activeClass.hasTP) - calcStudentAverage(a, activeClass.hasTP);
      }
      if (analyticsSortBy === 'avg_asc') {
        return calcStudentAverage(a, activeClass.hasTP) - calcStudentAverage(b, activeClass.hasTP);
      }
      if (analyticsSortBy === 'absences_desc') {
        return b.absencesCount - a.absencesCount;
      }
      if (analyticsSortBy === 'name_asc') {
        return a.lastName.localeCompare(b.lastName, 'ar');
      }
      if (analyticsSortBy === 'group') {
        return a.group - b.group;
      }
      return 0;
    });
  }, [activeClass, analyticsFilterGroup, analyticsSearchQuery, analyticsSortBy]);

  const updateStudent = (studentId: string, updater: (s: Student) => Student, targetClassId?: string) => {
    setClasses(prev =>
      prev.map(cls => {
        const isTarget = targetClassId ? cls.id === targetClassId : (cls.id === activeClass.id || cls.students.some(s => s.id === studentId));
        if (!isTarget) return cls;
        return {
          ...cls,
          students: cls.students.map(st => (st.id === studentId ? updater(st) : st))
        };
      })
    );
  };

  const deleteStudent = (studentId: string, studentName?: string, targetClassId?: string) => {
    setClasses(prev =>
      prev.map(cls => {
        const isTarget = targetClassId ? cls.id === targetClassId : (cls.id === activeClass.id || cls.students.some(s => s.id === studentId));
        if (!isTarget) return cls;
        return {
          ...cls,
          students: cls.students.filter(st => st.id !== studentId)
        };
      })
    );
    if (selectedStudentId === studentId) {
      setSelectedStudentId(null);
    }
    if (selectedStudentForDetails?.student.id === studentId) {
      setSelectedStudentForDetails(null);
    }
    showNotice(`✓ تم حذف التلميذ ${studentName || ''} بنجاح من القسم`);
  };

  // قائمة جميع التلاميذ في المنصة للبحث المباشر
  const allPlatformStudents = useMemo(() => {
    return classes.flatMap(cls =>
      cls.students.map(st => ({
        ...st,
        classId: cls.id,
        className: cls.name,
        classLevel: cls.level,
        hasTP: cls.hasTP
      }))
    );
  }, [classes]);

  // نتائج البحث المباشر في المنصة عبر كل الأقسام (تظهر كل الأسماء بمجرد كتابة حرف واحد)
  const globalSearchResults = useMemo(() => {
    if (!globalStudentSearch || !globalStudentSearch.trim()) return [];
    return allPlatformStudents.filter(st => matchesStudentQuery(st, globalStudentSearch));
  }, [allPlatformStudents, globalStudentSearch]);

  // قائمة التلاميذ المفلترة في إدارة القوائم (تظهر كل الأسماء المطابقة للحرف فوراً)
  const filteredClassListStudents = useMemo(() => {
    const hasSearch = Boolean(classListSearch.trim());
    return activeClass.students.filter(st => {
      if (!hasSearch) {
        if (classListGroupFilter !== 'all' && st.group !== classListGroupFilter) return false;
        if (classListCoordinationFilter !== 'all') {
          if (classListCoordinationFilter === 'urgent' && st.coordinationStatus !== 'urgent') return false;
          if (classListCoordinationFilter === 'followup' && st.coordinationStatus !== 'followup') return false;
          if (classListCoordinationFilter === 'good' && (st.coordinationStatus && st.coordinationStatus !== 'good')) return false;
        }
      }
      if (hasSearch) {
        if (!matchesStudentQuery(st, classListSearch)) return false;
      }
      return true;
    });
  }, [activeClass.students, classListGroupFilter, classListCoordinationFilter, classListSearch]);

  // فتح نافذة التنسيق مع أولياء الأمور
  const openCoordinationModal = (st: Student, classId?: string) => {
    setCoordinationStudent(st);
    setCoordinationTargetClassId(classId || activeClass.id);
    setCoordinationForm({
      parentName: st.parentName || '',
      parentPhone: st.parentPhone || '',
      parentNotes: st.parentNotes || st.remark || '',
      parentRecommendations: st.parentRecommendations || '',
      strengths: st.strengths || '',
      areasForImprovement: st.areasForImprovement || '',
      coordinationStatus: st.coordinationStatus || 'good'
    });
    setStudentActionDropdownId(null);
    setIsGlobalSearchActive(false);
  };

  // حفظ وتحديث بيانات التنسيق مع الولي
  const saveCoordinationModal = () => {
    if (!coordinationStudent) return;
    const today = new Date().toISOString().split('T')[0];
    const targetCId = coordinationTargetClassId || activeClass.id;

    updateStudent(coordinationStudent.id, s => ({
      ...s,
      parentName: coordinationForm.parentName.trim(),
      parentPhone: coordinationForm.parentPhone.trim(),
      parentNotes: coordinationForm.parentNotes.trim(),
      parentRecommendations: coordinationForm.parentRecommendations.trim(),
      strengths: coordinationForm.strengths.trim(),
      areasForImprovement: coordinationForm.areasForImprovement.trim(),
      coordinationStatus: coordinationForm.coordinationStatus,
      lastCoordinationDate: today
    }), targetCId);

    showNotice(`تم حفظ وتحديث بطاقة التنسيق مع ولي أمر التلميذ ${coordinationStudent.lastName} ${coordinationStudent.firstName} بنجاح!`);
    setCoordinationStudent(null);
  };

  // إنشاء نص تقرير التنسيق للولي
  const generateParentReportText = (st: Student, classGroup?: ClassGroup) => {
    const cls = classGroup || classes.find(c => c.id === coordinationTargetClassId) || activeClass;
    const avg = calcStudentAverage(st, cls.hasTP);
    const cc = calcContinuousScore(st.bonusPoints);
    return `*تقرير التنسيق والمتابعة التربوية مع ولي الأمر*
المؤسسة: ${teacherProfile.highSchool}
المادة: ${teacherProfile.subject} (الأستاذ: ${teacherProfile.name})
التلميذ: ${st.lastName} ${st.firstName}
القسم: ${cls.name} (${cls.level})
كود المتابعة الإلكترونية للولي: ${st.parentCode}

📊 *المؤشرات البيداغوجية الحالية:*
- المعدل الفصلي التقديري: ${avg} / 20
- نقطة التقويم المستمر: ${cc} / 20
- رصيد المشاركة والسلوك: ${st.bonusPoints > 0 ? `+${st.bonusPoints}` : st.bonusPoints}
- عدد الغيابات المسجلة: ${st.absencesCount}

📝 *ملاحظات الأستاذ لولي الأمر:*
${st.parentNotes || st.remark || 'تلميذ منتظم ومواظب، يُرجى مواصلة التشجيع والمتابعة المنزلية.'}

🎯 *التوصيات والتوجيهات المنزلية للأولياء:*
${st.parentRecommendations || 'الحرص على حل التمارين التطبيقية بانتظام في البيت والمراجعة الأسبوعية.'}

💪 *نقاط القوة:* ${st.strengths || 'الانضباط والمشاركة الإيجابية'}
🔍 *نقاط التحسين:* ${st.areasForImprovement || 'المنهجية وتنظيم الإجابة'}

يمكنكم إدخال الكود (${st.parentCode}) في المنصة لمعاينة الكشف التفاعلي الكامل في أي وقت.`;
  };

  // فتح محادثة واتساب مع ولي الأمر
  const openWhatsAppToParent = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '213' + cleanPhone.slice(1) : cleanPhone;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${intlPhone}?text=${encoded}`, '_blank');
  };

  const applyPointsDelta = (studentId: string, delta: number, reason: string) => {
    const today = new Date().toISOString().split('T')[0];
    updateStudent(studentId, s => ({
      ...s,
      bonusPoints: Number((s.bonusPoints + delta).toFixed(2)),
      logs: [
        {
          id: `log-${Date.now()}`,
          date: today,
          type: delta >= 0 ? 'positive' : 'negative',
          reason,
          delta,
          parentAcknowledged: false
        },
        ...s.logs
      ]
    }));
    showNotice(`تم تعديل رصيد التلميذ بمقدار (${delta > 0 ? `+${delta}` : delta}) نقطة`);
  };

  const setStudentAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    const today = new Date().toISOString().split('T')[0];
    updateStudent(studentId, s => {
      const wasAbsent = s.attendance === 'absent';
      const isNowAbsent = status === 'absent';
      let newAbsences = s.absencesCount;
      if (!wasAbsent && isNowAbsent) newAbsences += 1;
      if (wasAbsent && !isNowAbsent && newAbsences > 0) newAbsences -= 1;

      const newLogs = status !== 'present'
        ? [
            {
              id: `att-${Date.now()}`,
              date: today,
              type: status === 'absent' ? ('absence' as const) : ('late' as const),
              reason: status === 'absent' ? 'تسجيل غياب في الحصة' : 'تسجيل تأخر عن انطلاق الحصة',
              delta: 0,
              parentAcknowledged: false
            },
            ...s.logs
          ]
        : s.logs;

      return { ...s, attendance: status, absencesCount: newAbsences, logs: newLogs };
    });
  };

  // [تعديل 5: إضافة وحذف الطاولات في مخطط الجلوس]
  const handleAddDesk = () => {
    setClasses(prev =>
      prev.map(cls => {
        if (cls.id !== activeClass.id) return cls;
        const currentCount = cls.totalDesks || 24;
        return { ...cls, totalDesks: currentCount + 4 }; // إضافة صف طاولة جديد (4 مقاعد)
      })
    );
    showNotice(`تمت إضافة 4 مقاعد جديدة لمخطط القسم (الإجمالي: ${(activeClass.totalDesks || 24) + 4} مقعد)`);
  };

  const handleRemoveDesk = () => {
    const current = activeClass.totalDesks || 24;
    if (current <= 12) {
      showNotice('لا يمكن إنقاص عدد المقاعد إلى أقل من 12.');
      return;
    }
    // التأكد من عدم حذف مقعد مأهول بتلميذ
    const hasOccupantInLast4 = activeClass.students.some(s => s.seatIndex >= current - 4);
    if (hasOccupantInLast4) {
      showNotice('تنبيه: المقاعد الأخيرة تحتوي على تلاميذ. يرجى نقلهم أولاً!');
      return;
    }
    setClasses(prev =>
      prev.map(cls => (cls.id === activeClass.id ? { ...cls, totalDesks: current - 4 } : cls))
    );
    showNotice(`تم حذف 4 مقاعد شاغرة (الإجمالي الجديد: ${current - 4} مقعد)`);
  };

  const handleSeatDrop = (fromSeat: number, toSeat: number) => {
    setDraggingSeatIdx(null);
    setDragOverSeatIdx(null);
    if (fromSeat === toSeat) return;

    setClasses(prev => {
      const nextClasses = prev.map(cls => {
        if (cls.id !== activeClass.id) return cls;
        const updatedStudents = cls.students.map(st => {
          if (st.seatIndex === fromSeat) return { ...st, seatIndex: toSeat };
          if (st.seatIndex === toSeat) return { ...st, seatIndex: fromSeat };
          return st;
        });
        return { ...cls, students: updatedStudents };
      });

      if (currentUser) {
        const payload = {
          teacherProfile,
          classes: nextClasses,
          curriculum,
          timetableSessions,
          uploadedPDFs
        };
        syncTeacherDataToServer(currentUser.email, payload);
      }
      return nextClasses;
    });

    showNotice(`✓ تم نقل المقعد (#${fromSeat + 1} ⇄ #${toSeat + 1}) بالسحب والإفلات وحفظه في Firestore!`);
  };

  const handleSeatClick = (_seatIndex: number, currentStudent?: Student) => {
    if (!isEditingSeating) {
      if (currentStudent) {
        setSelectedStudentId(currentStudent.id);
        setSelectedStudentForDetails({ student: currentStudent, classInfo: activeClass });
      }
      return;
    }
    showNotice(`اسحب بطاقة التلميذ وأفلتها فوق أي مقعد آخر لإعادة ترتيب الجلوس.`);
  };

  // القرعة العشوائية
  const runRandomPicker = () => {
    const presentStudents = activeClass.students.filter(s => s.attendance !== 'absent');
    if (presentStudents.length === 0) {
      showNotice('لا يوجد تلاميذ حاضرون في هذا القسم لإجراء القرعة!');
      return;
    }
    setIsPicking(true);
    let counter = 0;
    const interval = setInterval(() => {
      const rand = presentStudents[Math.floor(Math.random() * presentStudents.length)];
      setPickedStudent(rand);
      counter++;
      if (counter > 12) {
        clearInterval(interval);
        setIsPicking(false);
        setSelectedStudentId(rand.id);
        showNotice(`وقع الاختيار على: ${rand.lastName} ${rand.firstName}`);
      }
    }, 100);
  };

  // [تعديل 7: النقر على حصة في الجدول لفتح خيار التعديل اليدوي والكتابة واختيار القسم]
  const handleSlotClick = (day: DayOfWeek, slotStart: string, existingSession?: TimetableSession) => {
    if (existingSession) {
      setIsNewSessionInSlot(false);
      setEditingSessionForm({
        id: existingSession.id,
        day: existingSession.day,
        startTime: existingSession.startTime,
        endTime: existingSession.endTime,
        classId: existingSession.classId,
        className: existingSession.className,
        room: existingSession.room,
        groupType: existingSession.groupType,
        type: existingSession.type,
        notes: existingSession.notes || ''
      });
    } else {
      setIsNewSessionInSlot(true);
      const slotObj = TIME_SLOTS.find(s => s.start === slotStart);
      setEditingSessionForm({
        id: `tt-${Date.now()}`,
        day,
        startTime: slotStart,
        endTime: slotObj?.end || '09:00',
        classId: activeClass.id,
        className: activeClass.name,
        room: activeClass.room,
        groupType: 'قسم كامل',
        type: 'درس نظري',
        notes: ''
      });
    }
    setSessionEditModalOpen(true);
  };

  // حفظ تعديلات الحصة في الجدول
  const handleSaveSessionEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessionForm.className?.trim()) return;

    const matchedCls = classes.find(c => c.name === editingSessionForm.className || c.id === editingSessionForm.classId) || activeClass;
    const finalSession: TimetableSession = {
      id: editingSessionForm.id || `tt-${Date.now()}`,
      day: editingSessionForm.day || 'الأحد',
      startTime: editingSessionForm.startTime || '08:00',
      endTime: editingSessionForm.endTime || '09:00',
      classId: matchedCls.id,
      className: matchedCls.name,
      room: editingSessionForm.room || matchedCls.room,
      groupType: editingSessionForm.groupType || 'قسم كامل',
      type: editingSessionForm.type || 'درس نظري',
      notes: editingSessionForm.notes || ''
    };

    setTimetableSessions(prev => {
      const filtered = prev.filter(s => s.id !== finalSession.id && !(s.day === finalSession.day && s.startTime === finalSession.startTime));
      return [...filtered, finalSession];
    });

    setSessionEditModalOpen(false);
    showNotice(`تم حفظ الحصة (${finalSession.className} - ${finalSession.type}) في جدول التوقيت!`);
  };

  const handleDeleteSession = (sessionId: string) => {
    setTimetableSessions(prev => prev.filter(s => s.id !== sessionId));
    setSessionEditModalOpen(false);
    showNotice('تم حذف الحصة من جدول التوقيت بنجاح.');
  };

  // تصدير ملف الرقمنة (يدعم القسم النشط أو أي قسم مؤرشف للقراءة والتصدير)
  const exportDigitizationCSV = (targetClassOverride?: ClassGroup) => {
    const targetCls = targetClassOverride || activeClass;
    const headers = [
      'الرقم', 'اللقب', 'الاسم', 'تاريخ الميلاد', 'الفوج', 'التقويم المستمر',
      'الأعمال التطبيقية', 'الفرض 1', 'الفرض 2', 'معدل الفروض', 'الاختبار', 'المعدل الفصلي', 'الملاحظة التربوية'
    ];
    const rows = targetCls.students.map((s, idx) => {
      const cc = calcContinuousScore(s.bonusPoints);
      const testsAvg = ((s.test1 + s.test2) / 2).toFixed(2);
      const finalAvg = calcStudentAverage(s, targetCls.hasTP);
      const remark = s.remark || generateSmartRemark(s, targetCls.hasTP);
      return [
        idx + 1, `"${s.lastName}"`, `"${s.firstName}"`, s.birthDate, s.group,
        cc, s.tpScore, s.test1, s.test2, testsAvg, s.exam, finalAvg, `"${remark}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const suffix = targetCls.isArchived ? `_أرشيف_${targetCls.academicYear || ''}` : '';
    link.setAttribute('download', `حجز_نقاط_الرقمنة_${targetCls.name}${suffix}_${teacherProfile.subject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice(`تم تصدير ملف الرقمنة لقسم ${targetCls.name} بنجاح!`);
  };

  // إجمالي عدد التلاميذ في كافة الأقسام
  const totalStudentsCount = useMemo(() => {
    return classes.reduce((sum, c) => sum + c.students.length, 0);
  }, [classes]);

  // التلميذ للبطاقة الفردية الدقيقة
  const currentDiagnosticStudent = useMemo(() => {
    if (selectedStudentForDiagnostic) {
      const found = activeClass.students.find(s => s.id === selectedStudentForDiagnostic);
      if (found) return found;
    }
    return activeClass.students[0] || null;
  }, [activeClass, selectedStudentForDiagnostic]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 0. عند تحميل مصادقة Firebase Auth أولاً وقبل عرض أي واجهة
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans dir-rtl">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-2xl shadow-blue-500/30 animate-pulse mb-4">
          
        </div>
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-white mb-1">جارٍ التحقق من حالة مصادقة الحساب (Firebase Auth)...</h2>
        <p className="text-xs text-slate-400">التحقق الآمن من حالة التفعيل والصلاحيات</p>
      </div>
    );
  }

  // 1. إذا لم يسجل الأستاذ الدخول، أو في وضع معاينة بوابة الأولياء
  if (!currentUser || isParentPreviewOpen) {
    return (
      <div className="relative">
        {isParentPreviewOpen && currentUser && (
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-300" />
              <span>أنت في وضع معاينة فضاء الأولياء بالكود (حساب الأستاذ: {currentUser.name})</span>
            </span>
            <button
              onClick={() => setIsParentPreviewOpen(false)}
              className="bg-white text-blue-800 hover:bg-blue-50 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
            >
              العودة إلى المنصة البيداغوجية
            </button>
          </div>
        )}
        <LandingPage
          classes={classes}
          onGoogleSignIn={(user) => {
            setIsParentPreviewOpen(false);
            handleGoogleSignIn(user);
          }}
          onOpenAdminPanel={() => {
            localStorage.setItem('smart_notebook_is_admin_device', 'true');
            setIsAdminManagerOpen(true);
          }}
        />
        {isAdminManagerOpen && (
          <AdminSubscriptionManager
            currentUser={currentUser || ADMIN_USER}
            onClose={() => setIsAdminManagerOpen(false)}
            onSubscriptionUpdated={() => setSubscriptionRefreshTick(t => t + 1)}
          />
        )}
      </div>
    );
  }

  // 0. عند تعذر الاتصال بالسيرفر أو انقطاع القراءة لحماية بيانات الدفتر
  if (hasNetworkError && currentUser) {
    return (
      <NetworkErrorNotice
        onRetry={handleRetryNetwork}
        isRetrying={isRetryingNetwork}
      />
    );
  }

  // 0.5 أثناء تحميل بيانات الأستاذ وجلسة الإعدادات من السيرفر والتخزين الدائم
  if (currentUser && isDataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans dir-rtl relative">
        <div className="mb-4 animate-pulse">
          <BrandLogo size="xl" showText={false} />
        </div>
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-white mb-1">جارٍ استعادة بيانات الأستاذ والتأكد من إعدادات الحساب...</h2>
        <p className="text-xs text-slate-400">الدفتر اليومي الذكي للأستاذ — مزامنة سحابية بنسبة 100%</p>
        {isAdminManagerOpen && (
          <AdminSubscriptionManager
            currentUser={currentUser || ADMIN_USER}
            onClose={() => setIsAdminManagerOpen(false)}
            onSubscriptionUpdated={() => setSubscriptionRefreshTick(t => t + 1)}
          />
        )}
      </div>
    );
  }

  // التحقق الحقيقي من حالة اشتراك الأستاذ وصلاحيات الوصول للميزات المدفوعة
  const accessCheck = checkTeacherFeatureAccess(currentUser.email);

  // إذا لم تكن حالة الحساب نشطة تماماً في Firestore (active)، توجيه فوراً إلى صفحة انتظار التفعيل ومنع تحميل أي مكونات بيداغوجية
  if (accessCheck.status !== 'active') {
    const currentSub = getTeacherSubscription(currentUser.email);
    return (
      <div className="relative">
        <TeacherAppleLandingPage
          currentUser={currentUser}
          currentSubscription={currentSub}
          onRequestActivation={async (phone, note) => {
            await submitSubscriptionRequestAsync(
              currentUser.email,
              currentUser.name || currentUser.email.split('@')[0],
              'lifetime',
              {
                senderName: currentUser.name || currentUser.email,
                phoneNumber: phone,
                amount: 1000,
                paidAt: new Date().toISOString(),
                receiptNote: note || 'طلب تفعيل الوصول الدائم مقابل 1000 دج عبر بريدي موب',
                sentViaWhatsApp: true
              }
            );
            setSubscriptionRefreshTick(t => t + 1);
            showNotice('تم إرسال طلب التفعيل بنجاح! يرجى إرسال صورة الوصل عبر واتساب لتأكيد التفعيل');
            return true;
          }}
          onLogout={handleLogout}
          onRefreshSubscriptionStatus={() => setSubscriptionRefreshTick(t => t + 1)}
          onOpenAdminPanel={() => {
            localStorage.setItem('smart_notebook_is_admin_device', 'true');
            setIsAdminManagerOpen(true);
          }}
        />
        {isAdminManagerOpen && (
          <AdminSubscriptionManager
            currentUser={currentUser || ADMIN_USER}
            onClose={() => setIsAdminManagerOpen(false)}
            onSubscriptionUpdated={() => setSubscriptionRefreshTick(t => t + 1)}
          />
        )}
      </div>
    );
  }

  // 2. إذا تم تفعيل الاشتراك ومطلوب إعداد المادة والأقسام (فقط في حال عدم إكمال التهيئة مسبقاً أو فتحها يدوياً)
  const shouldShowSetupWizard = accessCheck.hasAccess && (!teacherProfile.isFirstTimeSetupDone || isWelcomeWizardOpen);
  if (shouldShowSetupWizard) {
    return (
      <div className={`relative min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <FirstTimeTeacherWizard
          initialName={currentUser.name}
          onComplete={async (updatedProfile, updatedClasses) => {
            const finalProfile = { ...updatedProfile, isFirstTimeSetupDone: true };
            setTeacherProfile(finalProfile);
            setClasses(updatedClasses);
            setIsWelcomeWizardOpen(false);

            const payload = {
              teacherProfile: finalProfile,
              classes: updatedClasses,
              curriculum,
              timetableSessions
            };

            const ok = await syncTeacherDataToServer(currentUser.email, payload);
            try {
              localStorage.setItem(`teacher_profile_${teacherStorageKey}`, JSON.stringify(finalProfile));
              localStorage.setItem(`teacher_profile_v3`, JSON.stringify(finalProfile));
              localStorage.setItem(`teacher_classes_${teacherStorageKey}`, JSON.stringify(updatedClasses));
              localStorage.setItem(`teacher_classes_v3`, JSON.stringify(updatedClasses));
            } catch {}

            showNotice('تم حفظ إعدادات الأستاذ والأقسام نهائياً! أهلاً بك في الدفتر.');
            return ok;
          }}
        />
        {isAdminManagerOpen && (
          <AdminSubscriptionManager
            currentUser={currentUser || ADMIN_USER}
            onClose={() => setIsAdminManagerOpen(false)}
            onSubscriptionUpdated={() => setSubscriptionRefreshTick(t => t + 1)}
          />
        )}
      </div>
    );
  }

  // 3. المنصة البيداغوجية المتكاملة
  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div dir="rtl" className={`flex-1 flex flex-col md:flex-row relative ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>

      
      {/* Toast تنبيه */}
      {notificationMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-bounce">
          <Bell className="w-5 h-5 text-amber-400" />
          <span className="text-xs sm:text-sm font-semibold">{notificationMsg}</span>
        </div>
      )}

      {/* الهيدر العلوي للهواتف المحمولة المخصص للعمل أثناء الحصة */}
      <div className="md:hidden bg-slate-900 text-white p-2 sm:p-3 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-md no-print gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BrandLogo size="sm" showText={false} />
          
          {/* زر تبديل واختيار القسم السريع للهاتف */}
          <button
            type="button"
            onClick={() => setIsClassSelectorOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-black text-white hover:bg-slate-700 transition cursor-pointer min-h-[36px] max-w-[150px] truncate"
            title="انقر لتغيير السنة أو القسم الدراسي"
          >
            <span className="truncate">{activeClass.name}</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
              {activeClass.level.includes('3') ? '3AS' : activeClass.level.includes('2') ? '2AS' : '1AS'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* مؤشر الحفظ الصغير للهاتف */}
          {cloudSyncStatus === 'saving' && (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" title="جارٍ الحفظ..." />
          )}
          {cloudSyncStatus === 'synced' && (
            <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline" title="محفوظ سحابياً">✓</span>
          )}

          {(currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || localStorage.getItem('smart_notebook_is_admin_device') === 'true' || currentUser?.isAdmin) && (
            <button
              onClick={() => setIsAdminManagerOpen(true)}
              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-md shadow-emerald-600/30 cursor-pointer min-h-[36px]"
              title="لوحة تحكم المدير"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
              <span>المدير</span>
            </button>
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center min-h-[36px] min-w-[36px] ${
              darkMode
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>
          <button
            onClick={() => setIsParentPreviewOpen(true)}
            className="px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[10px] font-bold flex items-center gap-1 min-h-[36px]"
          >
            <Eye className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">الأولياء</span>
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="القائمة المنسدلة"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Grid className="w-5 h-5 text-blue-400" />}
          </button>
        </div>
      </div>

      {/* قائمة Drawer للهواتف */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-between p-4 animate-fadeIn no-print">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <BrandLogo
                size="sm"
                showText={true}
                subtitle={`${teacherProfile.subject} • ${teacherProfile.highSchool}`}
                theme="dark"
              />
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'dashboard', label: 'الرئيسية ولوحة القيادة', icon: LayoutDashboard },
                { id: 'timetable', label: 'جدول التوقيت الأسبوعي', icon: Calendar, badge: '8 إلى 17' },
                { id: 'todo', label: 'قائمة المهام والالتزامات', icon: CheckSquare, badge: 'مهام' },
                { id: 'inclass', label: 'وضع داخل القسم والمخطط', icon: Sparkles, badge: 'حي' },
                { id: 'classes', label: 'إدارة القوائم والـ OCR', icon: Users },
                { id: 'grading', label: 'مصفوفة التنقيط والرقمنة', icon: FileSpreadsheet },
                { id: 'curriculum', label: 'التدرج السنوي والمذكرات', icon: BookOpen },
                { id: 'analytics', label: 'الإحصائيات والتحليل', icon: BarChart3 }
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as typeof activeTab);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md font-black'
                        : 'text-slate-300 bg-slate-800/60 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-xs text-slate-300 font-bold flex justify-between">
                <span>{currentUser?.name || teacherProfile.name}</span>
                <span className="text-[10px] text-blue-400 font-mono">{currentUser?.email}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(currentUser?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || localStorage.getItem('smart_notebook_is_admin_device') === 'true' || currentUser?.isAdmin) && (
                  <button
                    onClick={() => {
                      setIsAdminManagerOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="col-span-2 py-2 px-3 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>لوحة المشرف وإدارة الاشتراكات</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsWelcomeWizardOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5 text-blue-400" />
                  <span>التهيئة</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="py-2 px-2.5 rounded-xl bg-rose-950/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>الخروج</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* الشريط الجانبي الثابت في الحواسيب (Sidebar) */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col justify-between shrink-0 shadow-xl z-20 no-print">
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <BrandLogo
              size="md"
              showText={true}
              subtitle="الطور الثانوي الجزائري"
              theme="dark"
            />
          </div>

          <div className="p-3.5 border-b border-slate-800 bg-slate-800/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-400">المادة المسندة:</span>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                title="تعديل المادة أو المؤسسة"
              >
                <Settings className="w-3 h-3" />
                <span>تعديل</span>
              </button>
            </div>
            <div className="font-bold text-white text-xs bg-slate-900 px-3 py-2 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <span>{teacherProfile.subject}</span>
              <span className="text-[10px] text-emerald-400 font-normal">2026/2027</span>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {[
              { id: 'dashboard', label: 'الرئيسية ولوحة القيادة', icon: LayoutDashboard },
              { id: 'timetable', label: 'جدول التوقيت الأسبوعي', icon: Calendar, badge: '8 إلى 17' },
              { id: 'todo', label: 'قائمة المهام والالتزامات', icon: CheckSquare, badge: 'مهام' },
              { id: 'inclass', label: 'وضع داخل القسم والمخطط', icon: Sparkles, badge: 'حي' },
              { id: 'classes', label: 'إدارة القوائم والـ OCR', icon: Users },
              { id: 'grading', label: 'مصفوفة التنقيط والرقمنة', icon: FileSpreadsheet },
              { id: 'curriculum', label: 'التدرج السنوي والمذكرات', icon: BookOpen },
              { id: 'analytics', label: 'الإحصائيات والتحليل', icon: BarChart3 }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-200 truncate">{currentUser?.name || teacherProfile.name}</div>
            {currentUser?.isAdmin && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                مشرف معتمد
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-blue-400 truncate">{currentUser?.email}</div>
          <div className="text-[11px] text-slate-400 truncate">{teacherProfile.highSchool}</div>

          <div className="pt-2 flex flex-col gap-1.5">
            {(currentUser?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || localStorage.getItem('smart_notebook_is_admin_device') === 'true' || currentUser?.isAdmin) && (
              <button
                onClick={() => setIsAdminManagerOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-900/90 to-teal-900/90 hover:from-emerald-800 hover:to-teal-800 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>لوحة تحكم اشتراكات الأساتذة</span>
              </button>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                darkMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title="تبديل بين المظهر الليلي والمظهر النهاري"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>المظهر النهاري (فاتح)</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>المظهر الليلي (داكن)</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsWelcomeWizardOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>تهيئة المادة والأقسام</span>
            </button>
            <button
              onClick={() => setIsParentPreviewOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>فضاء الأولياء بالكود</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* الشريط العلوي Header */}
        <header className="bg-white border-b border-slate-200 px-2.5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 sticky top-0 z-10 shadow-sm no-print">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0 max-w-full">
            <div className="flex items-center gap-1.5 bg-blue-50 px-2 sm:px-2.5 py-1 rounded-lg border border-blue-200 text-blue-800 text-xs font-bold shrink-0">
              <span className="truncate max-w-[100px] sm:max-w-none">{teacherProfile.subject}</span>
              <button
                onClick={() => setIsWelcomeWizardOpen(true)}
                className="text-blue-500 hover:text-blue-700 shrink-0"
                title="تعديل المادة أو المؤسسة والأقسام"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>

            {/* مؤشر الحفظ السحابي متعدد المستويات الفوري */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
              {cloudSyncStatus === 'saving' && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>جارٍ الحفظ...</span>
                </span>
              )}
              {cloudSyncStatus === 'synced' && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>محفوظ سحابياً ✓</span>
                </span>
              )}
              {cloudSyncStatus === 'offline' && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>محفوظ محلياً (مسودة)</span>
                </span>
              )}
            </div>

            {/* زر نافذة اختيار السنة والقسم التفاعلية وفق القرارات الرسمية */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsClassSelectorOpen(true)}
                className="bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black text-xs sm:text-sm rounded-xl px-3 py-1.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 transition cursor-pointer shadow-xs min-h-[38px]"
                title="انقر لاختيار السنة الدراسية والقسم"
              >
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-xs">{activeClass.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white shrink-0">
                  {activeClass.level.includes('3') ? '3 AS' : activeClass.level.includes('2') ? '2 AS' : '1 AS'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setNewClassModal(true)}
                title="إضافة قسم جديد (سعة حتى 10 أقسام)"
                className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 border border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer min-h-[38px]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* شريط البحث المباشر عن اسم التلميذ في كل الأقسام */}
            <div className="relative flex-1 sm:flex-initial w-full sm:w-56 md:w-64 min-w-[140px]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث فوري عن تلميذ بحرف أو اسم..."
                  value={globalStudentSearch}
                  onChange={e => {
                    setGlobalStudentSearch(e.target.value);
                    setIsGlobalSearchActive(true);
                  }}
                  onFocus={() => setIsGlobalSearchActive(true)}
                  className="w-full pr-8 pl-7 py-1.5 text-xs bg-slate-100 hover:bg-slate-200/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl border border-slate-300 transition"
                />
                {globalStudentSearch && (
                  <button
                    onClick={() => {
                      setGlobalStudentSearch('');
                      setIsGlobalSearchActive(false);
                    }}
                    className="absolute left-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* نافذة نتائج البحث المباشر في المنصة بطبقة مخصصة علوية وتعتيم كامل للخلفية لمنع التداخل */}
              {isGlobalSearchActive && globalStudentSearch.trim() && (
                <>
                  <div
                    className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm transition-opacity animate-fadeIn"
                    onClick={() => setIsGlobalSearchActive(false)}
                  />
                  <div className="fixed top-16 md:top-20 right-3 left-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[540px] md:w-[620px] max-w-[95vw] bg-white rounded-3xl shadow-2xl border border-slate-200 z-[101] overflow-hidden text-right animate-scaleUp">
                    <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-slate-900 flex items-center gap-1.5 text-sm">
                          <Search className="w-4 h-4 text-blue-600" />
                          <span>نتائج البحث الفوري عن:</span>
                          <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-mono text-xs shadow-xs">
                            «{globalStudentSearch}»
                          </span>
                          <span className="text-blue-800 font-black">({globalSearchResults.length} تلميذ)</span>
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-1">
                          يتم إظهار جميع التلاميذ الذين تحتوي أسماؤهم على هذا الحرف فوراً في طبقة معزولة.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsGlobalSearchActive(false)}
                        className="text-slate-500 hover:text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition cursor-pointer"
                      >
                        إغلاق ✕
                      </button>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100 touch-scroll">
                    {globalSearchResults.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                        <p className="font-bold text-slate-700">لم يتم العثور على أي تلميذ يتضمن اسمه "{globalStudentSearch}"</p>
                        <p className="text-[11px] text-slate-400">تأكد من الحرف المدخل أو جرب البحث بجزء آخر من الاسم</p>
                      </div>
                    ) : (
                      globalSearchResults.map(st => {
                        const avg = calcStudentAverage(st, st.hasTP);
                        const targetCls = classes.find(c => c.id === st.classId) || activeClass;
                        return (
                          <div
                            key={`${st.classId}-${st.id}`}
                            onClick={() => {
                              setSelectedStudentForDetails({ student: st, classInfo: targetCls });
                              setIsGlobalSearchActive(false);
                            }}
                            className="p-3 hover:bg-blue-50/70 transition flex flex-col gap-2 cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <span className="font-black text-slate-900 text-sm group-hover:text-blue-700 transition flex items-center gap-1.5">
                                  <HighlightMatch text={`${st.lastName} ${st.firstName}`} query={globalStudentSearch} />
                                </span>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-800 px-2 py-0.5 rounded-lg font-bold text-[10px]">
                                    {st.className}
                                  </span>
                                  <span className="font-mono text-blue-600 font-bold text-[10px]">
                                    كود: <HighlightMatch text={st.parentCode} query={globalStudentSearch} />
                                  </span>
                                  {st.coordinationStatus === 'urgent' && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                                      ⚠️ استدعاء الولي
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-left font-mono shrink-0">
                                <span className={`text-xs font-black px-2 py-1 rounded-lg ${avg >= 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  {avg} <span className="text-[9px] font-sans text-slate-500">/20</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForDetails({ student: st, classInfo: targetCls });
                                  setIsGlobalSearchActive(false);
                                }}
                                className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>معاينة البطاقة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openCoordinationModal(st, st.classId)}
                                className="py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                              >
                                <HeartHandshake className="w-3 h-3" />
                                <span>التنسيق</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveClassId(st.classId);
                                  setActiveTab('classes');
                                  setIsGlobalSearchActive(false);
                                }}
                                className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                              >
                                فتح في {st.className}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setActiveTab('timetable')}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">جدول التوقيت</span>
            </button>
            <button
              onClick={() => window.print()}
              title="طباعة الصفحة الحالية"
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">طباعة</span>
            </button>
            <button
              onClick={() => setActiveTab('inclass')}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-sm transition max-w-[200px] sm:max-w-none"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">
                دخول الحصة المباشرة <span className="hidden sm:inline">{activeClass.name.includes('(') ? activeClass.name : `(${activeClass.name})`}</span>
              </span>
            </button>

            {/* بطاقة الحساب وتسجيل الخروج في الهيدر */}
            <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2 border-r border-slate-200">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {currentUser?.name?.[0] || 'D'}
                </div>
                <div className="hidden xl:block text-right">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>{currentUser?.name || teacherProfile.name}</span>
                    {currentUser?.isAdmin && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded">
                        مشرف
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{currentUser?.email}</div>
                </div>
              </div>

              {(currentUser?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || localStorage.getItem('smart_notebook_is_admin_device') === 'true' || currentUser?.isAdmin) && (
                <button
                  onClick={() => setIsAdminManagerOpen(true)}
                  title="لوحة تحكم المشرف وإدارة اشتراكات الأساتذة"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">لوحة المشرف</span>
                </button>
              )}

              <button
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'التحويل للوضع النهاري (الضوء)' : 'التحويل للوضع الليلي (مريح للعين)'}
                className={`p-1.5 sm:p-2 rounded-xl transition cursor-pointer flex items-center justify-center ${
                  darkMode
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />}
              </button>

              <button
                onClick={() => setShowSettingsModal(true)}
                title="إعدادات الأستاذ والمادة والأقسام ⚙️"
                className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={() => setIsParentPreviewOpen(true)}
                title="معاينة فضاء أولياء التلاميذ بالكود"
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition hidden sm:flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>بوابة الأولياء</span>
              </button>

              <button
                onClick={handleLogout}
                title="تسجيل الخروج"
                className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* الشاشات */}
        <main className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6">

          {/* تنبيه الأقسام الفارغة للأستاذ العادي */}
          {classes.length === 0 && (
            <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4 max-w-xl mx-auto my-6 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <School className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">لم تضف أي قائمة تلاميذ بعد</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  بدء استخدام الدفتر يتطلب إعداد أقسامك واستيراد أو إضافة قوائم تلاميذك.
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة أول قائمة / تهيئة الأقسام</span>
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* واجهة عصرية معبرة للدفتر الذكي مع خلفية بيداغوجية تفاعلية */}
              <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl border border-slate-800">
                {/* طبقة الخلفية التعبيرية المستوحاة من بيئة التدريس والمخبر الرقمي */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
                  <svg className="w-full h-full object-cover" viewBox="0 0 1200 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#0f172a" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.85" />
                      </linearGradient>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                      </pattern>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    <rect width="1200" height="600" fill="url(#bgGrad)" />
                    <rect width="1200" height="600" fill="url(#grid)" />

                    {/* أشكال هندسية وتدرجات ضوئية عصرية */}
                    <circle cx="950" cy="180" r="160" fill="#2563eb" opacity="0.25" filter="url(#glow)" />
                    <circle cx="200" cy="450" r="140" fill="#059669" opacity="0.2" filter="url(#glow)" />
                    <circle cx="700" cy="500" r="120" fill="#f59e0b" opacity="0.15" filter="url(#glow)" />

                    {/* رسم تعبيري للسبورة الذكية والمكتب البيداغوجي */}
                    <g stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none">
                      {/* خطوط بيانية للمنحنيات والنتائج */}
                      <path d="M 100 480 Q 250 320 400 390 T 700 280 T 1000 220" stroke="#38bdf8" strokeWidth="3" opacity="0.6" />
                      <path d="M 100 520 Q 300 420 500 440 T 800 350 T 1100 290" stroke="#34d399" strokeWidth="2" strokeDasharray="6 6" opacity="0.5" />
                      
                      {/* إحداثيات ومخطط الطاولات الرقمي في الخلفية */}
                      <rect x="820" y="80" width="300" height="200" rx="16" fill="rgba(15, 23, 42, 0.6)" stroke="#3b82f6" strokeWidth="2" opacity="0.7" />
                      <line x1="840" y1="130" x2="1100" y2="130" stroke="rgba(255,255,255,0.15)" />
                      <line x1="840" y1="170" x2="1060" y2="170" stroke="rgba(255,255,255,0.15)" />
                      <line x1="840" y1="210" x2="1080" y2="210" stroke="rgba(255,255,255,0.15)" />

                      {/* رموز علمية وبيداغوجية رمزية */}
                      <circle cx="870" cy="110" r="12" fill="#3b82f6" opacity="0.6" />
                      <circle cx="920" cy="110" r="12" fill="#10b981" opacity="0.6" />
                      <circle cx="970" cy="110" r="12" fill="#f59e0b" opacity="0.6" />
                    </g>
                  </svg>
                </div>

                {/* طبقة التدرج اللوني فوق الرسم لمطالعة مريحة وعصرية */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none"></div>

                {/* المحتوى التفاعلي والمعلومات التفصيلية عن الدفتر الذكي */}
                <div className="relative p-6 sm:p-8 space-y-6 z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>المنصة البيداغوجية المتكاملة • الطور الثانوي الجزائري 2026/2027</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/70">
                      <School className="w-3.5 h-3.5 text-blue-400" />
                      <span>{teacherProfile.highSchool}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-emerald-400 font-bold">{teacherProfile.subject}</span>
                    </div>
                  </div>

                  <div className="max-w-3xl space-y-2">
                    <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                      دفتر الأستاذ الذكي - الإدارة البيداغوجية الرقمية المتطورة
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      بيئة عمل بيداغوجية متكاملة مصممة خصيصاً لمرافقة أستاذ التعليم الثانوي في الجزائر، تجمع بين تسيير الحصة المباشرة، التدرج السنوي، مخطط الطاولات التفاعلي، مصفوفة التنقيط المتوافقة مع الرقمنة، والتحليل الإحصائي الدقيق للأفواج والتلاميذ.
                    </p>
                  </div>

                  {/* بطاقات ميزات ومعلومات الدفتر الذكي (تصميم زجاجي عصري) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-400 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-white">وضع الحصة المباشر والمخطط</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        مخطط طاولات تفاعلي ديناميكي، رصد الحضور والتأخر بنقرة واحدة، قرعة السبورة العشوائية، ومؤقت الحصة المدمج.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-white">جدول التوقيت الأسبوعي (8 - 17)</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        توزيع أسبوعي شامل ومطابق للتوقيت الثانوي الجزائري مع مراعاة استراحة الغداء وتعديل الحصص والقاعات يدوياً.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/30 text-purple-400 flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-white">التدرج والمذكرات البيداغوجية</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        مناهج وزارية رسمية محملة مسبقاً، توليد آلي للمذكرات بالكفاءات والأهداف، مع إمكانية إضافة مذكرات شخصية.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-600/30 border border-amber-400/30 text-amber-400 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-white">الإحصائيات ومقارنة الأفواج</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        مقارنة تفاضلية ذكية بين الفوج 1 والفوج 2 مع تمييز التفوق، رصد المعالجة البيداغوجية، وإنذارات للغيابات المتكررة.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-rose-600/30 border border-rose-400/30 text-rose-400 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-white">مصفوفة التنقيط والرقمنة</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        حساب فوري للمعدل الفصلي (تقويم، TP، فروض، اختبار) مع تصدير واستيراد متوافق مع متطلبات الأرضية الرقمية.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-400 flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-white">البطاقة البيداغوجية الفردية</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        تشخيص دقيق لنقاط قوة وضعف كل تلميذ، اقتراح خطط المعالجة، وإمكانية طباعة تقارير فردية قابلة للأرشفة.
                      </p>
                    </div>
                  </div>

                  {/* أزرار الانتقال السريع */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
                    <button
                      onClick={() => setActiveTab('inclass')}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>دخول الحصة المباشرة {activeClass.name.includes('(') ? activeClass.name : `(${activeClass.name})`} ←</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('timetable')}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>جدول التوقيت الأسبوعي</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('analytics')}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700 flex items-center gap-1.5"
                    >
                      <BarChart3 className="w-4 h-4 text-amber-400" />
                      <span>قسم الإحصائيات والقوائم</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('curriculum')}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <span>التدرج السنوي والمذكرات</span>
                    </button>

                    {(currentUser?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || localStorage.getItem('smart_notebook_is_admin_device') === 'true' || currentUser?.isAdmin) && (
                      <button
                        onClick={() => setIsAdminManagerOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs transition border border-emerald-400/40 flex items-center gap-1.5 shadow-lg shadow-emerald-700/25 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-200" />
                        <span>لوحة تحكم المشرف وإدارة الاشتراكات</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* بطاقات الإحصائيات العامة السريعة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">المادة المسندة</p>
                    <p className="text-xl font-bold text-slate-800">{teacherProfile.subject}</p>
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>{activeClasses.length} أقسام نشطة</span>
                      {archivedClasses.length > 0 && (
                        <span
                          onClick={() => {
                            setActiveTab('classes');
                            setClassesManagementMode('archive');
                          }}
                          className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] cursor-pointer hover:bg-amber-200 transition"
                        >
                          📦 +{archivedClasses.length} في الأرشيف
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">متوسط قسم {activeClass.name}</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {(activeClass.students.reduce((a, s) => a + calcStudentAverage(s, activeClass.hasTP), 0) / (activeClass.students.length || 1)).toFixed(2)}
                      <span className="text-sm font-normal text-slate-400"> / 20</span>
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">حساب آلي وفق الرقمنة</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">الحصص الأسبوعية النشطة</p>
                    <p className="text-2xl font-bold text-slate-800">{activeTimetableSessions.length} حصص</p>
                    <p className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline" onClick={() => setActiveTab('timetable')}>
                      جدول 8:00 إلى 17:00 ←
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">طاولات مخطط الجلوس</p>
                    <p className="text-2xl font-bold text-slate-800">{totalDesksCount} مقعد</p>
                    <p className="text-xs text-emerald-600 mt-1">قابلة للزيادة والتعديل</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Grid className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* روابط سريعة للأقسام ورادار اليقظة */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span>الحصص المبرمجة لليوم في جدول التوقيت</span>
                    </h2>
                    <button
                      onClick={() => setActiveTab('timetable')}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      فتح جدول التوقيت الأسبوعي كاملاً ←
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeTimetableSessions.slice(0, 4).map(sess => (
                      <div
                        key={sess.id}
                        onClick={() => handleSlotClick(sess.day, sess.startTime, sess)}
                        className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 transition cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800">{sess.className}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold">{sess.type}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center justify-between">
                          <span>{sess.day} ({sess.startTime} - {sess.endTime})</span>
                          <span>📍 {sess.room}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                  <h2 className="font-bold text-slate-800 dark:text-white flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <span>رادار اليقظة البيداغوجية {activeClass.name.includes('(') ? activeClass.name : `(${activeClass.name})`}</span>
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    تلاميذ بحاجة لمتابعة ومعالجة وتوثيق غياباتهم في قسم {activeClass.name}:
                  </p>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto">
                    {activeClass.students
                      .filter(s => s.absencesCount >= 1 || s.test2 - s.test1 < -2 || s.bonusPoints < 0)
                      .map(st => {
                        const absenceLogs = st.logs.filter(l => l.type === 'absence');
                        const justifiedCount = absenceLogs.filter(l => l.absenceType === 'justified').length;
                        const unjustifiedCount = absenceLogs.filter(l => l.absenceType !== 'justified').length;

                        return (
                          <div
                            key={st.id}
                            className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-xs space-y-2 transition"
                          >
                            <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100">
                              <span>{st.lastName} {st.firstName}</span>
                              <span className="text-rose-600 dark:text-rose-400 font-mono">{calcStudentAverage(st, activeClass.hasTP)} / 20</span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between flex-wrap gap-1">
                              {st.absencesCount > 0 && (
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  • {st.absencesCount} غيابات ({unjustifiedCount} غير مبرر ❌، {justifiedCount} مبرر ✅)
                                </span>
                              )}
                              {st.test2 < st.test1 && <span>• تراجع في الفرض 2</span>}
                              
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAbsenceJustificationStudent(st);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                              >
                                <FileUp className="w-3 h-3" />
                                <span>تحديد نوع الغياب والتبرير الرقمي 📷</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              الشاشة 2: جدول التوقيت التفاعلي
              - جدول التوقيت العام
              - جدول توقيت المادة لكل قسم لوحده
              - إضافة وعرض ملاحظات الحصص والأقسام عند الضغط على الحصة
          ========================================================= */}
          {activeTab === 'timetable' && (
            <div className="space-y-5">
              {/* شريط التحكم وتبديل العرض بين الجدول العام وجدول القسم لوحده */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-black text-slate-800 text-xl flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-blue-600" />
                      <span>جدول التوقيت الأسبوعي التفاعلي (من 08:00 إلى 17:00)</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      اضغط مباشرة على <strong>أي حصة</strong> لعرض وتعديل تفاصيلها وإضافة ملاحظات خاصة بالقسم والحصة.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => handleSlotClick('الأحد', '08:00')}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة حصة</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة الجدول</span>
                    </button>
                  </div>
                </div>

                {/* أزرار التبديل: الجدول العام مقابل جدول كل قسم لوحده */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setTimetableActiveView('general')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                        timetableActiveView === 'general'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>📅 جدول التوقيت الأسبوعي العام (كافة الأقسام)</span>
                    </button>
                    <button
                      onClick={() => {
                        setTimetableActiveView('byClass');
                        if (!timetableClassFilter && activeClasses.length > 0) {
                          setTimetableClassFilter(activeClasses[0].name);
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                        timetableActiveView === 'byClass'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>🎯 جدول توقيت المادة لكل قسم لوحده</span>
                    </button>
                  </div>

                  {/* في حالة عرض القسم لوحده: اختيار القسم وإظهار بياناته */}
                  {timetableActiveView === 'byClass' && (
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-950">
                      <span className="text-xs font-bold">عرض جدول قسم:</span>
                      <select
                        value={timetableClassFilter || activeClass.name}
                        onChange={e => setTimetableClassFilter(e.target.value)}
                        className="bg-transparent font-black text-xs text-indigo-900 focus:outline-none cursor-pointer"
                      >
                        {activeClasses.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.name} ({c.level} - {c.stream})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* بطاقة معلومات الحجم الساعي للقسم عند تفعيل العرض الفردي للقسم */}
                {timetableActiveView === 'byClass' && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-indigo-500/10 border border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                        {timetableClassFilter || activeClass.name}
                      </div>
                      <div>
                        <strong className="text-indigo-950 font-black text-sm block">
                          جدول توقيت مادة {teacherProfile.subject} الخاص بقسم {timetableClassFilter || activeClass.name}
                        </strong>
                        <span className="text-indigo-800 text-[11px]">
                          يظهر فقط الحصص المبرمجة لهذا القسم مع قاعة التدريس والملاحظات الخاصة بالحصة.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-bold font-mono">
                      {(() => {
                        const targetName = timetableClassFilter || activeClass.name;
                        const classSessions = activeTimetableSessions.filter(s => s.className === targetName);
                        return (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-900">
                              عدد الحصص: <strong>{classSessions.length}</strong> حصة أسبوعياً
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-900">
                              الحجم الساعي: <strong>{classSessions.length}</strong> ساعات
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* أزرار التبديل بين العرض اليومي للهاتف والجدول الأسبوعي الكامل */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setTimetableDisplayMode('dayList');
                        if (timetableDayFilter === 'all') setTimetableDayFilter('الأحد');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        timetableDisplayMode === 'dayList'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>📱 عرض اليوم لكل عمود على حدة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTimetableDisplayMode('fullGrid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        timetableDisplayMode === 'fullGrid'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>📅 شبكة الجدول الأسبوعي كاملة</span>
                    </button>
                  </div>

                  {/* شريط الفلترة واختيار اليوم */}
                  <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll pb-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">الأيام:</span>
                    {(['all', ...DAYS_OF_WEEK] as const).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setTimetableDayFilter(d);
                          if (d !== 'all') setTimetableDisplayMode('dayList');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition cursor-pointer ${
                          timetableDayFilter === d
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {d === 'all' ? 'جميع الأيام' : d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* نمط العرض 1: العمود اليومي المنفصل المخصص للهواتف المحمولة */}
              {(timetableDisplayMode === 'dayList' || timetableDayFilter !== 'all') ? (
                <div className="space-y-4">
                  {/* هيدر اليوم وشريط التنقل بالأسهم بين الأيام */}
                  {(() => {
                    const activeDayIndex = DAYS_OF_WEEK.indexOf(
                      (timetableDayFilter !== 'all' ? timetableDayFilter : 'الأحد') as any
                    );
                    const currentDayName = DAYS_OF_WEEK[activeDayIndex >= 0 ? activeDayIndex : 0];
                    const prevDayName = DAYS_OF_WEEK[(activeDayIndex - 1 + DAYS_OF_WEEK.length) % DAYS_OF_WEEK.length];
                    const nextDayName = DAYS_OF_WEEK[(activeDayIndex + 1) % DAYS_OF_WEEK.length];

                    return (
                      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setTimetableDayFilter(prevDayName);
                            setTimetableDisplayMode('dayList');
                          }}
                          className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4 text-blue-400" />
                          <span className="hidden sm:inline">{prevDayName}</span>
                          <span className="sm:hidden">السابق</span>
                        </button>

                        <div className="text-center">
                          <span className="text-[11px] text-blue-400 font-bold block">برنامج الحصص لليوم:</span>
                          <h3 className="text-lg sm:text-2xl font-black tracking-wide text-white">
                            {currentDayName}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setTimetableDayFilter(nextDayName);
                            setTimetableDisplayMode('dayList');
                          }}
                          className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span className="hidden sm:inline">{nextDayName}</span>
                          <span className="sm:hidden">التالي</span>
                          <ChevronLeft className="w-4 h-4 text-blue-400" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* قائمة الحصص اليومية بتصميم بطاقات تفاعلية واضحة للهاتف */}
                  <div className="space-y-3">
                    {(() => {
                      const currentDay = timetableDayFilter !== 'all' ? timetableDayFilter : 'الأحد';
                      return TIME_SLOTS.map((slot, slotIdx) => {
                        const targetClassName = timetableClassFilter || activeClass.name;
                        const rawSession = activeTimetableSessions.find(
                          s => s.day === currentDay && s.startTime === slot.start
                        );
                        const matchesCurrentClass = rawSession && rawSession.className === targetClassName;
                        const isByClassMode = timetableActiveView === 'byClass';
                        const session = isByClassMode ? (matchesCurrentClass ? rawSession : null) : rawSession;

                        return (
                          <div
                            key={slotIdx}
                            onClick={() => {
                              if (rawSession) {
                                handleSlotClick(currentDay as any, slot.start, rawSession);
                              } else {
                                handleSlotClick(currentDay as any, slot.start);
                              }
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                              session
                                ? session.type.includes('TP')
                                  ? 'bg-purple-900/10 border-purple-500/40 hover:border-purple-500'
                                  : session.type.includes('معالجة')
                                  ? 'bg-rose-900/10 border-rose-500/40 hover:border-rose-500'
                                  : session.type.includes('فرض')
                                  ? 'bg-amber-900/10 border-amber-500/40 hover:border-amber-500'
                                  : 'bg-blue-900/10 border-blue-500/40 hover:border-blue-500'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono font-black text-xs shrink-0 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                                  <span>{slot.label}</span>
                                </div>

                                {session ? (
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-black text-base text-slate-900 dark:text-white">
                                        {session.className}
                                      </h4>
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                        {session.groupType}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        📍 {session.room}
                                      </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                                      {session.type}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-slate-400">فترة حرة — لا توجد حصة مبرمجة</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {session ? (
                                  <button
                                    type="button"
                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>تعديل الحصة والملاحظات</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white text-xs font-bold transition flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>إضافة حصة</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {session?.notes && (
                              <div className="mt-3 p-2.5 rounded-xl bg-white/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                <span className="font-bold text-blue-500">📝 ملاحظات الحصة والقسم:</span> {session.notes}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                /* نمط العرض 2: شبكة جدول التوقيت الكاملة بخط كبير وأنيق مع التمرير الناعم */
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-md overflow-x-auto touch-scroll">
                  <table className="w-full text-center border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-900 text-white text-xs sm:text-sm font-black tracking-wide">
                        <th className="py-3.5 px-3 w-28 border-l border-slate-800">اليوم</th>
                        {TIME_SLOTS.map((slot, idx) => (
                          <th key={idx} className="py-3.5 px-2 border-l border-slate-800 last:border-l-0 text-xs sm:text-sm font-black whitespace-nowrap">
                            {slot.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 dark:divide-slate-800 text-xs">
                      {DAYS_OF_WEEK.map(day => (
                        <tr key={day} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                          <td className="py-4 px-3 font-black text-slate-900 dark:text-white text-sm sm:text-base bg-slate-100/90 dark:bg-slate-800/90 border-l border-slate-300 dark:border-slate-800">
                            {day}
                          </td>
                          {TIME_SLOTS.map((slot, slotIdx) => {
                            const targetClassName = timetableClassFilter || activeClass.name;
                            const rawSession = activeTimetableSessions.find(
                              s => s.day === day && s.startTime === slot.start
                            );
                            const matchesCurrentClass = rawSession && rawSession.className === targetClassName;
                            const isByClassMode = timetableActiveView === 'byClass';
                            const session = isByClassMode ? (matchesCurrentClass ? rawSession : null) : rawSession;
                            const isOtherClassInByClassMode = isByClassMode && rawSession && !matchesCurrentClass;

                            return (
                              <td
                                key={slotIdx}
                                onClick={() => {
                                  if (rawSession) {
                                    handleSlotClick(day, slot.start, rawSession);
                                  } else {
                                    handleSlotClick(day, slot.start);
                                  }
                                }}
                                className={`p-1.5 border-l border-slate-200 dark:border-slate-800 last:border-l-0 align-top h-28 sm:h-32 cursor-pointer transition ${
                                  session ? 'hover:bg-blue-50/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                } ${isOtherClassInByClassMode ? 'opacity-40' : ''}`}
                              >
                                {session ? (
                                  <div
                                    className={`h-full p-2.5 rounded-2xl border-2 text-right transition flex flex-col justify-between shadow-sm hover:shadow-md hover:scale-[1.02] ${
                                      session.type.includes('TP')
                                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-200'
                                        : session.type.includes('معالجة')
                                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-200'
                                        : session.type.includes('فرض')
                                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200'
                                        : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-black text-sm sm:text-base leading-tight flex items-center justify-between">
                                        <span className="font-extrabold">{session.className}</span>
                                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                                          {session.groupType}
                                        </span>
                                      </div>
                                      <div className="text-xs sm:text-sm mt-1 font-bold truncate">
                                        {session.type}
                                      </div>

                                      {session.notes && (
                                        <div className="mt-1.5 p-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-black/10 text-[11px] font-bold line-clamp-2">
                                          📝 {session.notes}
                                        </div>
                                      )}
                                    </div>

                                    <div className="text-xs font-semibold flex items-center justify-between mt-1 pt-1 border-t border-black/10">
                                      <span>📍 {session.room}</span>
                                      <span className="text-[11px] font-black underline">تعديل ✏️</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 text-xs font-semibold hover:border-blue-400 hover:text-blue-600 transition">
                                    <Plus className="w-4 h-4 opacity-50 mb-0.5" />
                                    <span>+ إضافة</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              الشاشة 3: وضع داخل القسم ومخطط الجلوس
              [تعديل 5: يمكن إضافة الطاولات في مخطط الجلوس]
          ========================================================= */}
          {activeTab === 'inclass' && (
            <div className="space-y-4">
              {/* شريط التبديل بين واجهة اللمس السريع للهاتف ومخطط الطاولات (المرحلة 3) */}
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    {activeClass.name}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-white block">إدارة الحصة المباشرة ({activeClass.level})</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">مادة {teacherProfile.subject}</span>
                  </div>
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInClassView('touch')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      inClassView === 'touch'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>أزرار اللمس (للهاتف)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInClassView('seating')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      inClassView === 'seating'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">مخطط الطاولات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInClassView('list')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      inClassView === 'list'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">القائمة التقليدية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInClassView('3dLab')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      inClassView === '3dLab'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">المخبر 3D</span>
                  </button>
                </div>
              </div>

              {inClassView === 'touch' ? (
                <InClassManagerMobile
                  activeClass={activeClass}
                  students={activeClass.students}
                  curriculum={curriculum}
                  onUpdateStudents={(updated) => {
                    setClasses(prev => prev.map(c => c.id === activeClass.id ? { ...c, students: updated } : c));
                  }}
                  onOpenClassSelector={() => setIsClassSelectorOpen(true)}
                  onOpenStudentDetails={(st) => setSelectedStudentForDetails({ student: st, classInfo: activeClass })}
                  teacherSubject={teacherProfile.subject}
                  onSaveNotice={(msg) => showNotice(msg)}
                />
              ) : inClassView === '3dLab' ? (
                <Classroom3DLab
                  activeClass={activeClass}
                  onSelectStudent={(st) => setSelectedStudentForDetails({ student: st, classInfo: activeClass })}
                  onClose={() => setInClassView('seating')}
                />
              ) : (
                <div className="space-y-5">
                  {/* شريط الأدوات العلوية للحصة */}
                  <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold">
                    {activeClass.name}
                  </div>
                  <div>
                    <div className="text-xs text-blue-200">الدرس المبرمج في التدرج الوزاري:</div>
                    <div className="text-sm font-bold text-white">
                      {curriculum.find(u => u.level === activeClass.level && u.status === 'in-progress')?.title || 'وحدة تعليمية جارية'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                    <button
                      onClick={runRandomPicker}
                      disabled={isPicking}
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition"
                    >
                      <Shuffle className={`w-3.5 h-3.5 ${isPicking ? 'animate-spin' : ''}`} />
                      <span>قرعة السبورة</span>
                    </button>
                    {pickedStudent && (
                      <span className="text-xs bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md font-bold">
                        {pickedStudent.lastName} {pickedStudent.firstName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-mono text-sm font-bold text-white">{formatTimer(timerSeconds)}</span>
                    <button
                      onClick={() => setTimerActive(!timerActive)}
                      className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs"
                    >
                      {timerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => { setTimerActive(false); setTimerSeconds(600); }}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* أزرار إدارة مخطط الجلوس وإضافة الطاولات [تعديل 5] */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
                    <button
                      onClick={() => setGroupFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition ${groupFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                    >
                      كل القسم ({activeClass.students.length})
                    </button>
                    <button
                      onClick={() => setGroupFilter(1)}
                      className={`px-3 py-1.5 rounded-lg transition ${groupFilter === 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                    >
                      فوج 1 ({activeClass.students.filter(s => s.group === 1).length})
                    </button>
                    <button
                      onClick={() => setGroupFilter(2)}
                      className={`px-3 py-1.5 rounded-lg transition ${groupFilter === 2 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                    >
                      فوج 2 ({activeClass.students.filter(s => s.group === 2).length})
                    </button>
                  </div>

                  <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
                    <button
                      onClick={() => setInClassView('seating')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${inClassView === 'seating' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>مخطط الطاولات ({totalDesksCount})</span>
                    </button>
                    <button
                      onClick={() => setInClassView('list')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${inClassView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>القائمة</span>
                    </button>
                  </div>

                  {/* [تعديل 5: زر إضافة الطاولات في مخطط الجلوس] */}
                  {inClassView === 'seating' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleAddDesk}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                        title="إضافة 4 طاولات جديدة لمخطط القسم"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة طاولات (+)</span>
                      </button>
                      <button
                        onClick={handleRemoveDesk}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                        title="إنقاص الطاولات الشاغرة"
                      >
                        - إنقاص
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingSeating(!isEditingSeating);
                          setDraggingSeatIdx(null);
                          setDragOverSeatIdx(null);
                        }}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          isEditingSeating
                            ? 'bg-amber-500 text-slate-900 border-amber-600'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isEditingSeating ? '✓ إنهاء وضع السحب' : 'سحب وإفلات المقاعد'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="ابحث بحرف أو اسم (مثال: م)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pr-8 pl-8 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 transition"
                      title="مسح البحث"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* شريط الإشعار بنتائج البحث السريع بالحرف مع أزرار الانتقال الفوري للتلاميذ */}
              {searchQuery.trim() && (
                <div className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 shadow-xs text-xs animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-400 text-amber-950 font-black flex items-center justify-center shrink-0 shadow-xs">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <span className="font-black text-amber-950">
                        نتائج البحث بالحرف «{searchQuery}»:
                      </span>{' '}
                      <span className="font-bold text-amber-800">
                        ({inClassMatchingStudents.length} تلميذ يتضمن اسمهم هذا الحرف)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {inClassMatchingStudents.map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(st.id);
                          setSelectedStudentForDetails({ student: st, classInfo: activeClass });
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs ${
                          selectedStudent?.id === st.id
                            ? 'bg-amber-500 text-slate-900 ring-2 ring-amber-600'
                            : 'bg-white border border-amber-300 text-amber-950 hover:bg-amber-100'
                        }`}
                      >
                        <span>{st.lastName} {st.firstName}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-mono font-bold">
                          طاولة #{st.seatIndex + 1}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-2 py-1 text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer"
                    >
                      إلغاء ✕
                    </button>
                  </div>
                </div>
              )}

              {/* شبكة الطاولات الديناميكية */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  {inClassView === 'seating' && (
                    <div className="mb-6">
                      <div className="w-full sm:w-3/4 mx-auto py-2.5 bg-slate-800 text-slate-200 text-center text-xs font-bold rounded-2xl shadow-inner border border-slate-700 flex items-center justify-center gap-2">
                        <span>🖥️ السبورة ومكتب الأستاذ</span>
                        <span className="text-[11px] text-blue-300 font-normal">
                          (سعة القسم: {totalDesksCount} مقعد • المشغول: {activeClass.students.length} • الشاغر: {totalDesksCount - activeClass.students.length})
                        </span>
                      </div>
                    </div>
                  )}

                  {inClassView === 'seating' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                      {Array.from({ length: totalDesksCount }).map((_, seatIdx) => {
                        const st = activeClass.students.find(s => s.seatIndex === seatIdx);
                        const isSelected = selectedStudent?.id === st?.id;
                        const isDropTarget = dragOverSeatIdx === seatIdx && draggingSeatIdx !== null && draggingSeatIdx !== seatIdx;
                        const hasActiveSearch = Boolean(searchQuery.trim());

                        if (!st) {
                          return (
                            <div
                              key={seatIdx}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (dragOverSeatIdx !== seatIdx) setDragOverSeatIdx(seatIdx);
                              }}
                              onDragLeave={() => {
                                if (dragOverSeatIdx === seatIdx) setDragOverSeatIdx(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const fromSeatStr = e.dataTransfer.getData('text/plain');
                                const fromSeat = parseInt(fromSeatStr, 10);
                                if (!isNaN(fromSeat)) {
                                  handleSeatDrop(fromSeat, seatIdx);
                                }
                              }}
                              onClick={() => handleSeatClick(seatIdx)}
                              className={`p-3.5 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center text-center h-28 cursor-pointer ${
                                isDropTarget
                                  ? 'border-blue-500 bg-blue-100/80 ring-2 ring-blue-400 scale-[1.02]'
                                  : isEditingSeating
                                  ? 'border-blue-300 bg-blue-50/30 hover:bg-blue-50/60'
                                  : hasActiveSearch
                                  ? 'border-slate-200 bg-slate-50/20 text-slate-300 opacity-25'
                                  : 'border-slate-200 bg-slate-50/40 text-slate-400 hover:border-blue-300'
                              }`}
                            >
                              <span className="text-xs font-bold text-slate-400">طاولة #{seatIdx + 1}</span>
                              <span className="text-[10px] text-slate-400 mt-1">
                                {isDropTarget ? 'أفلت البطاقة هنا' : isEditingSeating ? 'اسحب وأفلت هنا' : 'شاغر (اسحب تلميذاً هنا)'}
                              </span>
                            </div>
                          );
                        }

                        const isMatchSearch = Boolean(hasActiveSearch && matchesStudentQuery(st, searchQuery));
                        const statusColor =
                          isDropTarget
                            ? 'border-blue-600 bg-blue-100/90 ring-2 ring-blue-400 scale-[1.02]'
                            : isMatchSearch
                            ? 'border-amber-500 bg-amber-100/90 ring-4 ring-amber-400 shadow-xl scale-[1.03] z-10'
                            : hasActiveSearch
                            ? 'border-slate-200 bg-slate-50/30 opacity-30 grayscale-[0.6] hover:opacity-100 hover:grayscale-0'
                            : st.attendance === 'absent'
                            ? 'border-rose-300 bg-rose-50/70'
                            : st.attendance === 'late'
                            ? 'border-amber-300 bg-amber-50/70'
                            : isSelected
                            ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-slate-50/70 hover:border-blue-300';

                        return (
                          <div
                            key={st.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', seatIdx.toString());
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggingSeatIdx(seatIdx);
                            }}
                            onDragEnd={() => {
                              setDraggingSeatIdx(null);
                              setDragOverSeatIdx(null);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverSeatIdx !== seatIdx) setDragOverSeatIdx(seatIdx);
                            }}
                            onDragLeave={() => {
                              if (dragOverSeatIdx === seatIdx) setDragOverSeatIdx(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const fromSeatStr = e.dataTransfer.getData('text/plain');
                              const fromSeat = parseInt(fromSeatStr, 10);
                              if (!isNaN(fromSeat)) {
                                handleSeatDrop(fromSeat, seatIdx);
                              }
                            }}
                            onClick={() => handleSeatClick(seatIdx, st)}
                            className={`p-3.5 rounded-2xl border-2 transition cursor-grab active:cursor-grabbing hover:scale-[1.01] flex flex-col justify-between ${statusColor} ${
                              draggingSeatIdx === seatIdx ? 'opacity-40 scale-95 border-amber-500' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                {isMatchSearch && (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 font-black text-[10px] mb-1 shadow-xs">
                                    ⭐ متطابق مع «{searchQuery}»
                                  </span>
                                )}
                                <div className="font-bold text-slate-800 text-sm leading-snug">
                                  <HighlightMatch text={`${st.lastName} ${st.firstName}`} query={searchQuery} />
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <span>فوج {st.group}</span>
                                  <span>• مقعد {seatIdx + 1}</span>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  st.bonusPoints > 0
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : st.bonusPoints < 0
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {st.bonusPoints > 0 ? `+${st.bonusPoints}` : st.bonusPoints}
                              </span>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-1">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  applyPointsDelta(st.id, 0.5, 'مشاركة وإجابة صحيحة في القسم');
                                }}
                                className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                              >
                                +0.5
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  applyPointsDelta(st.id, -0.5, 'تشويش أو عدم إحضار الأدوات');
                                }}
                                className="flex-1 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition"
                              >
                                -0.5
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setStudentAttendance(st.id, st.attendance === 'present' ? 'absent' : 'present');
                                }}
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                                  st.attendance === 'absent'
                                    ? 'bg-rose-600 text-white border-rose-600'
                                    : 'bg-white text-slate-600 border-slate-300'
                                }`}
                              >
                                {st.attendance === 'absent' ? 'غائب' : 'حاضر'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredStudents.length === 0 ? (
                        <div className="py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2.5">
                          <Search className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-bold text-slate-700 text-sm">
                            لم يتم العثور على أي تلميذ يتضمن اسمه حرف «{searchQuery}»
                          </p>
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            مسح البحث وعرض كل القسم
                          </button>
                        </div>
                      ) : (
                        filteredStudents.map(st => (
                        <div
                          key={st.id}
                          onClick={() => {
                            setSelectedStudentId(st.id);
                            setSelectedStudentForDetails({ student: st, classInfo: activeClass });
                          }}
                          className={`p-3 rounded-xl border transition flex flex-wrap items-center justify-between gap-3 cursor-pointer ${
                            selectedStudent?.id === st.id ? 'bg-blue-50/70 border-blue-400' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                              ف{st.group}
                            </span>
                            <div>
                              <div className="font-bold text-sm text-slate-800">
                                <HighlightMatch text={`${st.lastName} ${st.firstName}`} query={searchQuery} />
                              </div>
                              <div className="text-xs text-slate-500">
                                التقويم: {calcContinuousScore(st.bonusPoints)} / 20 | الرصيد: {st.bonusPoints} | المقعد: #{st.seatIndex + 1}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); applyPointsDelta(st.id, 1, 'حل تمرين على السبورة'); }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            >
                              +1
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); applyPointsDelta(st.id, 0.5, 'مشاركة فعالة'); }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold"
                            >
                              +0.5
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); applyPointsDelta(st.id, -0.5, 'نسيان الأدوات'); }}
                              className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold"
                            >
                              -0.5
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setStudentAttendance(st.id, st.attendance === 'present' ? 'absent' : 'present');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                st.attendance === 'absent' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {st.attendance === 'absent' ? 'غائب' : 'حاضر'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  )}
                </div>

                {/* بطاقة التفاعل للتلميذ المحدد */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  {selectedStudent ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                            الفوج {selectedStudent.group} | المقعد #{selectedStudent.seatIndex + 1}
                          </span>
                          <h3 className="text-lg font-bold text-slate-800 mt-1">
                            {selectedStudent.lastName} {selectedStudent.firstName}
                          </h3>
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-slate-400">التقويم المستمر</div>
                          <div className="text-xl font-black text-blue-600">
                            {calcContinuousScore(selectedStudent.bonusPoints)}<span className="text-xs font-normal">/20</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">حالة الحضور:</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'present', label: 'حاضر ✓', style: 'bg-emerald-600 text-white border-emerald-600' },
                            { id: 'late', label: 'متأخر ⏰', style: 'bg-amber-500 text-white border-amber-500' },
                            { id: 'absent', label: 'غائب ✕', style: 'bg-rose-600 text-white border-rose-600' }
                          ].map(item => (
                            <button
                              key={item.id}
                              onClick={() => setStudentAttendance(selectedStudent.id, item.id as 'present' | 'late' | 'absent')}
                              className={`py-2 rounded-xl text-xs font-bold border transition ${
                                selectedStudent.attendance === item.id
                                  ? item.style
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">نقاط السلوك والمشاركة:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => applyPointsDelta(selectedStudent.id, 1, '🌟 بطل الحصة: حل تمرين شامل على السبورة')}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold text-right"
                          >
                            🌟 +1 بطل السبورة
                          </button>
                          <button
                            onClick={() => applyPointsDelta(selectedStudent.id, 0.5, '💡 مشاركة ذكية وإجابة موفقة')}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold text-right"
                          >
                            💡 +0.5 إجابة صحيحة
                          </button>
                          <button
                            onClick={() => applyPointsDelta(selectedStudent.id, 0.5, '📘 كراس منظم وواجب منجز')}
                            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold text-right"
                          >
                            📘 +0.5 إنجاز الواجب
                          </button>
                          <button
                            onClick={() => applyPointsDelta(selectedStudent.id, -0.5, '⚠️ عدم إحضار الأدوات المدرسية')}
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold text-right"
                          >
                            ⚠️ -0.5 نسيان الأدوات
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text" placeholder="سبب مخصص..."
                          value={customReason}
                          onChange={e => setCustomReason(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                        />
                        <button
                          onClick={() => {
                            if (customReason.trim()) {
                              applyPointsDelta(selectedStudent.id, 0.5, customReason.trim());
                              setCustomReason('');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                        >
                          تسجيل
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">آخر الأحداث المسجلة:</label>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {selectedStudent.logs.map(log => (
                            <div key={log.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">
                              <span className="text-slate-800">{log.reason}</span>
                              <span className="text-slate-400 text-[10px]">{log.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400">
                      <Users className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
                      <p className="font-bold text-slate-600 text-sm">اختر تلميذاً من المخطط</p>
                      <p className="text-xs mt-1 max-w-xs">اضغط على أي طاولة لتسجيل الحضور، الزيادة والإنقاص، والملاحظات.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

          {/* =========================================================
              الشاشة 4: إدارة القوائم والـ OCR + أرشيف الأقسام المنتهية
          ========================================================= */}
          {activeTab === 'classes' && (
            <div className="space-y-6">
              {/* شريط التحكم العلوي: تبديل بين الأقسام النشطة وخزانة أرشيف الأقسام المنتهية + زر أرشفة القسم الحالي */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    classesManagementMode === 'archive'
                      ? 'bg-amber-500 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {classesManagementMode === 'archive' ? <Archive className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                        {classesManagementMode === 'archive'
                          ? 'خزانة أرشيف الأقسام المنتهية (وضع القراءة والطباعة)'
                          : 'إدارة القوائم، المسح الضوئي الذكي (OCR)، وأرشفة الأقسام'}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {activeClasses.length} نشط • {archivedClasses.length} مؤرشف
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {classesManagementMode === 'archive'
                        ? 'تصفح واطبع قوائم ونقاط الأقسام المؤرشفة حسب الموسم الدراسي، أو استعد أي قسم للوحة القيادة النشطة بنقرة واحدة.'
                        : 'أدر قائمة التلاميذ الحالية أو انقل الأقسام المنتهية إلى الأرشيف لتنظيف لوحة القيادة وجدول التوقيت مع حفظ كافة البيانات.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* أزرار التبديل بين الأقسام النشطة وخزانة الأرشيف */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setClassesManagementMode('active')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                        classesManagementMode === 'active'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>الأقسام النشطة ({activeClasses.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClassesManagementMode('archive');
                        if (!selectedArchivedClassId && archivedClasses.length > 0) {
                          setSelectedArchivedClassId(archivedClasses[0].id);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                        classesManagementMode === 'archive'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>أرشيف الأقسام المنتهية</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                        classesManagementMode === 'archive'
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}>
                        {archivedClasses.length}
                      </span>
                    </button>
                  </div>

                  {/* زر أرشفة القسم النشط الحالي */}
                  {classesManagementMode === 'active' && activeClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openArchiveClassModal(activeClass)}
                      className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      title="نقل هذا القسم المنتهي إلى الأرشيف لتنظيف لوحة القيادة وجدول التوقيت مع حفظ كافة البيانات"
                    >
                      <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>أرشفة قسم «{activeClass.name}»</span>
                    </button>
                  )}
                </div>
              </div>

              {/* شريط اختيار سريع بين الأقسام النشطة مع زر أرشفة مباشر لكل قسم */}
              {classesManagementMode === 'active' && activeClasses.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">الأقسام النشطة في لوحة القيادة:</span>
                    {activeClasses.map(cls => {
                      const isCurr = cls.id === activeClass.id;
                      return (
                        <div
                          key={cls.id}
                          className={`inline-flex items-center rounded-xl border transition ${
                            isCurr
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveClassId(cls.id)}
                            className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{cls.name}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              isCurr ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                            }`}>
                              {cls.students.length} تلميذ
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openArchiveClassModal(cls);
                            }}
                            title={`نقل قسم ${cls.name} إلى الأرشيف`}
                            className={`p-1.5 border-r transition cursor-pointer rounded-l-xl ${
                              isCurr
                                ? 'border-blue-500 text-blue-100 hover:bg-blue-700 hover:text-amber-300'
                                : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewClassModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ قسم نشط جديد</span>
                  </button>
                </div>
              )}

              {/* في حال تم أرشفة جميع الأقسام النشطة */}
              {classesManagementMode === 'active' && activeClasses.length === 0 && (
                <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-amber-300 dark:border-amber-800 text-center space-y-4 max-w-2xl mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <Archive className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      لا توجد أقسام نشطة حالياً في لوحة القيادة
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {archivedClasses.length > 0
                        ? `لديك ${archivedClasses.length} أقسام محفوظة بأمان في خزانة الأرشيف. يمكنك استعادة أي قسم منها أو إنشاء قسم جديد للموسم الحالي.`
                        : 'يمكنك إنشاء قسم جديد للبدء في استيراد وإدارة قوائم التلاميذ.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setNewClassModal(true)}
                      className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إنشاء قسم نشط جديد</span>
                    </button>
                    {archivedClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setClassesManagementMode('archive')}
                        className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <ArchiveRestore className="w-4 h-4" />
                        <span>فتح خزانة الأرشيف ({archivedClasses.length})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* =========================================================
                  الوضع أ: خزانة أرشيف الأقسام المنتهية (للقراءة والطباعة والاستعادة)
              ========================================================= */}
              {classesManagementMode === 'archive' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* شريط الفلترة حسب الموسم الدراسي والبحث في الأرشيف */}
                  <div className="bg-amber-50/70 dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ابحث في الأرشيف باسم القسم، الشعبة، أو ملاحظة الأرشفة..."
                          value={archiveSearchQuery}
                          onChange={e => setArchiveSearchQuery(e.target.value)}
                          className="w-full pr-9 pl-8 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        {archiveSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setArchiveSearchQuery('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-300">الموسم الدراسي:</span>
                      <select
                        value={archiveYearFilter}
                        onChange={e => setArchiveYearFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-white cursor-pointer"
                      >
                        <option value="all">جميع المواسم الدراسية ({archivedClasses.length})</option>
                        {availableArchiveYears.map(yr => (
                          <option key={yr} value={yr}>
                            الموسم الدراسي {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredArchivedClasses.length === 0 ? (
                    <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <Archive className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white">
                        {archivedClasses.length === 0
                          ? 'خزانة أرشيف الأقسام فارغة حالياً'
                          : 'لا توجد أقسام مؤرشفة تطابق معايير البحث أو الموسم المحدد'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        يمكنك أرشفة أي قسم منتهٍ من تبويب «الأقسام النشطة» بالضغط على زر «أرشفة قسم» لتنظيف لوحة القيادة وجدول التوقيت مع الاحتفاظ بكامل نقاط وبيانات التلاميذ هنا.
                      </p>
                      {archivedClasses.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setClassesManagementMode('active')}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          العودة إلى الأقسام النشطة
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* شبكة بطاقات الأقسام المؤرشفة */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredArchivedClasses.map(cls => {
                          const isSelected = selectedArchivedClass?.id === cls.id;
                          const clsAvg = (
                            cls.students.reduce((sum, s) => sum + calcStudentAverage(s, cls.hasTP), 0) /
                            (cls.students.length || 1)
                          ).toFixed(2);
                          const hiddenSessionsCount = timetableSessions.filter(
                            s => s.classId === cls.id || s.className === cls.name
                          ).length;

                          return (
                            <div
                              key={cls.id}
                              onClick={() => setSelectedArchivedClassId(cls.id)}
                              className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                                isSelected
                                  ? 'bg-amber-50/60 dark:bg-slate-900 border-amber-500 ring-2 ring-amber-400/40 shadow-md'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 shadow-xs'
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-black text-base text-slate-900 dark:text-white">
                                        {cls.name}
                                      </h3>
                                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black font-mono bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        📅 الموسم: {cls.academicYear || '2026/2027'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {cls.level} • {cls.stream}
                                    </p>
                                  </div>

                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 shrink-0">
                                    <Lock className="w-3 h-3 text-amber-600" />
                                    <span>مؤرشف</span>
                                  </span>
                                </div>

                                {cls.archiveNote && (
                                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                                    <span className="font-bold text-amber-700 dark:text-amber-400">📝 ملاحظة الأرشفة: </span>
                                    <span>{cls.archiveNote}</span>
                                  </div>
                                )}

                                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 block">عدد التلاميذ</span>
                                    <strong className="font-mono font-black text-slate-800 dark:text-white">{cls.students.length}</strong>
                                  </div>
                                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 block">متوسط القسم</span>
                                    <strong className="font-mono font-black text-emerald-600 dark:text-emerald-400">{clsAvg}/20</strong>
                                  </div>
                                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 block">حصص محفوظة</span>
                                    <strong className="font-mono font-black text-blue-600 dark:text-blue-400">{hiddenSessionsCount}</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-mono text-slate-400">
                                  أُرشف يوم: {cls.archivedAt || '2026-10-20'}
                                </span>
                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedArchivedClassId(cls.id)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                                    <span>معاينة</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreArchivedClass(cls)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 shadow-xs transition cursor-pointer"
                                    title="استعادة القسم إلى لوحة القيادة النشطة مع إظهار حصصه في جدول التوقيت"
                                  >
                                    <ArchiveRestore className="w-3.5 h-3.5" />
                                    <span>استعادة للقسم النشط</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* لوحة معاينة القسم المؤرشف (وضع القراءة والطباعة والتصدير فقط) */}
                      {selectedArchivedClass && (
                        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border-2 border-amber-300 dark:border-amber-800/70 shadow-sm space-y-5">
                          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-xs font-black flex items-center gap-1.5 border border-amber-300 dark:border-amber-800">
                                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>سجل مؤرشف (للقراءة والطباعة فقط)</span>
                                </span>
                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                  قائمة ونتائج قسم {selectedArchivedClass.name} ({selectedArchivedClass.level} - {selectedArchivedClass.stream})
                                </h3>
                                <span className="text-xs font-mono font-bold text-slate-500">
                                  • الموسم الدراسي {selectedArchivedClass.academicYear || '2026/2027'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                التعديل المباشر مقفل لحماية الأرشيف التاريخي. يمكنك البحث، طباعة الكشف، تصدير ملف الرقمنة CSV، أو استعادة القسم لتعديله.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Printer className="w-4 h-4 text-slate-500" />
                                <span>طباعة قائمة الأرشيف</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => exportDigitizationCSV(selectedArchivedClass)}
                                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                <span>تصدير CSV / الرقمنة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRestoreArchivedClass(selectedArchivedClass)}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                              >
                                <ArchiveRestore className="w-4 h-4" />
                                <span>استعادة القسم للتعديل والتنشيط</span>
                              </button>
                            </div>
                          </div>

                          {/* شريط البحث والفلترة داخل القسم المؤرشف */}
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div className="relative flex-1 min-w-[200px]">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="text"
                                placeholder="ابحث عن تلميذ داخل هذا القسم المؤرشف..."
                                value={archivedStudentSearch}
                                onChange={e => setArchivedStudentSearch(e.target.value)}
                                className="w-full pr-8 pl-8 py-1.5 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                              />
                              {archivedStudentSearch && (
                                <button
                                  type="button"
                                  onClick={() => setArchivedStudentSearch('')}
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <select
                                value={archivedStudentGroupFilter}
                                onChange={e => setArchivedStudentGroupFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as 1 | 2)}
                                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                              >
                                <option value="all">كل الأفواج ({selectedArchivedClass.students.length} تلميذ)</option>
                                <option value={1}>الفوج 1 فقط</option>
                                <option value={2}>الفوج 2 فقط</option>
                              </select>
                            </div>
                          </div>

                          {/* جدول القراءة والطباعة لتلاميذ القسم المؤرشف */}
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-right text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-800 text-white">
                                  <th className="py-3 px-3">#</th>
                                  <th className="py-3 px-3">اللقب والاسم</th>
                                  <th className="py-3 px-2 text-center">الفوج</th>
                                  <th className="py-3 px-2 text-center">كود الولي</th>
                                  <th className="py-3 px-2 text-center">الغيابات</th>
                                  <th className="py-3 px-2 text-center">التقويم المستمر</th>
                                  {selectedArchivedClass.hasTP && <th className="py-3 px-2 text-center">الأعمال التطبيقية</th>}
                                  <th className="py-3 px-2 text-center">الفرض 1</th>
                                  <th className="py-3 px-2 text-center">الفرض 2</th>
                                  <th className="py-3 px-2 text-center">الاختبار</th>
                                  <th className="py-3 px-2 text-center">المعدل الفصلي</th>
                                  <th className="py-3 px-3">الملاحظة التربوية</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredArchivedStudents.length === 0 ? (
                                  <tr>
                                    <td colSpan={selectedArchivedClass.hasTP ? 12 : 11} className="py-10 text-center text-slate-400">
                                      لا يوجد تلاميذ مطابقون للبحث في هذا القسم المؤرشف.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredArchivedStudents.map((st, idx) => {
                                    const cc = calcContinuousScore(st.bonusPoints);
                                    const avg = calcStudentAverage(st, selectedArchivedClass.hasTP);
                                    return (
                                      <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                                        <td className="py-2.5 px-3 font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                          <HighlightMatch text={`${st.lastName} ${st.firstName}`} query={archivedStudentSearch} />
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                                            فوج {st.group}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400">{st.parentCode}</td>
                                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{st.absencesCount}</td>
                                        <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-700 dark:text-blue-400">{cc}</td>
                                        {selectedArchivedClass.hasTP && (
                                          <td className="py-2.5 px-2 text-center font-mono font-bold">{st.tpScore}</td>
                                        )}
                                        <td className="py-2.5 px-2 text-center font-mono font-bold">{st.test1}</td>
                                        <td className="py-2.5 px-2 text-center font-mono font-bold">{st.test2}</td>
                                        <td className="py-2.5 px-2 text-center font-mono font-bold">{st.exam}</td>
                                        <td className="py-2.5 px-2 text-center">
                                          <span className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs ${
                                            avg >= 14
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : avg >= 10
                                              ? 'bg-blue-100 text-blue-800'
                                              : 'bg-rose-100 text-rose-800'
                                          }`}>
                                            {avg}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                          {st.remark || generateSmartRemark(st, selectedArchivedClass.hasTP)}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* =========================================================
                  الوضع ب: إدارة القوائم والـ OCR للقسم النشط الحالي
              ========================================================= */}
              {classesManagementMode === 'active' && activeClasses.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                        <Upload className="w-5 h-5 text-blue-600" />
                        <span>المسح الضوئي الذكي لقائمة القسم (OCR)</span>
                      </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    التقط صورة لقائمة القسم لتحويلها تلقائياً إلى قائمة رقمية تفاعلية:
                  </p>

                  <label className="border-2 border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 transition rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer">
                    <Upload className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="text-sm font-bold text-blue-700">اضغط لرفع ورقة القائمة</span>
                    <span className="text-xs text-slate-400 mt-1">يدعم JPG و PNG</span>
                    <input
                      type="file" accept="image/*"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsScanning(true);
                        setOcrErrorMsg(null);

                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const base64 = ev.target?.result as string;
                          setLastOcrPayload({ base64, mimeType: file.type });
                          try {
                            const res = await fetch('/api/ocr/extract-students', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ imageBase64: base64, mimeType: file.type })
                            });
                            const data = await res.json().catch(() => ({}));
                            if (res.ok && data.success && Array.isArray(data.students) && data.students.length > 0) {
                              const formatted = data.students.map((st: any, idx: number) => ({
                                lastName: (st.lastName || '').trim() || 'غير محدد',
                                firstName: (st.firstName || '').trim() || 'تلميذ',
                                birthDate: '2008-05-01',
                                group: (idx % 2 === 0 ? 1 : 2) as 1 | 2
                              }));
                              setScannedPreview(formatted);
                              setOcrErrorMsg(null);
                              showNotice(`✓ تم استخراج ${formatted.length} تلميذ حقيقي بنجاح من ورقة القائمة!`);
                            } else {
                              const friendlyMsg = formatFriendlyOcrError(data.message);
                              setScannedPreview([]);
                              setOcrErrorMsg(friendlyMsg);
                              showNotice(`⚠️ ${friendlyMsg}`);
                            }
                          } catch {
                            const netMsg = 'تعذر الاتصال بخادم القراءة الذكية، يرجى التحقق من الشبكة وإعادة المحاولة.';
                            setScannedPreview([]);
                            setOcrErrorMsg(netMsg);
                            showNotice(`⚠️ ${netMsg}`);
                          } finally {
                            setIsScanning(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>

                  {isScanning && (
                    <div className="mt-4 p-4 rounded-2xl bg-blue-50/90 border border-blue-200 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>
                            {ocrProgress < 35
                              ? 'جاري تحسين وضوح الصورة وتجهيز المستند...'
                              : ocrProgress < 75
                              ? 'جاري قراءة الأسماء والألقاب بالذكاء الاصطناعي...'
                              : 'جاري تدقيق القائمة وتوزيع الأفواج...'}
                          </span>
                        </div>
                        <span className="font-mono text-blue-700">{ocrProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-blue-200/70 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {ocrErrorMsg && !isScanning && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                      <p className="font-bold leading-relaxed">⚠️ {ocrErrorMsg}</p>
                      {lastOcrPayload && (
                        <button
                          type="button"
                          onClick={async () => {
                            setIsScanning(true);
                            setOcrErrorMsg(null);
                            try {
                              const res = await fetch('/api/ocr/extract-students', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ imageBase64: lastOcrPayload.base64, mimeType: lastOcrPayload.mimeType })
                              });
                              const data = await res.json().catch(() => ({}));
                              if (res.ok && data.success && Array.isArray(data.students) && data.students.length > 0) {
                                const formatted = data.students.map((st: any, idx: number) => ({
                                  lastName: (st.lastName || '').trim() || 'غير محدد',
                                  firstName: (st.firstName || '').trim() || 'تلميذ',
                                  birthDate: '2008-05-01',
                                  group: (idx % 2 === 0 ? 1 : 2) as 1 | 2
                                }));
                                setScannedPreview(formatted);
                                setOcrErrorMsg(null);
                                showNotice(`✓ تم استخراج ${formatted.length} تلميذ بنجاح!`);
                              } else {
                                setOcrErrorMsg(formatFriendlyOcrError(data.message));
                              }
                            } catch {
                              setOcrErrorMsg('تعذر الاتصال بالخادم، يرجى المحاولة مجدداً.');
                            } finally {
                              setIsScanning(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>إعادة المحاولة الآن</span>
                        </button>
                      )}
                    </div>
                  )}

                  {scannedPreview.length > 0 && (
                    <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 space-y-3.5 animate-fadeIn">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2.5">
                        <div>
                          <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>مراجعة وتعديل بيانات الـ OCR ({scannedPreview.length} تلميذ)</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            يمكنك تصحيح أي لقب أو اسم أو تغيير الفوج أو حذف أي سطر قبل الاعتماد النهائي:
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setScannedPreview(prev => [
                                ...prev,
                                { lastName: '', firstName: '', birthDate: '2008-05-01', group: 1 }
                              ]);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            title="إضافة تلميذ جديد إلى قائمة المراجعة"
                          >
                            <Plus className="w-3 h-3" />
                            <span>إضافة سطر</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScannedPreview(prev =>
                                prev.map((item, i) => ({ ...item, group: (i % 2 === 0 ? 1 : 2) as 1 | 2 }))
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold transition cursor-pointer"
                            title="توزيع التلاميذ بالتناوب بين الفوج 1 والفوج 2"
                          >
                            توزيع الأفواج 1/2
                          </button>
                        </div>
                      </div>

                      {/* جدول المراجعة اليدوية القابل للتعديل */}
                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                        {scannedPreview.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={item.lastName}
                                placeholder="اللقب"
                                onChange={e => {
                                  const val = e.target.value;
                                  setScannedPreview(prev =>
                                    prev.map((row, i) => (i === idx ? { ...row, lastName: val } : row))
                                  );
                                }}
                                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                value={item.firstName}
                                placeholder="الاسم"
                                onChange={e => {
                                  const val = e.target.value;
                                  setScannedPreview(prev =>
                                    prev.map((row, i) => (i === idx ? { ...row, firstName: val } : row))
                                  );
                                }}
                                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setScannedPreview(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition shrink-0 cursor-pointer"
                                title="حذف هذا السطر من القائمة المستخرجة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-2 pl-1 pr-7">
                              <div className="flex items-center gap-1.5 flex-1">
                                <span className="text-[10px] text-slate-400 font-semibold">الميلاد:</span>
                                <input
                                  type="date"
                                  value={item.birthDate}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setScannedPreview(prev =>
                                      prev.map((row, i) => (i === idx ? { ...row, birthDate: val } : row))
                                    );
                                  }}
                                  className="px-2 py-0.5 rounded-md border border-slate-200 text-[11px] text-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScannedPreview(prev =>
                                      prev.map((row, i) => (i === idx ? { ...row, group: 1 } : row))
                                    );
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                    item.group === 1
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  فوج 1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScannedPreview(prev =>
                                      prev.map((row, i) => (i === idx ? { ...row, group: 2 } : row))
                                    );
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                    item.group === 2
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  فوج 2
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* أزرار الاعتماد النهائي أو الإلغاء */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const validItems = scannedPreview.filter(
                              item => item.lastName.trim() || item.firstName.trim()
                            );
                            if (validItems.length === 0) {
                              showNotice('يرجى التأكد من وجود اسم واحد على الأقل قبل الاعتماد.');
                              return;
                            }
                            const currentCount = activeClass.students.length;
                            const added: Student[] = validItems.map((item, idx) => ({
                              id: `ocr-${Date.now()}-${idx}`,
                              firstName: item.firstName.trim() || 'تلميذ',
                              lastName: item.lastName.trim() || 'غير محدد',
                              birthDate: item.birthDate || '2008-05-01',
                              group: item.group,
                              seatIndex: (currentCount + idx) % Math.max(totalDesksCount, currentCount + validItems.length),
                              attendance: 'present',
                              absencesCount: 0,
                              bonusPoints: 0,
                              tpScore: 14, test1: 12, test2: 12, exam: 12,
                              remark: '',
                              parentCode: `STD-${Math.floor(1000 + Math.random() * 9000)}`,
                              logs: [],
                              otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC(`${item.firstName} ${item.lastName}`)
                            }));
                            setClasses(prev =>
                              prev.map(c =>
                                c.id === activeClass.id
                                  ? {
                                      ...c,
                                      totalDesks: Math.max(c.totalDesks || 24, c.students.length + added.length),
                                      students: [...c.students, ...added]
                                    }
                                  : c
                              )
                            );
                            setScannedPreview([]);
                            showNotice(`✓ تم اعتماد وإضافة ${added.length} تلميذاً بنجاح إلى ${activeClass.name}!`);
                          }}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>اعتماد وإضافة للقسم ({scannedPreview.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setScannedPreview([])}
                          className="py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 font-bold text-xs transition cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (!newStudentForm.firstName.trim() || !newStudentForm.lastName.trim()) return;
                    const newSt: Student = {
                      id: `st-${Date.now()}`,
                      firstName: newStudentForm.firstName.trim(),
                      lastName: newStudentForm.lastName.trim(),
                      birthDate: newStudentForm.birthDate,
                      group: newStudentForm.group,
                      seatIndex: activeClass.students.length % totalDesksCount,
                      attendance: 'present',
                      absencesCount: 0,
                      bonusPoints: 0,
                      tpScore: 13, test1: 12, test2: 12, exam: 12,
                      remark: '',
                      parentCode: `STD-${Math.floor(1000 + Math.random() * 9000)}`,
                      logs: [],
                      otherSubjects: SAMPLE_MULTI_SUBJECTS_BAC(`${newStudentForm.firstName} ${newStudentForm.lastName}`)
                    };
                    setClasses(prev => prev.map(c => c.id === activeClass.id ? { ...c, students: [...c.students, newSt] } : c));
                    setNewStudentForm({ firstName: '', lastName: '', birthDate: '2008-05-01', group: 1 });
                    showNotice(`تم إضافة التلميذ ${newSt.lastName} ${newSt.firstName}`);
                  }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span>إضافة تلميذ يدوياً</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text" placeholder="اللقب" required
                      value={newStudentForm.lastName}
                      onChange={e => setNewStudentForm({ ...newStudentForm, lastName: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <input
                      type="text" placeholder="الاسم" required
                      value={newStudentForm.firstName}
                      onChange={e => setNewStudentForm({ ...newStudentForm, firstName: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={newStudentForm.birthDate}
                      onChange={e => setNewStudentForm({ ...newStudentForm, birthDate: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <select
                      value={newStudentForm.group}
                      onChange={e => setNewStudentForm({ ...newStudentForm, group: Number(e.target.value) as 1 | 2 })}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value={1}>الفوج 1</option>
                      <option value={2}>الفوج 2</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs">
                    + إدراج التلميذ في القائمة
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                {/* رأس إدارة القوائم وأزرار العرض */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>قائمة وتنسيق قسم {activeClass.name}</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({activeClass.students.length} تلميذ • سعة: {totalDesksCount} مقعد)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      اضغط على اسم التلميذ لفتح خيارات التنسيق مع أولياء الأمور وإدارة بياناته وملاحظاته التربوية.
                    </p>
                  </div>

                  {/* تبديل نمط العرض: جدول القائمة أو قسم التنسيق الشامل */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setClassListSubTab('list')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        classListSubTab === 'list'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>جدول القائمة</span>
                    </button>
                    <button
                      onClick={() => setClassListSubTab('coordination')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        classListSubTab === 'coordination'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>🤝 قسم التنسيق مع الأولياء</span>
                    </button>
                  </div>
                </div>

                {/* شريط البحث المباشر في القائمة والتصفية السريعة */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="ابحث بحرف أو اسم أو كود (مثال: ع، ب، فاطمة)..."
                      value={classListSearch}
                      onChange={e => setClassListSearch(e.target.value)}
                      className="w-full pr-8 pl-8 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                    {classListSearch && (
                      <button
                        onClick={() => setClassListSearch('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={classListGroupFilter}
                      onChange={e => setClassListGroupFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as 1 | 2)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700"
                    >
                      <option value="all">كل الأفواج (1 و 2)</option>
                      <option value={1}>الفوج 1 فقط</option>
                      <option value={2}>الفوج 2 فقط</option>
                    </select>

                    <select
                      value={classListCoordinationFilter}
                      onChange={e => setClassListCoordinationFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700"
                    >
                      <option value="all">جميع حالات التنسيق</option>
                      <option value="good">🟢 تواصل منتظم وممتاز</option>
                      <option value="followup">🟡 قيد المتابعة المنزلية</option>
                      <option value="urgent">🔴 حالات عاجلة (استدعاء الولي)</option>
                    </select>

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-300"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">طباعة</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsBatchDeleteMode(!isBatchDeleteMode);
                        setSelectedStudentIdsForDelete([]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                        isBatchDeleteMode
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white hover:bg-rose-50 text-rose-600 border-rose-300'
                      }`}
                      title="تحديد وحذف جماعي للتلاميذ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isBatchDeleteMode ? 'إلغاء وضع الحذف' : '🗑️ حذف تلاميذ متعدد'}</span>
                    </button>
                  </div>
                </div>

                {/* شريط الإجراءات الجماعية للحذف عند تفعيل وضع الحذف المتعدد */}
                {isBatchDeleteMode && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>وضع الحذف المتعدد: تم تحديد <strong className="font-mono text-rose-700 text-sm">{selectedStudentIdsForDelete.length}</strong> تلميذ</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStudentIdsForDelete.length === 0) {
                            showNotice('لم تقم بتحديد أي تلميذ للحذف.');
                            return;
                          }
                          setShowBatchDeleteConfirmModal(true);
                        }}
                        disabled={selectedStudentIdsForDelete.length === 0}
                        className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black transition cursor-pointer shadow-xs"
                      >
                        حذف التلاميذ المحددين ({selectedStudentIdsForDelete.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIdsForDelete(filteredClassListStudents.map(s => s.id))}
                        className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 font-bold hover:bg-rose-100 cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchDeleteMode(false);
                          setSelectedStudentIdsForDelete([]);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {/* عدد النتائج المطابقة */}
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      عرض <strong className="text-slate-800">{filteredClassListStudents.length}</strong> من أصل {activeClass.students.length} تلميذ
                    </span>
                    {classListSearch.trim() && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded-full text-[11px] shadow-xs">
                        <Search className="w-3 h-3 text-blue-600" />
                        تتضمن الحرف/الاسم: «{classListSearch}» ({filteredClassListStudents.length} تلميذ)
                      </span>
                    )}
                  </div>
                  {activeClass.students.some(s => s.coordinationStatus === 'urgent') && (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      توجد حالات عاجلة تستدعي التنسيق مع الولي
                    </span>
                  )}
                </div>

                {/* نمط بطاقات التلاميذ المتوافقة تماماً مع الهواتف المحمولة والشاشات */}
                {classListSubTab === 'list' && (
                  <div className="space-y-3">
                    {filteredClassListStudents.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        لا يوجد تلاميذ مطابقين لمعايير البحث والتصفية.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {filteredClassListStudents.map((st, idx) => {
                          const isUrgent = st.coordinationStatus === 'urgent';
                          const isFollowup = st.coordinationStatus === 'followup';
                          const studentAvg = calcStudentAverage(st, activeClass.hasTP);
                          const isSelectedForDelete = selectedStudentIdsForDelete.includes(st.id);

                          return (
                            <div
                              key={st.id}
                              onClick={() => {
                                if (isBatchDeleteMode) {
                                  setSelectedStudentIdsForDelete(prev =>
                                    prev.includes(st.id) ? prev.filter(id => id !== st.id) : [...prev, st.id]
                                  );
                                } else {
                                  setSelectedStudentForDetails({ student: st, classInfo: activeClass });
                                }
                              }}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs bg-white hover:border-blue-400 hover:shadow-md space-y-3 relative ${
                                isBatchDeleteMode && isSelectedForDelete
                                  ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-400'
                                  : isUrgent
                                  ? 'border-rose-300 bg-rose-50/20'
                                  : isFollowup
                                  ? 'border-amber-300 bg-amber-50/20'
                                  : 'border-slate-200'
                              }`}
                            >
                              {isBatchDeleteMode && (
                                <div className="absolute top-3 left-3 z-10">
                                  <input
                                    type="checkbox"
                                    checked={isSelectedForDelete}
                                    onChange={() => {}}
                                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                                  />
                                </div>
                              )}
                              {/* رأس البطاقة: الاسم والرقم */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 shadow-xs">
                                    {idx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-black text-slate-900 text-sm truncate flex items-center gap-1.5">
                                      <span><HighlightMatch text={`${st.lastName} ${st.firstName}`} query={classListSearch} /></span>
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${isUrgent ? 'bg-rose-500 animate-pulse' : isFollowup ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    </h4>
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      طاولة #{st.seatIndex + 1}
                                    </span>
                                  </div>
                                </div>

                                <div className="font-mono text-xs font-black shrink-0">
                                  <span className={`px-2 py-1 rounded-lg ${
                                    studentAvg >= 14 ? 'bg-emerald-100 text-emerald-800' : studentAvg >= 10 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {studentAvg} / 20
                                  </span>
                                </div>
                              </div>

                              {/* معلومات الفوج وكود الولي */}
                              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                                <div onClick={e => e.stopPropagation()}>
                                  <span className="text-[10px] text-slate-400 block mb-0.5">الفوج البيداغوجي:</span>
                                  <button
                                    onClick={() => updateStudent(st.id, s => ({ ...s, group: s.group === 1 ? 2 : 1 }))}
                                    className={`w-full py-1 rounded-lg font-bold text-xs transition ${
                                      st.group === 1 ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                    }`}
                                  >
                                    فوج {st.group} ⇄
                                  </button>
                                </div>

                                <div onClick={e => e.stopPropagation()}>
                                  <span className="text-[10px] text-slate-400 block mb-0.5">كود المتابعة للولي:</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(st.parentCode);
                                      showNotice(`تم نسخ كود الولي (${st.parentCode})`);
                                    }}
                                    className="w-full py-1 rounded-lg bg-slate-100 text-slate-800 hover:bg-blue-100 hover:text-blue-800 font-mono font-bold text-xs transition"
                                  >
                                    {st.parentCode} 📋
                                  </button>
                                </div>
                              </div>

                              {/* شريط الإجراءات السفلي */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentForDetails({ student: st, classInfo: activeClass })}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 border transition ${
                                    isUrgent
                                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                                      : isFollowup
                                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}
                                >
                                  <HeartHandshake className="w-3.5 h-3.5" />
                                  <span>{isUrgent ? 'استدعاء الولي' : isFollowup ? 'متابعة منزلية' : 'تواصل منتظم'}</span>
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSelectedStudentForDetails({ student: st, classInfo: activeClass })}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition"
                                    title="عرض البطاقة"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingStudent(st)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition"
                                    title="تعديل"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStudentToDeleteModal({ student: st, classInfo: activeClass });
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition cursor-pointer"
                                    title="حذف التلميذ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* النمط 2: قسم التنسيق الشامل مع أولياء الأمور (بطاقات تفاعلية) */}
                {classListSubTab === 'coordination' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <HeartHandshake className="w-5 h-5 text-indigo-600" />
                        <div>
                          <strong className="text-indigo-900 block font-bold">
                            قسم التنسيق والمتابعة المباشرة مع أولياء أمور {activeClass.name}
                          </strong>
                          <span className="text-indigo-700 text-[11px]">
                            يتيح للأستاذ مراجعة وإرسال التوصيات والملاحظات المنزلية ليعرف الولي كل شيء عن ابنه في المادة.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                          🟢 منتظم: {activeClass.students.filter(s => !s.coordinationStatus || s.coordinationStatus === 'good').length}
                        </span>
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                          🟡 متابعة: {activeClass.students.filter(s => s.coordinationStatus === 'followup').length}
                        </span>
                        <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                          🔴 عاجل: {activeClass.students.filter(s => s.coordinationStatus === 'urgent').length}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredClassListStudents.map(st => {
                        const avg = calcStudentAverage(st, activeClass.hasTP);
                        const cc = calcContinuousScore(st.bonusPoints);
                        const isUrgent = st.coordinationStatus === 'urgent';
                        return (
                          <div
                            key={`coord-card-${st.id}`}
                            className={`p-4 rounded-2xl border transition shadow-xs space-y-3 ${
                              isUrgent
                                ? 'bg-rose-50/30 border-rose-200 hover:border-rose-400'
                                : 'bg-white border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            {/* بطاقة التلميذ والولي */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-slate-800 text-sm">
                                    {st.lastName} {st.firstName}
                                  </h4>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-700">
                                    كود: {st.parentCode}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  فوج {st.group} • طاولة #{st.seatIndex + 1}
                                  {st.parentName && <span className="mr-1.5">• الولي: {st.parentName}</span>}
                                </div>
                              </div>

                              <div className="text-left font-mono">
                                <span className={`text-sm font-black ${avg >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {avg} <span className="text-[10px] text-slate-400 font-sans">/20</span>
                                </span>
                                <div className="text-[10px] text-slate-400 font-sans">المعدل التقديري</div>
                              </div>
                            </div>

                            {/* مؤشرات سريعة */}
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] text-slate-400 block">التقويم المستمر</span>
                                <strong className="text-blue-700 font-mono text-xs">{cc}/20</strong>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] text-slate-400 block">الغيابات</span>
                                <strong className={`font-mono text-xs ${st.absencesCount >= 3 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                                  {st.absencesCount} غيابات
                                </strong>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] text-slate-400 block">حالة التنسيق</span>
                                <strong className={`text-[11px] font-bold ${
                                  st.coordinationStatus === 'urgent'
                                    ? 'text-rose-600'
                                    : st.coordinationStatus === 'followup'
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                }`}>
                                  {st.coordinationStatus === 'urgent'
                                    ? 'استدعاء عاجل'
                                    : st.coordinationStatus === 'followup'
                                    ? 'متابعة منزلية'
                                    : 'تواصل ممتاز'}
                                </strong>
                              </div>
                            </div>

                            {/* معاينة التوصيات والملاحظات */}
                            <div className="space-y-1.5 text-xs">
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>التوصيات المنزلية لولي الأمر:</span>
                                </span>
                                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                                  {st.parentRecommendations || 'لم يتم تسجيل توصيات مخصصة بعد (اضغط لتعديل وإضافة التوصيات).'}
                                </p>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>ملاحظة الأستاذ للولي:</span>
                                </span>
                                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                                  {st.parentNotes || st.remark || 'تلميذ منتظم ومواظب في حصص المادة.'}
                                </p>
                              </div>
                            </div>

                            {/* أزرار الإجراءات السريعة للتنسيق */}
                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                              <button
                                type="button"
                                onClick={() => openCoordinationModal(st)}
                                className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>تعديل الملاحظات والتوصيات</span>
                              </button>

                              {st.parentPhone && (
                                <button
                                  type="button"
                                  onClick={() => openWhatsAppToParent(st.parentPhone!, generateParentReportText(st, activeClass))}
                                  className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                                  title="إرسال التقرير عبر واتساب للولي"
                                >
                                  <Phone className="w-4 h-4 text-emerald-600" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(generateParentReportText(st, activeClass));
                                  showNotice(`تم نسخ تقرير التنسيق لولي أمر ${st.firstName}!`);
                                }}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                                title="نسخ التقرير للحافظة"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              الشاشة 5: مصفوفة التنقيط والرقمنة
          ========================================================= */}
          {activeTab === 'grading' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-800 text-base">
                    مصفوفة حجز النقاط والتقويم المستمر - قسم {activeClass.name} ({teacherProfile.subject})
                  </h2>
                  <p className="text-xs text-slate-500">
                    نقطة التقويم المستمر تُحسب آلياً (الأساس 14 + رصيد السلوك والمواظبة):
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setClasses(prev =>
                        prev.map(cls =>
                          cls.id === activeClass.id
                            ? { ...cls, students: cls.students.map(st => ({ ...st, remark: generateSmartRemark(st, cls.hasTP) })) }
                            : cls
                        )
                      );
                      showNotice('تم توليد جميع الملاحظات التربوية آلياً!');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>توليد الملاحظات التربوية آلياً</span>
                  </button>
                  <button
                    onClick={() => exportDigitizationCSV()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>تصدير ملف الرقمنة (Excel/CSV)</span>
                  </button>
                </div>
              </div>

              {/* شريط البحث الفوري داخل مصفوفة التنقيط */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="ابحث بحرف أو اسم لحجز نقاط التلميذ فوراً (مثال: ع، ب، فاطمة)..."
                    value={gradingSearch}
                    onChange={e => setGradingSearch(e.target.value)}
                    className="w-full pr-8 pl-8 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                  {gradingSearch && (
                    <button
                      onClick={() => setGradingSearch('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="مسح البحث"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    عرض <strong className="text-slate-800">{filteredGradingStudents.length}</strong> من أصل {activeClass.students.length} تلميذ
                  </span>
                  {gradingSearch.trim() && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 font-bold px-2.5 py-0.5 rounded-full text-[11px] shadow-xs border border-amber-300">
                      <Search className="w-3 h-3 text-amber-700" />
                      تتضمن الحرف: «{gradingSearch}» ({filteredGradingStudents.length} تلميذ)
                    </span>
                  )}
                </div>
              </div>

              {/* واجهة الهواتف المحمولة: بطاقات رأسية مريحة لإدخال ورصد النقاط بدون تمرير أفقي (المرحلة 5) */}
              <div className="sm:hidden space-y-3">
                {filteredGradingStudents.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    <p className="font-bold">لا يوجد تلميذ يطابق «{gradingSearch}»</p>
                  </div>
                ) : (
                  filteredGradingStudents.map((st, idx) => {
                    const avg = calcStudentAverage(st, activeClass.hasTP);
                    const cc = calcContinuousScore(st.bonusPoints);
                    return (
                      <div
                        key={st.id}
                        className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() => setSelectedStudentForDetails({ student: st, classInfo: activeClass })}
                            className="flex items-center gap-2 cursor-pointer min-w-0"
                          >
                            <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <strong className="text-sm font-black text-slate-900 dark:text-white block truncate">
                                <HighlightMatch text={`${st.lastName} ${st.firstName}`} query={gradingSearch} />
                              </strong>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                فوج {st.group} • كود: {st.parentCode}
                              </span>
                            </div>
                          </div>

                          <div className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs shrink-0 ${
                            avg >= 10
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                          }`}>
                            {avg} <span className="text-[10px] font-sans">/20</span>
                          </div>
                        </div>

                        {/* خانات النقاط السريعة */}
                        <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
                          <div className="bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 block">تقويم</span>
                            <strong className="text-blue-600 dark:text-blue-400 font-mono">{cc}</strong>
                          </div>
                          {activeClass.hasTP && (
                            <div className="bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block">TP</span>
                              <strong className="text-purple-600 dark:text-purple-400 font-mono">{st.tpScore ?? '-'}</strong>
                            </div>
                          )}
                          <div className="bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 block">فرض 1</span>
                            <strong className="text-slate-800 dark:text-slate-200 font-mono">{st.test1}</strong>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 block">اختبار</span>
                            <strong className="text-amber-600 dark:text-amber-400 font-mono">{st.exam}</strong>
                          </div>
                        </div>

                        {/* زر لمس عريض لفتح نافذة رصد النقاط */}
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForGrades({ student: st, classInfo: activeClass })}
                          className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs min-h-[44px]"
                        >
                          <Award className="w-4 h-4" />
                          <span>رصد وتعديل نقاط التلميذ (نافذة تفاعلية) ✏️</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* جدول شاشات الحواسيب والأجهزة اللوحية */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="py-3 px-2.5 rounded-tr-xl">#</th>
                      <th className="py-3 px-3">اللقب والاسم</th>
                      <th className="py-3 px-2 text-center">الرصيد (+/-)</th>
                      <th className="py-3 px-2 text-center">التقويم المستمر</th>
                      {activeClass.hasTP && <th className="py-3 px-2 text-center">الأعمال التطبيقية</th>}
                      <th className="py-3 px-2 text-center">الفرض 1</th>
                      <th className="py-3 px-2 text-center">الفرض 2</th>
                      <th className="py-3 px-2 text-center">الاختبار (/20)</th>
                      <th className="py-3 px-2 text-center">المعدل الفصلي</th>
                      <th className="py-3 px-3 rounded-tl-xl min-w-[240px]">الملاحظة التربوية (الرقمنة)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredGradingStudents.length === 0 ? (
                      <tr>
                        <td colSpan={activeClass.hasTP ? 10 : 9} className="py-12 text-center text-slate-400 bg-slate-50">
                          <p className="font-bold text-slate-600 mb-1">لم يتم العثور على أي تلميذ يتضمن اسمه «{gradingSearch}» في هذا القسم</p>
                          <button
                            type="button"
                            onClick={() => setGradingSearch('')}
                            className="text-xs text-blue-600 font-bold hover:underline"
                          >
                            مسح البحث وعرض كافة التلاميذ
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredGradingStudents.map((st, idx) => {
                        const cc = calcContinuousScore(st.bonusPoints);
                        const avg = calcStudentAverage(st, activeClass.hasTP);
                        return (
                          <tr key={st.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-2.5 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                              <HighlightMatch text={`${st.lastName} ${st.firstName}`} query={gradingSearch} />
                            </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold ${st.bonusPoints >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {st.bonusPoints > 0 ? `+${st.bonusPoints}` : st.bonusPoints}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-blue-700 bg-blue-50/40">{cc}</td>
                          {activeClass.hasTP && (
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number" step="0.5" min="0" max="20"
                                value={st.tpScore}
                                onChange={e => updateStudent(st.id, s => ({ ...s, tpScore: Number(e.target.value) }))}
                                className="w-16 text-center py-1 rounded border border-slate-300 font-bold"
                              />
                            </td>
                          )}
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number" step="0.5" min="0" max="20"
                              value={st.test1}
                              onChange={e => updateStudent(st.id, s => ({ ...s, test1: Number(e.target.value) }))}
                              className="w-16 text-center py-1 rounded border border-slate-300 font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number" step="0.5" min="0" max="20"
                              value={st.test2}
                              onChange={e => updateStudent(st.id, s => ({ ...s, test2: Number(e.target.value) }))}
                              className="w-16 text-center py-1 rounded border border-slate-300 font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number" step="0.5" min="0" max="20"
                              value={st.exam}
                              onChange={e => updateStudent(st.id, s => ({ ...s, exam: Number(e.target.value) }))}
                              className="w-16 text-center py-1 rounded border border-blue-300 bg-blue-50/20 font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                              avg >= 14 ? 'bg-emerald-100 text-emerald-800' : avg >= 10 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {avg}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={st.remark}
                              onChange={e => updateStudent(st.id, s => ({ ...s, remark: e.target.value }))}
                              placeholder="اضغط توليد آلي أو اكتب ملاحظة..."
                              className="w-full px-2.5 py-1 rounded border border-slate-200 focus:border-blue-500 text-xs"
                            />
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================
              الشاشة 6: التدرج السنوي والمذكرات و PDF
          ========================================================= */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    <span>التدرج السنوي والمذكرات البيداغوجية - {teacherProfile.subject}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إدارة شاملة لبرنامج الدروس لجميع السنوات، التوليد الأوتوماتيكي، الإضافة اليدوية، والتحميل عبر ملفات PDF.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => {
                      const defaultUnits = OFFICIAL_CURRICULA_BY_SUBJECT[teacherProfile.subject] || OFFICIAL_CURRICULA_BY_SUBJECT['العلوم الفيزيائية'];
                      setCurriculum(defaultUnits);
                      showNotice(`تم توليد التدرج السنوي والمذكرات لمادة ${teacherProfile.subject} آلياً!`);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>توليد التدرج والمذكرات آلياً للمادة</span>
                  </button>

                  <button
                    onClick={() => setShowManualUnitModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة وحدة / مذكرة يدوياً (+)</span>
                  </button>
                </div>
              </div>

              {/* قسم ملفات الـ PDF لجميع السنوات */}
              <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-blue-800/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">برامج دروس جميع السنوات عبر ملفات PDF الرسمية</h3>
                      <p className="text-xs text-blue-200">
                        قم بتحميل مناهج وزارة التربية الوطنية أو وثائق التدرج بصيغة PDF لربطها بالبرنامج السنوي:
                      </p>
                    </div>
                  </div>

                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>رفع منهاج دروس بصيغة PDF</span>
                    <input
                      type="file" accept=".pdf"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const newDoc: UploadedPDFDoc = {
                          id: `pdf-${Date.now()}`,
                          name: file.name,
                          level: activeClass.level,
                          subject: teacherProfile.subject,
                          uploadDate: new Date().toISOString().split('T')[0],
                          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                          unitsCount: 4
                        };
                        setUploadedPDFs(prev => [newDoc, ...prev]);
                        showNotice(`تم رفع وقراءة منهاج ${file.name} بنجاح!`);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {uploadedPDFs.map(pdf => (
                    <div key={pdf.id} className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 transition flex flex-col justify-between space-y-2">
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-white line-clamp-2">{pdf.name}</div>
                          <div className="text-[10px] text-blue-200 mt-0.5">{pdf.level} • {pdf.size}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/10 text-blue-200">
                        <span>مفهرس ومربوط بالبرنامج ✓</span>
                        <button
                          onClick={() => showNotice(`تم استعراض محتوى ملف ${pdf.name}`)}
                          className="text-white hover:underline font-bold"
                        >
                          معاينة الملف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* بطاقات وحدات التدرج والمذكرات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {curriculum.map(unit => {
                  const pct = Math.min(100, Math.round((unit.completedHours / unit.plannedHours) * 100));
                  return (
                    <div key={unit.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
                            {unit.level} - الوحدة {unit.unitNumber}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              pct === 100
                                ? 'bg-emerald-100 text-emerald-700'
                                : pct > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {pct === 100 ? 'مكتملة ✓' : pct > 0 ? 'جارية' : 'لم تبدأ'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mb-2">{unit.title}</h3>
                        {unit.competency && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-2">
                            🎯 <strong>الكفاءة:</strong> {unit.competency}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">📝 {unit.notes}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>الإنجاز: {unit.completedHours} / {unit.plannedHours} سا</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                          <button
                            onClick={() => setViewingLessonPlan(unit)}
                            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>عرض المذكرة الكاملة</span>
                          </button>

                          <button
                            onClick={() =>
                              setCurriculum(prev =>
                                prev.map(u =>
                                  u.id === unit.id && u.completedHours < u.plannedHours
                                    ? { ...u, completedHours: u.completedHours + 1, status: u.completedHours + 1 >= u.plannedHours ? 'completed' : 'in-progress' }
                                    : u
                                )
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                          >
                            + إنجاز حصة (1 سا)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================
              الشاشة 7: الإحصائيات
              [تعديل 1: بعد تحديد القسم تظهر أيضا قوائم التلاميذ مع إحصائياتهم ومعدلاتهم]
              [تعديل 2: البطاقة الفردية الدقيقة]
          ========================================================= */}
          {activeTab === 'analytics' && (
            <AnalyticsSectionRedesign
              activeClass={activeClass}
              allClasses={activeClasses}
              onSelectClass={(classId) => {
                setActiveClassId(classId);
                setSelectedStudentForDiagnostic(null);
              }}
              teacherProfile={teacherProfile}
              calcStudentAverage={calcStudentAverage}
              onSaveStudent={(updatedStudent) => {
                updateStudent(updatedStudent.id, () => updatedStudent);
                showNotice(`تم حفظ بيانات وتوصيات التلميذ ${updatedStudent.lastName} ${updatedStudent.firstName} بنجاح`);
              }}
              onOpenStudentDetails={(student) => {
                setSelectedStudentForDetails({ student, classInfo: activeClass });
              }}
              onOpenSettings={() => {
                setShowSettingsModal(true);
              }}
            />
          )}

          {/* =========================================================
              الشاشة 8: قائمة المهام والالتزامات البيداغوجية للاستاذ
          ========================================================= */}
          {activeTab === 'todo' && (
            <TeacherTodoList classes={activeClasses} darkMode={darkMode} />
          )}

        </main>
      </div>

      {/* =========================================================
          نافذة تفاصيل وتعديل الحصة وإضافة ملاحظات القسم والحصة
      ========================================================= */}
      {sessionEditModalOpen && (
        <TimetableSessionModal
          sessionForm={editingSessionForm}
          isNew={isNewSessionInSlot}
          classes={activeClasses}
          timeSlots={TIME_SLOTS}
          daysOfWeek={DAYS_OF_WEEK}
          onClose={() => setSessionEditModalOpen(false)}
          onSave={(finalSession) => {
            setTimetableSessions(prev => {
              const filtered = prev.filter(s => s.id !== finalSession.id && !(s.day === finalSession.day && s.startTime === finalSession.startTime));
              return [...filtered, finalSession];
            });
            setSessionEditModalOpen(false);
            showNotice(`تم حفظ الحصة (${finalSession.className} - ${finalSession.type}) والملاحظات بنجاح!`);
          }}
          onDelete={(id) => {
            handleDeleteSession(id);
          }}
        />
      )}

      {/* =========================================================
          نافذة تفاصيل التلميذ الشاملة والتنسيق مع الأولياء عند الضغط على اسمه
      ========================================================= */}
      {selectedStudentForDetails && (
        <StudentDetailsModal
          student={selectedStudentForDetails.student}
          classInfo={selectedStudentForDetails.classInfo}
          onClose={() => setSelectedStudentForDetails(null)}
          onSaveStudent={(updated) => {
            updateStudent(updated.id, () => updated);
            setSelectedStudentForDetails(prev => prev ? { ...prev, student: updated } : null);
            showNotice(`تم حفظ بيانات وتوصيات التلميذ ${updated.lastName} ${updated.firstName} بنجاح`);
          }}
          calcAverage={calcStudentAverage}
          onDeleteStudent={(id) => {
            deleteStudent(id, `${selectedStudentForDetails.student.lastName} ${selectedStudentForDetails.student.firstName}`, selectedStudentForDetails.classInfo.id);
          }}
        />
      )}

      {/* نافذة اختيار السنة والقسم التفاعلية (المرحلة 2) */}
      <ClassSelectorModal
        isOpen={isClassSelectorOpen}
        onClose={() => setIsClassSelectorOpen(false)}
        classes={activeClasses}
        activeClassId={activeClass.id}
        onSelectClass={(id) => {
          setActiveClassId(id);
          setSelectedStudentId(null);
        }}
        onAddNewClass={() => setNewClassModal(true)}
        maxClasses={10}
        archivedCount={archivedClasses.length}
        onOpenArchive={() => {
          setActiveTab('classes');
          setClassesManagementMode('archive');
          if (!selectedArchivedClassId && archivedClasses.length > 0) {
            setSelectedArchivedClassId(archivedClasses[0].id);
          }
        }}
      />

      {/* نافذة رصد وتعديل نقاط التلميذ التفاعلية للهاتف (المرحلة 5) */}
      {selectedStudentForGrades && (
        <StudentGradesModal
          student={selectedStudentForGrades.student}
          classInfo={selectedStudentForGrades.classInfo}
          onClose={() => setSelectedStudentForGrades(null)}
          onSaveGrades={(updated) => {
            updateStudent(updated.id, () => updated, selectedStudentForGrades.classInfo.id);
            setSelectedStudentForGrades(null);
            showNotice(`✓ تم حفظ نقاط ${updated.lastName} ${updated.firstName} بنجاح`);
          }}
          teacherSubject={teacherProfile.subject}
        />
      )}

      {/* نافذة تأكيد حذف تلميذ فردي (مباشرة وبدون الاعتماد على نافذة المتصفح) */}
      {studentToDeleteModal && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-200 text-center space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-base">تأكيد حذف التلميذ</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                هل أنت متأكد من حذف التلميذ <strong className="text-rose-700 font-bold">{studentToDeleteModal.student.lastName} {studentToDeleteModal.student.firstName}</strong> نهائياً من قسم <span className="font-bold text-slate-700">{studentToDeleteModal.classInfo.name}</span>؟
              </p>
              <p className="text-[11px] text-rose-600 font-semibold mt-1">
                ⚠️ سيتم حذف التلميذ وكافة نقاطه وسجلاته وغياباته فوراً.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  deleteStudent(
                    studentToDeleteModal.student.id,
                    `${studentToDeleteModal.student.lastName} ${studentToDeleteModal.student.firstName}`,
                    studentToDeleteModal.classInfo.id
                  );
                  setStudentToDeleteModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition cursor-pointer shadow-sm"
              >
                نعم، تأكيد الحذف
              </button>
              <button
                type="button"
                onClick={() => setStudentToDeleteModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الحذف المتعدد للتلاميذ */}
      {showBatchDeleteConfirmModal && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-200 text-center space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-base">تأكيد الحذف المتعدد</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                هل أنت متأكد من حذف <strong className="text-rose-700 font-mono text-sm">{selectedStudentIdsForDelete.length}</strong> تلاميذ المحددين نهائياً من قسم <span className="font-bold text-slate-700">{activeClass.name}</span>؟
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const count = selectedStudentIdsForDelete.length;
                  setClasses(prev =>
                    prev.map(c =>
                      c.id === activeClass.id
                        ? { ...c, students: c.students.filter(x => !selectedStudentIdsForDelete.includes(x.id)) }
                        : c
                    )
                  );
                  setSelectedStudentIdsForDelete([]);
                  setIsBatchDeleteMode(false);
                  setShowBatchDeleteConfirmModal(false);
                  showNotice(`✓ تم حذف ${count} تلاميذ بنجاح من القسم`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition cursor-pointer shadow-sm"
              >
                نعم، حذف ({selectedStudentIdsForDelete.length}) تلاميذ
              </button>
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}


      {/* نافذة الإعدادات الشاملة المحدثة ⚙️ */}
      {showSettingsModal && (
        <TeacherSettingsModal
          teacherProfile={teacherProfile}
          classes={classes}
          onSave={async (updatedProfile, updatedClasses) => {
            setTeacherProfile(updatedProfile);
            setClasses(updatedClasses);

            const payload = {
              teacherProfile: updatedProfile,
              classes: updatedClasses,
              curriculum,
              timetableSessions
            };

            const ok = await syncTeacherDataToServer(currentUser?.email || '', payload);
            try {
              localStorage.setItem(`teacher_profile_${teacherStorageKey}`, JSON.stringify(updatedProfile));
              localStorage.setItem(`teacher_classes_${teacherStorageKey}`, JSON.stringify(updatedClasses));
            } catch {}

            showNotice('تم حفظ إعدادات الأستاذ والأقسام بنجاح في قاعدة البيانات!');
            return ok;
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* نافذة تأكيد أرشفة قسم وتحديد الموسم الدراسي والملاحظة */}
      {archiveModalClass && (
        <div className="fixed inset-0 z-[85] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 dark:border-amber-800 space-y-4 animate-scaleUp text-right">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    أرشفة قسم «{archiveModalClass.name}»
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    نقل القسم المنتهي إلى خزانة الأرشيف مع حفظ كافة البيانات
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setArchiveModalClass(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmArchiveClass} className="space-y-4">
              {/* ملخص القسم المراد أرشفته */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-slate-800/70 border border-amber-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">المستوى والشعبة:</span>
                  <strong className="text-slate-900 dark:text-white">{archiveModalClass.level} • {archiveModalClass.stream}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">عدد التلاميذ المسجلين:</span>
                  <strong className="font-mono text-blue-700 dark:text-blue-400">{archiveModalClass.students.length} تلميذ</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">حصص جدول التوقيت المرتبطة:</span>
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                    {timetableSessions.filter(s => s.classId === archiveModalClass.id || s.className === archiveModalClass.name).length} حصص (ستُخفى تلقائياً وتُستعاد عند الإلغاء)
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الموسم الدراسي للأرشيف:
                </label>
                <select
                  value={archiveForm.academicYear}
                  onChange={e => setArchiveForm({ ...archiveForm, academicYear: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white"
                >
                  <option value="2026/2027">الموسم الدراسي 2026/2027</option>
                  <option value="2025/2026">الموسم الدراسي 2025/2026</option>
                  <option value="2024/2025">الموسم الدراسي 2024/2025</option>
                  <option value="2023/2024">الموسم الدراسي 2023/2024</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ملاحظة أو سبب الأرشفة (اختياري):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['انتهاء الموسم الدراسي', 'انتهاء فترة التكليف/الاستخلاف', 'إعادة تفويج الأقسام'].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setArchiveForm(prev => ({ ...prev, archiveNote: reason }))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-900 text-[11px] font-bold transition cursor-pointer"
                    >
                      + {reason}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="مثال: قسم بكالوريا دفعة 2026 - نتائج الفصل الثالث مكتملة..."
                  value={archiveForm.archiveNote}
                  onChange={e => setArchiveForm({ ...archiveForm, archiveNote: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                💡 سيُحفظ القسم في وضع <strong>القراءة والطباعة فقط</strong> داخل خزانة الأرشيف، مع إخفاء حصصه من جدول التوقيت الأسبوعي وتنظيف لوحة القيادة، ويمكنك استعادته في أي وقت.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setArchiveModalClass(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Archive className="w-4 h-4" />
                  <span>تأكيد النقل إلى الأرشيف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة قسم جديد */}
      {newClassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">إضافة قسم مسند جديد</h3>
              <button onClick={() => setNewClassModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newClassForm.name.trim()) return;
                if (activeClasses.length >= 10) {
                  showNotice('⚠️ تم بلوغ الحد الأقصى للأقسام النشطة (10 أقسام). يمكنك أرشفة قسم منتهٍ لإضافة قسم جديد.');
                  setNewClassModal(false);
                  return;
                }
                const created: ClassGroup = {
                  id: `cls-${Date.now()}`,
                  name: newClassForm.name.trim(),
                  level: newClassForm.level,
                  stream: newClassForm.stream,
                  room: newClassForm.room,
                  schedule: newClassForm.schedule,
                  hasTP: newClassForm.hasTP,
                  totalDesks: 24,
                  students: []
                };
                setClasses(prev => [...prev, created]);
                setActiveClassId(created.id);
                setClassesManagementMode('active');
                setNewClassModal(false);
                showNotice(`تم إنشاء قسم ${created.name}`);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">اسم القسم (مثال: 3 ع ت 2):</label>
                <input
                  type="text" required placeholder="3 ع ت 2"
                  value={newClassForm.name}
                  onChange={e => setNewClassForm({ ...newClassForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">المستوى:</label>
                  <select
                    value={newClassForm.level}
                    onChange={e => setNewClassForm({ ...newClassForm, level: e.target.value as Level })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="1 ثانوي">1 ثانوي</option>
                    <option value="2 ثانوي">2 ثانوي</option>
                    <option value="3 ثانوي (بكالوريا)">3 ثانوي (بكالوريا)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">الشعبة:</label>
                  <select
                    value={newClassForm.stream}
                    onChange={e => setNewClassForm({ ...newClassForm, stream: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setNewClassModal(false)} className="px-4 py-2 rounded-xl border text-xs">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">حفظ وإنشاء القسم</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تعديل بيانات تلميذ */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">تعديل بيانات التلميذ</h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اللقب:</label>
                  <input
                    type="text" value={editingStudent.lastName}
                    onChange={e => setEditingStudent({ ...editingStudent, lastName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">الاسم:</label>
                  <input
                    type="text" value={editingStudent.firstName}
                    onChange={e => setEditingStudent({ ...editingStudent, firstName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">الفوج:</label>
                  <select
                    value={editingStudent.group}
                    onChange={e => setEditingStudent({ ...editingStudent, group: Number(e.target.value) as 1 | 2 })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value={1}>الفوج 1</option>
                    <option value={2}>الفوج 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">رقم المقعد:</label>
                  <input
                    type="number" min="0" max={totalDesksCount - 1}
                    value={editingStudent.seatIndex}
                    onChange={e => setEditingStudent({ ...editingStudent, seatIndex: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الكود الموحد للتلميذ:</label>
                <input
                  type="text" value={editingStudent.parentCode}
                  onChange={e => setEditingStudent({ ...editingStudent, parentCode: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setEditingStudent(null)} className="px-4 py-2 rounded-xl border text-xs">إلغاء</button>
                <button
                  onClick={() => {
                    updateStudent(editingStudent.id, () => editingStudent);
                    setEditingStudent(null);
                    showNotice('تم حفظ تعديلات التلميذ');
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة وحدة يدوياً */}
      {showManualUnitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">إضافة وحدة تعليمية ومذكرة بيداغوجية يدوياً</h3>
              <button onClick={() => setShowManualUnitModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!manualUnitForm.title.trim()) return;
                const newUnit: CurriculumUnit = {
                  id: `unit-man-${Date.now()}`,
                  subject: teacherProfile.subject,
                  level: manualUnitForm.level,
                  unitNumber: Number(manualUnitForm.unitNumber),
                  title: manualUnitForm.title.trim(),
                  plannedHours: Number(manualUnitForm.plannedHours),
                  completedHours: 0,
                  status: 'pending',
                  competency: manualUnitForm.competency.trim() || 'كفاءة مستهدفة محددة',
                  notes: manualUnitForm.notes.trim() || 'مذكرة شخصية',
                  lessonPlan: {
                    objectives: manualUnitForm.objectives.trim() || 'تحقيق الأهداف التعلمية المسطرة.',
                    stages: manualUnitForm.stages.trim() || 'وضعية انطلاق، نشاط تعلمي، حوصلة وتقويم.',
                    materials: manualUnitForm.materials.trim() || 'الكتاب المدرسي وأدوات الإيضاح.',
                    evaluation: 'تقويم مرحلي وتطبيقات.'
                  }
                };
                setCurriculum(prev => [newUnit, ...prev]);
                setShowManualUnitModal(false);
                showNotice('تمت إضافة الوحدة والمذكرة البيداغوجية بنجاح!');
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">المستوى:</label>
                  <select
                    value={manualUnitForm.level}
                    onChange={e => setManualUnitForm({ ...manualUnitForm, level: e.target.value as Level })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="1 ثانوي">1 ثانوي</option>
                    <option value="2 ثانوي">2 ثانوي</option>
                    <option value="3 ثانوي (بكالوريا)">3 ثانوي (بكالوريا)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">رقم الوحدة:</label>
                  <input
                    type="number" min="1" required
                    value={manualUnitForm.unitNumber}
                    onChange={e => setManualUnitForm({ ...manualUnitForm, unitNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">عنوان الوحدة:</label>
                <input
                  type="text" required placeholder="عنوان الوحدة المقررة..."
                  value={manualUnitForm.title}
                  onChange={e => setManualUnitForm({ ...manualUnitForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowManualUnitModal(false)} className="px-4 py-2 rounded-xl border text-xs">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">إضافة الوحدة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* استعراض المذكرة البيداغوجية الكاملة */}
      {viewingLessonPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">{viewingLessonPlan.level}</span>
                <h3 className="font-bold text-slate-800 text-base mt-1">{viewingLessonPlan.title}</h3>
              </div>
              <button onClick={() => setViewingLessonPlan(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <strong>🎯 الكفاءة المستهدفة:</strong>
                <p className="mt-1 text-slate-700">{viewingLessonPlan.competency || 'كفاءة مرحلية محددة.'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200">
                <strong>📌 الأهداف التعلمية الإجرائية:</strong>
                <p className="mt-1 text-slate-700">{viewingLessonPlan.lessonPlan?.objectives || 'اكتساب المفاهيم المقررة وحل التمارين.'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <strong>🧭 مراحل سير الحصة:</strong>
                <p className="mt-1 text-slate-700">{viewingLessonPlan.lessonPlan?.stages || 'وضعية انطلاق، مناقشة، تدوين، تقويم.'}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setViewingLessonPlan(null)} className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إرسال إشعار تذكيري للولي عند تجاوز 3 غيابات */}
      {absenceReminderModalOpen && absenceReminderStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">إرسال إشعار تذكيري بالغياب لولي الأمر</h3>
                  <span className="text-xs text-rose-600 font-bold">
                    تجاوز الحد القانوني ({absenceReminderStudent.absencesCount} غيابات غير مبررة)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAbsenceReminderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500">التلميذ:</span>{' '}
                  <strong className="text-slate-900 font-black">{absenceReminderStudent.lastName} {absenceReminderStudent.firstName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">القسم:</span>{' '}
                  <strong className="text-slate-900">{activeClass.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500">الكود الموحد:</span>{' '}
                  <strong className="font-mono text-blue-700 font-bold">{absenceReminderStudent.parentCode}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص الإشعار التذكيري الرسمي (يمكنك تعديله قبل الإرسال):
                </label>
                <textarea
                  rows={6}
                  value={customAbsenceNoticeText}
                  onChange={e => setCustomAbsenceNoticeText(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-300 text-xs text-slate-800 leading-relaxed font-sans focus:outline-none focus:border-rose-500 bg-rose-50/20"
                />
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  عند التأكيد، سيتم توثيق هذا الإشعار رسمياً في السجل الرقمي للتلميذ ويظهر لولي أمره في <strong>بوابة ولي الأمر</strong> تحت كوده الموحد مع طلب التوقيع وتأكيد الاطلاع.
                </span>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(customAbsenceNoticeText);
                      showNotice('تم نسخ نص الإشعار إلى الحافظة للإرسال عبر SMS أو واتساب!');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    نسخ النص (SMS/WhatsApp)
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة ورقية</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAbsenceReminderModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={sendAbsenceReminderToParent}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm transition flex items-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>تأكيد إرسال الإشعار وتوثيقه</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التنسيق التربوي والتواصل مع أولياء الأمور */}
      {coordinationStudent && (() => {
        const targetClass = classes.find(c => c.id === coordinationTargetClassId) || activeClass;
        const avg = calcStudentAverage(coordinationStudent, targetClass.hasTP);
        const cc = calcContinuousScore(coordinationStudent.bonusPoints);
        const reportText = generateParentReportText(coordinationStudent, targetClass);

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto text-right">
              
              {/* رأس النافذة */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base sm:text-lg flex items-center gap-2">
                      <span>بطاقة التنسيق التربوي والتواصل مع أولياء الأمور</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                        متابعة حية
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      التلميذ: <strong className="text-slate-800">{coordinationStudent.lastName} {coordinationStudent.firstName}</strong> • القسم: <strong className="text-blue-700">{targetClass.name}</strong> ({targetClass.level}) • مادة: {teacherProfile.subject}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setCoordinationStudent(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                  title="إغلاق النافذة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* شريط المؤشرات والإحصائيات البيداغوجية للتلميذ في المادة */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] text-slate-500 block font-semibold">المعدل الفصلي التقديري</span>
                  <div className={`text-xl font-black font-mono ${avg >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {avg} <span className="text-xs font-sans text-slate-400">/ 20</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {avg >= 14 ? 'مستوى جيد جداً' : avg >= 10 ? 'مستوى متوسط ومقبول' : 'بحاجة لمعالجة وتدارك'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] text-slate-500 block font-semibold">التقويم المستمر</span>
                  <div className="text-xl font-black font-mono text-blue-600">
                    {cc} <span className="text-xs font-sans text-slate-400">/ 20</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    رصيد المشاركة: {coordinationStudent.bonusPoints > 0 ? `+${coordinationStudent.bonusPoints}` : coordinationStudent.bonusPoints}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] text-slate-500 block font-semibold">سجل الغيابات والتأخرات</span>
                  <div className={`text-xl font-black font-mono ${coordinationStudent.absencesCount >= 3 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {coordinationStudent.absencesCount} <span className="text-xs font-sans text-slate-400">غيابات</span>
                  </div>
                  <span className={`text-[10px] font-bold ${coordinationStudent.absencesCount >= 3 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {coordinationStudent.absencesCount >= 3 ? '⚠️ تجاوز حد التنبيه' : 'المواظبة منضبطة'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] text-slate-500 block font-semibold">كود المتابعة لولي الأمر</span>
                  <div className="text-base font-black font-mono text-indigo-700 truncate">
                    {coordinationStudent.parentCode}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(coordinationStudent.parentCode);
                      showNotice('تم نسخ كود التلميذ الموحد!');
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>نسخ الكود للولي</span>
                  </button>
                </div>
              </div>

              {/* الصندوق 1: بيانات ولي الأمر والتواصل */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  <span>بيانات ولي الأمر ووسائل التواصل المباشرة:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم ولي الأمر / الصفة:</label>
                    <input
                      type="text"
                      placeholder="مثال: السيد عبد القادر بن عيسى (الأب)"
                      value={coordinationForm.parentName}
                      onChange={e => setCoordinationForm({ ...coordinationForm, parentName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم هاتف الولي (واتساب / اتصال):</label>
                    <input
                      type="tel"
                      placeholder="0550123456"
                      value={coordinationForm.parentPhone}
                      onChange={e => setCoordinationForm({ ...coordinationForm, parentPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">حالة التنسيق مع الولي:</label>
                    <select
                      value={coordinationForm.coordinationStatus}
                      onChange={e => setCoordinationForm({ ...coordinationForm, coordinationStatus: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                    >
                      <option value="good">🟢 تواصل منتظم وممتاز</option>
                      <option value="followup">🟡 قيد المتابعة المنزلية</option>
                      <option value="urgent">🔴 حالة عاجلة (استدعاء الولي)</option>
                      <option value="pending">⚪ قيد المتابعة الأولية</option>
                    </select>
                  </div>
                </div>

                {/* أزرار الاتصال السريع بولي الأمر */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {coordinationForm.parentPhone ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openWhatsAppToParent(coordinationForm.parentPhone, reportText)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>مراسلة الولي عبر واتساب (تقرير فوري)</span>
                      </button>

                      <a
                        href={`tel:${coordinationForm.parentPhone}`}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>اتصال هاتفي مباشر</span>
                      </a>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      💡 أدخل رقم هاتف الولي لتفعيل الاتصال والمراسلة المباشرة بضغطة زر.
                    </span>
                  )}
                </div>
              </div>

              {/* الصندوق 2: ملاحظات الأستاذ الموجهة لولي الأمر */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>ملاحظات الأستاذ الموجهة لولي الأمر (التحصيل، الانضباط، والمستوى بالقسم):</span>
                  </label>
                  <span className="text-[11px] text-slate-400">تظهر للولي مباشرة عند إدخال الكود</span>
                </div>

                {/* عبارات نموذجية سريعة بنقرة واحدة */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-400 self-center">عبارات سريعة:</span>
                  {[
                    'تلميذ متميز ذو ذكاء وقدرات تحليلية واعدة.',
                    'تطور ملحوظ في الأداء ويحتاج لمواصلة التشجيع.',
                    'يحتاج إلى تنظيم وقت المراجعة وتفادي التسرع في الإجابة.',
                    'تراجع مقلق بسبب الغيابات المتكررة وعدم التركيز بالقسم.'
                  ].map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const current = coordinationForm.parentNotes.trim();
                        setCoordinationForm({
                          ...coordinationForm,
                          parentNotes: current ? `${current} ${phrase}` : phrase
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[10px] font-medium border border-slate-200 transition"
                    >
                      + {phrase}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  placeholder="اكتب ملاحظاتك الشاملة حول التلميذ لولي أمره حتى يعرف كل شيء عن مستواه في المادة..."
                  value={coordinationForm.parentNotes}
                  onChange={e => setCoordinationForm({ ...coordinationForm, parentNotes: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                />
              </div>

              {/* الصندوق 3: التوصيات والتوجيهات المنزلية للأولياء */}
              <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>التوصيات والتوجيهات المنزلية للأولياء (ما الذي يتابعه الولي في البيت):</span>
                  </label>
                  <span className="text-[11px] text-indigo-700">إرشادات عملية لتحسين النتائج</span>
                </div>

                {/* توصيات سريعة بنقرة واحدة */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-400 self-center">توصيات مقترحة:</span>
                  {[
                    'حل 3 تمارين نموذجية نهاية كل أسبوع ومتابعة مراجعة الكراس.',
                    'الحرص على تثبيت جدول نوم منتظم في البيت والحد من المشتتات.',
                    'مراجعة القوانين الأساسية في بطاقات استذكار سريعة قبل كل حصة.',
                    'التأكد من إحضار كراس الدرس والأدوات كاملة إلى الثانوية.'
                  ].map((tip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const current = coordinationForm.parentRecommendations.trim();
                        setCoordinationForm({
                          ...coordinationForm,
                          parentRecommendations: current ? `${current} ${tip}` : tip
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-indigo-100/70 hover:bg-indigo-100 text-indigo-800 text-[10px] font-medium border border-indigo-200 transition"
                    >
                      + {tip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  placeholder="اكتب التوصيات البيداغوجية والمنزلية لولي الأمر لمساعدة ابنه على التفوق وتدارك النقائص..."
                  value={coordinationForm.parentRecommendations}
                  onChange={e => setCoordinationForm({ ...coordinationForm, parentRecommendations: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans bg-white"
                />
              </div>

              {/* الصندوق 4: نقاط القوة ومجالات التحسين */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                  <label className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>نقاط القوة والتميز في المادة:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: سرعة البديهة، تفاعل ممتاز أثناء التطبيقات"
                    value={coordinationForm.strengths}
                    onChange={e => setCoordinationForm({ ...coordinationForm, strengths: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs font-semibold bg-white"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-1.5">
                  <label className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>نقاط التحسين ومجالات التطوير:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: تنظيم ورقة الإجابة، المنهجية، إدارة الوقت"
                    value={coordinationForm.areasForImprovement}
                    onChange={e => setCoordinationForm({ ...coordinationForm, areasForImprovement: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs font-semibold bg-white"
                  />
                </div>
              </div>

              {/* تذييل النافذة والأزرار الإجرائية */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(reportText);
                      showNotice('تم نسخ التقرير الشامل لولي الأمر إلى الحافظة!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ التقرير للولي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>طباعة بطاقة الولي</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCoordinationStudent(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={saveCoordinationModal}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ الملاحظات والتوصيات</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      </div>

      {/* نافذة إدارة وتحديد نوع الغياب والتبرير الرقمي (رادار اليقظة) */}
      {absenceJustificationStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                    رادار اليقظة: تحديد نوع الغياب والتبرير الرقمي
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    التلميذ(ة): <strong className="text-blue-600 dark:text-blue-400">{absenceJustificationStudent.lastName} {absenceJustificationStudent.firstName}</strong> ({activeClass.name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAbsenceJustificationStudent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ملخص الغيابات */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block mb-1 font-bold">إجمالي الغيابات</span>
                <span className="text-xl font-black font-mono text-slate-800 dark:text-white">
                  {absenceJustificationStudent.absencesCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                <span className="text-rose-700 dark:text-rose-400 block mb-1 font-bold">غير مبررة ❌</span>
                <span className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                  {absenceJustificationStudent.logs.filter(l => l.type === 'absence' && l.absenceType !== 'justified').length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-emerald-700 dark:text-emerald-400 block mb-1 font-bold">مبررة بوثيقة ✅</span>
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {absenceJustificationStudent.logs.filter(l => l.type === 'absence' && l.absenceType === 'justified').length}
                </span>
              </div>
            </div>

            {/* قائمة حصص الغياب للتلميذ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>سجل حصص الغياب المسجلة لتحديد النوع وإرفاق الوثيقة الرقمية:</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    const newLog: BehaviorLog = {
                      id: `abs-manual-${Date.now()}`,
                      date: today,
                      type: 'absence',
                      reason: 'تسجيل غياب في الحصة',
                      delta: 0,
                      absenceType: 'unjustified'
                    };
                    updateStudent(absenceJustificationStudent.id, s => ({
                      ...s,
                      absencesCount: s.absencesCount + 1,
                      logs: [newLog, ...s.logs]
                    }));
                    setAbsenceJustificationStudent(prev => prev ? {
                      ...prev,
                      absencesCount: prev.absencesCount + 1,
                      logs: [newLog, ...prev.logs]
                    } : null);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
                >
                  + تسجيل غياب جديد
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {absenceJustificationStudent.logs.filter(l => l.type === 'absence').length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    لا توجد حصص غياب مسجلة لهذا التلميذ حتى الآن.
                  </div>
                ) : (
                  absenceJustificationStudent.logs.filter(l => l.type === 'absence').map((log) => (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-2xl border transition space-y-3 ${
                        log.absenceType === 'justified'
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                          : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            📅 {log.date}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            ({log.reason})
                          </span>
                        </div>

                        {/* اختيار نوع الغياب: مبرر / غير مبرر */}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => {
                              const newType = 'unjustified';
                              updateStudent(absenceJustificationStudent.id, s => ({
                                ...s,
                                logs: s.logs.map(l => l.id === log.id ? { ...l, absenceType: newType } : l)
                              }));
                              setAbsenceJustificationStudent(prev => prev ? {
                                ...prev,
                                logs: prev.logs.map(l => l.id === log.id ? { ...l, absenceType: newType } : l)
                              } : null);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              log.absenceType !== 'justified'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                            }`}
                          >
                            ❌ غير مبرر
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newType = 'justified';
                              const today = new Date().toISOString().split('T')[0];
                              updateStudent(absenceJustificationStudent.id, s => ({
                                ...s,
                                logs: s.logs.map(l => l.id === log.id ? { ...l, absenceType: newType, justifiedAt: today } : l)
                              }));
                              setAbsenceJustificationStudent(prev => prev ? {
                                ...prev,
                                logs: prev.logs.map(l => l.id === log.id ? { ...l, absenceType: newType, justifiedAt: today } : l)
                              } : null);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              log.absenceType === 'justified'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                            }`}
                          >
                            ✅ مبرر بوثيقة
                          </button>
                        </div>
                      </div>

                      {/* تفاصيل التبرير وإرفاق الصورة الرقمية */}
                      {log.absenceType === 'justified' && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/80 space-y-2.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                              تفاصيل الوثيقة / سبب التبرير:
                            </label>
                            <input
                              type="text"
                              placeholder="مثال: شهادة طبية من الدكتور بوعلي، رخصة غياب إدارية..."
                              value={log.justificationNote || ''}
                              onChange={e => {
                                const note = e.target.value;
                                updateStudent(absenceJustificationStudent.id, s => ({
                                  ...s,
                                  logs: s.logs.map(l => l.id === log.id ? { ...l, justificationNote: note } : l)
                                }));
                                setAbsenceJustificationStudent(prev => prev ? {
                                  ...prev,
                                  logs: prev.logs.map(l => l.id === log.id ? { ...l, justificationNote: note } : l)
                                } : null);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs bg-slate-50 dark:bg-slate-900 focus:outline-none"
                            />
                          </div>

                          {/* إرفاق وتصوير وثيقة التبرير الرقمية من الهاتف */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <label className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs transition">
                                <Upload className="w-3.5 h-3.5" />
                                <span>إرفاق وثيقة التبرير (صورة من الهاتف) 📷</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  capture="environment"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        const docUrl = ev.target?.result as string;
                                        const today = new Date().toISOString().split('T')[0];
                                        updateStudent(absenceJustificationStudent.id, s => ({
                                          ...s,
                                          logs: s.logs.map(l => l.id === log.id ? { ...l, justificationDocUrl: docUrl, justifiedAt: today } : l)
                                        }));
                                        setAbsenceJustificationStudent(prev => prev ? {
                                          ...prev,
                                          logs: prev.logs.map(l => l.id === log.id ? { ...l, justificationDocUrl: docUrl, justifiedAt: today } : l)
                                        } : null);
                                        showNotice('تم إرفاق صورة وثيقة التبرير الرقمية بنجاح!');
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>

                            {/* معاينة صورة التبرير المرفقة إن وجدت */}
                            {log.justificationDocUrl && (
                              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 p-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800">
                                <img
                                  src={log.justificationDocUrl}
                                  alt="وثيقة التبرير الرقمية"
                                  className="w-8 h-8 rounded-lg object-cover cursor-pointer border border-emerald-400"
                                  onClick={() => setPreviewJustificationDoc(log.justificationDocUrl || null)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setPreviewJustificationDoc(log.justificationDocUrl || null)}
                                  className="text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>معاينة الوثيقة</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateStudent(absenceJustificationStudent.id, s => ({
                                      ...s,
                                      logs: s.logs.map(l => l.id === log.id ? { ...l, justificationDocUrl: undefined } : l)
                                    }));
                                    setAbsenceJustificationStudent(prev => prev ? {
                                      ...prev,
                                      logs: prev.logs.map(l => l.id === log.id ? { ...l, justificationDocUrl: undefined } : l)
                                    } : null);
                                  }}
                                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                  title="حذف الوثيقة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* زر الحفظ والإغلاق */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[11px] text-slate-500">
                تُحفظ كافة التبريرات والوثائق الرقمية تلقائياً في السجل المحلي للتلميذ
              </span>
              <button
                onClick={() => {
                  setAbsenceJustificationStudent(null);
                  showNotice('تم تحديث حالة الغياب وتبريرات رادار اليقظة بنجاح!');
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm transition cursor-pointer"
              >
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة معاينة وثيقة التبرير الرقمية بحجم كامل */}
      {previewJustificationDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewJustificationDoc(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] bg-slate-900 rounded-3xl p-4 overflow-hidden border border-slate-700 shadow-2xl flex flex-col items-center">
            <div className="w-full flex justify-between items-center pb-3 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>معاينة وثيقة التبرير الرقمية المرفقة</span>
              </span>
              <button
                onClick={() => setPreviewJustificationDoc(null)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center w-full">
              <img
                src={previewJustificationDoc}
                alt="صورة التبرير الرقمية"
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-lg border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {isAdminManagerOpen && (
        <AdminSubscriptionManager
          currentUser={currentUser || ADMIN_USER}
          onClose={() => setIsAdminManagerOpen(false)}
          onSubscriptionUpdated={() => setSubscriptionRefreshTick(t => t + 1)}
        />
      )}
    </div>
  );
}

