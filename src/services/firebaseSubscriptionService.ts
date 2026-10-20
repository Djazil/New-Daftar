import {
  collection, doc, setDoc, deleteDoc, getDocs, onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
export { db, auth };

import { TeacherSubscription, AdminAuditLog, AuthUser } from '../types';

export interface UserProfileDocument {
  uid: string;
  email: string;
  name: string;
  role: 'teacher' | 'admin';
  status: 'pending' | 'active' | 'suspended' | 'deleted';
  isFirstTimeSetupDone?: boolean;
  createdAt: string;
  updatedAt: string;
  suspensionReason?: string;
  adminNotes?: string;
}

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
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
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
 * تنظيف الكائن من الحقول التي قيمتها undefined لتجنب أخطاء Firestore
 */
function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = cleanUndefined(val);
    }
  }
  return cleaned;
}

/**
 * جلب أو إنشاء ملف تعريف المستخدم بـ users/{uid} مباشرة من Firestore
 */
export async function fetchOrCreateUserProfileInFirestore(user: AuthUser): Promise<UserProfileDocument | null> {
  const cleanEmail = user.email.trim().toLowerCase();
  const uid = (user as any).uid || auth.currentUser?.uid || emailToDocKey(cleanEmail);
  const path = `users/${uid}`;
  const isAdminEmail = cleanEmail === 'djazild@gmail.com';

  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfileDocument;
      if (isAdminEmail && data.status !== 'active') {
        const updatedAdmin = cleanUndefined({
          ...data,
          role: 'admin',
          status: 'active',
          updatedAt: new Date().toISOString()
        });
        await setDoc(userDocRef, updatedAdmin, { merge: true });
        return updatedAdmin;
      }
      return data;
    }

    const newProfile = cleanUndefined({
      uid,
      email: cleanEmail,
      name: user.name || cleanEmail.split('@')[0],
      role: isAdminEmail ? 'admin' : 'teacher',
      status: isAdminEmail ? 'active' : 'pending',
      isFirstTimeSetupDone: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await setDoc(userDocRef, newProfile);
    return newProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return {
      uid,
      email: cleanEmail,
      name: user.name || cleanEmail,
      role: isAdminEmail ? 'admin' : 'teacher',
      status: isAdminEmail ? 'active' : 'pending',
      isFirstTimeSetupDone: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

/**
 * تحديث حالة حساب المستخدم بـ users/{uid} في Firestore
 */
export async function updateUserProfileStatusInFirestore(
  uidOrEmail: string,
  newStatus: 'pending' | 'active' | 'suspended' | 'deleted',
  adminNotes?: string
): Promise<boolean> {
  const cleanKey = emailToDocKey(uidOrEmail);
  const path = `users/${cleanKey}`;

  try {
    const payload = cleanUndefined({
      status: newStatus,
      adminNotes: adminNotes || '',
      updatedAt: new Date().toISOString()
    });

    await setDoc(doc(db, 'users', cleanKey), payload, { merge: true });
    await setDoc(doc(db, 'subscriptions', cleanKey), payload, { merge: true });

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    return false;
  }
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
    const subPayload = cleanUndefined({
      ...sub,
      teacherEmail: cleanEmail,
      updatedAt: new Date().toISOString()
    });

    await setDoc(doc(db, 'subscriptions', docKey), subPayload, { merge: true });

    const userPayload = cleanUndefined({
      email: cleanEmail,
      name: sub.teacherName || cleanEmail.split('@')[0],
      status: sub.status,
      updatedAt: new Date().toISOString()
    });

    await setDoc(doc(db, 'users', docKey), userPayload, { merge: true });

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
 * حذف سجل اشتراك الأستاذ من Firestore
 */
export async function deleteSubscriptionFromFirestore(teacherEmail: string): Promise<boolean> {
  const cleanEmail = teacherEmail.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `subscriptions/${docKey}`;

  try {
    await deleteDoc(doc(db, 'subscriptions', docKey));
    const userPayload = cleanUndefined({
      status: 'deleted',
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, 'users', docKey), userPayload, { merge: true });

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function fetchDeletedSubscriptionsFromFirestore(): Promise<string[]> {
  const path = 'deleted_subscriptions';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: string[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.id);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function removeDeletedSubscriptionFromFirestore(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `deleted_subscriptions/${docKey}`;
  try {
    await deleteDoc(doc(db, 'deleted_subscriptions', docKey));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function saveAdminAuditLogInFirestore(log: AdminAuditLog): Promise<boolean> {
  const path = 'admin_audit_logs';
  try {
    const payload = cleanUndefined({
      ...log,
      timestamp: log.timestamp || new Date().toISOString()
    });
    const docRef = doc(collection(db, path));
    await setDoc(docRef, payload);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function fetchAdminAuditLogsFromFirestore(): Promise<AdminAuditLog[]> {
  const path = 'admin_audit_logs';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: AdminAuditLog[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as AdminAuditLog;
      if (data) list.push(data);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

/**
 * حفظ بيانات الفضاء التربوي للأستاذ (الأقسام، مواضع جلوس التلاميذ، التدرج، جدول التوقيت) في Firestore
 */
export async function saveTeacherWorkspaceToFirestore(teacherEmail: string, data: any): Promise<boolean> {
  if (!teacherEmail || !data) return false;
  const cleanEmail = teacherEmail.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `teachers/${docKey}`;

  try {
    const { uploadedPDFs, ...workspaceWithoutHeavyBlobs } = data;
    const payload = cleanUndefined({
      ...workspaceWithoutHeavyBlobs,
      teacherEmail: cleanEmail,
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, 'teachers', docKey), payload, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * جلب بيانات الفضاء التربوي للأستاذ من Firestore
 */
export async function loadTeacherWorkspaceFromFirestore(teacherEmail: string): Promise<any | null> {
  if (!teacherEmail) return null;
  const cleanEmail = teacherEmail.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `teachers/${docKey}`;

  try {
    const snap = await getDoc(doc(db, 'teachers', docKey));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

