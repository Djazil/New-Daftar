import {
  collection, doc, setDoc, deleteDoc, getDocs, onSnapshot,
  getDoc, getDocFromServer
} from 'firebase/firestore';
import { db } from './firebase';
import { TeacherSubscription, AdminAuditLog } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export function emailToDocKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * الاشتراك في الاستماع المباشر والحي لجميع الاشتراكات من Firestore
 */
export function subscribeToAllSubscriptionsInFirestore(
  onUpdate: (subs: Record<string, TeacherSubscription>) => void
): () => void {
  const path = 'subscriptions';
  try {
    const unsub = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const map: Record<string, TeacherSubscription> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TeacherSubscription;
          if (data && data.teacherEmail) {
            map[data.teacherEmail.trim().toLowerCase()] = data;
          }
        });
        onUpdate(map);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return unsub;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return () => {};
  }
}

/**
 * حفظ أو تحديث بيانات أستاذ مباشرة في Firestore
 */
export async function saveSubscriptionToFirestore(sub: TeacherSubscription): Promise<boolean> {
  const cleanEmail = sub.teacherEmail.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `subscriptions/${docKey}`;

  try {
    await setDoc(doc(db, 'subscriptions', docKey), {
      ...sub,
      teacherEmail: cleanEmail,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * جلب جميع الاشتراكات دفعة واحدة من Firestore
 */
export async function fetchSubscriptionsFromFirestore(): Promise<Record<string, TeacherSubscription>> {
  const path = 'subscriptions';
  try {
    const snapshot = await getDocs(collection(db, path));
    const map: Record<string, TeacherSubscription> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as TeacherSubscription;
      if (data && data.teacherEmail) {
        map[data.teacherEmail.trim().toLowerCase()] = data;
      }
    });
    return map;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return {};
  }
}

/**
 * حذف سجل اشتراك الأستاذ من Firestore دون حظر بريده أو حذف حسابه
 */
export async function deleteSubscriptionFromFirestore(teacherEmail: string): Promise<boolean> {
  const cleanEmail = teacherEmail.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `subscriptions/${docKey}`;

  try {
    // 1. مسح مستند الاشتراك فقط
    await deleteDoc(doc(db, 'subscriptions', docKey));

    // 2. تنظيف أي سجل قديم في deleted_subscriptions لضمان عدم حظر الأستاذ
    try {
      await deleteDoc(doc(db, 'deleted_subscriptions', docKey));
    } catch {}

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

/**
 * تسجيل وتوثيق عملية إدارية في Firestore لسجل التدقيق الإداري
 */
export async function saveAdminAuditLogInFirestore(log: AdminAuditLog): Promise<boolean> {
  const path = `admin_audit_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'admin_audit_logs', log.id), {
      ...log,
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.warn('Audit log write warning:', err);
    return false;
  }
}

/**
 * جلب سجل العمليات الإدارية من Firestore
 */
export async function fetchAdminAuditLogsFromFirestore(): Promise<AdminAuditLog[]> {
  const path = 'admin_audit_logs';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: AdminAuditLog[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as AdminAuditLog;
      if (data && data.id) {
        list.push(data);
      }
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.warn('Audit log fetch warning:', err);
    return [];
  }
}

/**
 * جلب قائمة البريد المحذوف سابقاً مع إتاحة فك الحظر التلقائي
 */
export async function fetchDeletedSubscriptionsFromFirestore(): Promise<string[]> {
  // لا نقوم بإرجاع أي قائمة حظر لمنع حظر أي أستاذ من الدخول
  return [];
}

/**
 * إزالة البريد من القائمة السوداء للمحذوفات (عند استعادة الحساب)
 */
export async function removeDeletedSubscriptionFromFirestore(teacherEmail: string): Promise<boolean> {
  const cleanEmail = teacherEmail.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  try {
    await deleteDoc(doc(db, 'deleted_subscriptions', docKey));
    return true;
  } catch (err) {
    return false;
  }
}
