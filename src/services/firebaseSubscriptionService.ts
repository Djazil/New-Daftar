import {
  collection, doc, setDoc, deleteDoc, getDocs, onSnapshot,
  getDoc, getDocFromServer
} from 'firebase/firestore';
import { db } from './firebase';
import { TeacherSubscription } from '../types';

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
 * حذف حساب أستاذ نهائياً من Firestore مع إضافته للقائمة السوداء للمحذوفات
 */
export async function deleteSubscriptionFromFirestore(teacherEmail: string): Promise<boolean> {
  const cleanEmail = teacherEmail.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `subscriptions/${docKey}`;

  try {
    // 1. مسح مستند الاشتراك
    await deleteDoc(doc(db, 'subscriptions', docKey));
    
    // 2. إضافة إلى قائمة المحذوفات في Firestore
    await setDoc(doc(db, 'deleted_subscriptions', docKey), {
      teacherEmail: cleanEmail,
      deletedAt: new Date().toISOString(),
      deletedBy: 'djazild@gmail.com'
    });

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

/**
 * جلب قائمة البريد الممنوع/المحذوف نهائياً من Firestore
 */
export async function fetchDeletedSubscriptionsFromFirestore(): Promise<string[]> {
  const path = 'deleted_subscriptions';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: string[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.teacherEmail) {
        list.push(data.teacherEmail.trim().toLowerCase());
      }
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
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
    handleFirestoreError(err, OperationType.DELETE, `deleted_subscriptions/${docKey}`);
    return false;
  }
}
