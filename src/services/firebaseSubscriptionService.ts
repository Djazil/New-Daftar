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
 * مع حماية كاملة ضد الكتابة العكسية (لا يتم تحويل حساب مفعل إلى قيد المراجعة أبداً)
 */
export async function fetchOrCreateUserProfileInFirestore(user: AuthUser): Promise<UserProfileDocument | null> {
  const cleanEmail = user.email.trim().toLowerCase();
  const emailDocKey = emailToDocKey(cleanEmail);
  const uid = (user as any).uid || auth.currentUser?.uid || emailDocKey;
  const path = `users/${uid}`;
  const isAdminEmail = cleanEmail === 'djazild@gmail.com';

  try {
    // فحص وثيقة الاشتراك ووثيقة البريد أولاً لمعرفة ما إذا كان الأستاذ مفعلاً مسبقاً
    let isAlreadyActiveInCloud = isAdminEmail;
    try {
      const subSnap = await getDoc(doc(db, 'subscriptions', emailDocKey));
      if (subSnap.exists() && (subSnap.data() as TeacherSubscription)?.status === 'active') {
        isAlreadyActiveInCloud = true;
      }
      if (!isAlreadyActiveInCloud && uid !== emailDocKey) {
        const emailUserSnap = await getDoc(doc(db, 'users', emailDocKey));
        if (emailUserSnap.exists() && (emailUserSnap.data() as UserProfileDocument)?.status === 'active') {
          isAlreadyActiveInCloud = true;
        }
      }
    } catch {}

    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfileDocument;
      if ((isAdminEmail || isAlreadyActiveInCloud) && data.status !== 'active') {
        const updatedActive = cleanUndefined({
          ...data,
          role: isAdminEmail ? 'admin' : (data.role || 'teacher'),
          status: 'active',
          updatedAt: new Date().toISOString()
        });
        await setDoc(userDocRef, updatedActive, { merge: true });
        return updatedActive;
      }
      return data;
    }

    const newProfile = cleanUndefined({
      uid,
      email: cleanEmail,
      name: user.name || cleanEmail.split('@')[0],
      role: isAdminEmail ? 'admin' : 'teacher',
      status: isAlreadyActiveInCloud ? 'active' : 'pending',
      isFirstTimeSetupDone: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await setDoc(userDocRef, newProfile, { merge: true });
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
 * جلب وثيقة اشتراك أستاذ واحد مباشرة من Firestore (عبر مفتاح البريد الإلكتروني)
 * يفحص كلاً من مجموعتي subscriptions و users لضمان عدم ضياع التفعيل
 */
export async function fetchSingleSubscriptionFromFirestore(email: string): Promise<TeacherSubscription | null> {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `subscriptions/${docKey}`;

  try {
    const [subSnap, userSnap, delSnap] = await Promise.all([
      getDoc(doc(db, 'subscriptions', docKey)),
      getDoc(doc(db, 'users', docKey)),
      getDoc(doc(db, 'deleted_subscriptions', docKey)).catch(() => null)
    ]);

    if (delSnap && delSnap.exists()) {
      return null;
    }

    let subData: TeacherSubscription | null = null;
    if (subSnap.exists()) {
      subData = subSnap.data() as TeacherSubscription;
      if (subData.status === 'deleted') return null;
    }

    if (userSnap.exists()) {
      const userData = userSnap.data() as UserProfileDocument;
      if (userData.status === 'deleted') return null;
      if (userData.status === 'active') {
        if (!subData) {
          subData = {
            teacherEmail: cleanEmail,
            teacherName: userData.name || cleanEmail.split('@')[0],
            planId: 'lifetime',
            status: 'active',
            amountDZD: 1000,
            isLifetime: true,
            expiresAt: null,
            activatedAt: userData.updatedAt || new Date().toISOString(),
            adminNotes: userData.adminNotes || 'حسابك مفعّل. يمكنك الدخول إلى الدفتر.'
          };
        } else if (subData.status !== 'active' && !subData.canceledAt && !subData.suspendedAt) {
          subData = {
            ...subData,
            status: 'active',
            isLifetime: true
          };
        }
      }
    }

    return subData;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

/**
 * استماع حي ومباشر لوثيقة اشتراك أستاذ محدد في Firestore لفتح الدفتر تلقائياً فور التفعيل
 */
export function subscribeToTeacherSubscriptionInFirestore(
  email: string,
  onUpdate: (sub: TeacherSubscription | null) => void
): () => void {
  if (!email) return () => {};
  const cleanEmail = email.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `subscriptions/${docKey}`;

  try {
    const unsub = onSnapshot(
      doc(db, 'subscriptions', docKey),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as TeacherSubscription;
          onUpdate(data);
        } else {
          onUpdate(null);
        }
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
 * تحويل وثيقة مستخدم من مجموعة users إلى سجل اشتراك متكامل عند عدم وجوده في subscriptions
 */
function userDocToSubscription(userData: UserProfileDocument): TeacherSubscription | null {
  const cleanEmail = (userData.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || userData.status === 'deleted') {
    return null;
  }
  const isActive = userData.status === 'active' || cleanEmail === 'djazild@gmail.com';
  const fallbackIso = '2026-01-01T00:00:00.000Z';
  return {
    teacherEmail: cleanEmail,
    teacherName: userData.name || cleanEmail.split('@')[0],
    planId: isActive ? 'lifetime' : 'none',
    status: isActive ? 'active' : (userData.status === 'suspended' ? 'suspended' : 'pending'),
    amountDZD: isActive ? 1000 : 0,
    requestedAt: userData.createdAt || userData.updatedAt || fallbackIso,
    activatedAt: isActive ? (userData.updatedAt || userData.createdAt || fallbackIso) : undefined,
    suspendedAt: userData.status === 'suspended' ? (userData.updatedAt || fallbackIso) : undefined,
    suspensionReason: userData.suspensionReason,
    expiresAt: null,
    isLifetime: isActive,
    adminNotes: userData.adminNotes || (isActive ? 'حسابك مفعّل. يمكنك الدخول إلى الدفتر.' : 'حساب مسجل سحابياً بانتظار التفعيل')
  };
}

/**
 * الاشتراك في الاستماع المباشر والحي لجميع الاشتراكات وحسابات المستخدمين من Firestore
 */
export function subscribeToAllSubscriptionsInFirestore(
  onUpdate: (subs: Record<string, TeacherSubscription>) => void
): () => void {
  const path = 'subscriptions';
  let latestSubsMap: Record<string, TeacherSubscription> = {};
  let latestUsersMap: Record<string, TeacherSubscription> = {};
  let deletedEmailsSet = new Set<string>();

  const emitMerged = () => {
    const combined: Record<string, TeacherSubscription> = {};

    // 1. إدراج المستخدمين المسجلين في users أولاً
    for (const [email, userSub] of Object.entries(latestUsersMap)) {
      if (!deletedEmailsSet.has(email)) {
        combined[email] = userSub;
      }
    }

    // 2. دمج وتغليب سجلات subscriptions المفصلة
    for (const [email, sub] of Object.entries(latestSubsMap)) {
      if (deletedEmailsSet.has(email) || sub.status === 'deleted') {
        delete combined[email];
        continue;
      }
      combined[email] = sub;
    }

    onUpdate(combined);
  };

  try {
    const unsubDeleted = onSnapshot(
      collection(db, 'deleted_subscriptions'),
      (snap) => {
        const nextDeleted = new Set<string>();
        snap.forEach((d) => {
          const data = d.data() as any;
          if (data?.email) nextDeleted.add(String(data.email).trim().toLowerCase());
          nextDeleted.add(d.id.trim().toLowerCase());
        });
        deletedEmailsSet = nextDeleted;
        emitMerged();
      },
      () => {}
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const uMap: Record<string, TeacherSubscription> = {};
        snap.forEach((docSnap) => {
          const uData = docSnap.data() as UserProfileDocument;
          const converted = userDocToSubscription(uData);
          if (converted) {
            uMap[converted.teacherEmail] = converted;
          }
        });
        latestUsersMap = uMap;
        emitMerged();
      },
      () => {}
    );

    const unsubSubs = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const map: Record<string, TeacherSubscription> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TeacherSubscription;
          if (data && data.teacherEmail && data.status !== 'deleted') {
            map[data.teacherEmail.trim().toLowerCase()] = data;
          }
        });
        latestSubsMap = map;
        emitMerged();
      },
      (error) => {
        console.warn('Firestore subscriptions listener warning:', error);
      }
    );

    return () => {
      unsubSubs();
      unsubUsers();
      unsubDeleted();
    };
  } catch (err) {
    console.warn('Firestore listener init warning:', err);
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
  const nowIso = new Date().toISOString();

  try {
    // عند حفظ اشتراك غير محذوف، نتأكد من إزالته من سجل المحذوفات السحابي
    if (sub.status !== 'deleted') {
      try {
        await deleteDoc(doc(db, 'deleted_subscriptions', docKey));
      } catch {}
    }

    const subPayload = cleanUndefined({
      ...sub,
      teacherEmail: cleanEmail,
      updatedAt: nowIso
    });

    // نستخدم setDoc بدون merge:true لضمان مسح الحقول القديمة المتعارضة (مثل activatedAt عند الإلغاء)
    await setDoc(doc(db, 'subscriptions', docKey), subPayload);

    const userPayload = cleanUndefined({
      uid: docKey,
      email: cleanEmail,
      name: sub.teacherName || cleanEmail.split('@')[0],
      role: cleanEmail === 'djazild@gmail.com' ? 'admin' : 'teacher',
      status: sub.status,
      suspensionReason: sub.suspensionReason || '',
      adminNotes: sub.adminNotes || '',
      updatedAt: nowIso
    });

    await setDoc(doc(db, 'users', docKey), userPayload, { merge: true });

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * جلب جميع الاشتراكات وحسابات الأساتذة المسجلة سحابياً دفعة واحدة من Firestore
 */
export async function fetchSubscriptionsFromFirestore(): Promise<Record<string, TeacherSubscription>> {
  const path = 'subscriptions';
  try {
    const [subsSnap, usersSnap, deletedSnap] = await Promise.all([
      getDocs(collection(db, 'subscriptions')),
      getDocs(collection(db, 'users')).catch(() => null),
      getDocs(collection(db, 'deleted_subscriptions')).catch(() => null)
    ]);

    const deletedSet = new Set<string>();
    if (deletedSnap) {
      deletedSnap.forEach((d) => {
        const data = d.data() as any;
        if (data?.email) deletedSet.add(String(data.email).trim().toLowerCase());
        deletedSet.add(d.id.trim().toLowerCase());
      });
    }

    const map: Record<string, TeacherSubscription> = {};

    // 1. قراءة جميع المستخدمين في users أولاً لضمان عدم ضياع أي حساب سحابي
    if (usersSnap) {
      usersSnap.forEach((docSnap) => {
        const uData = docSnap.data() as UserProfileDocument;
        const converted = userDocToSubscription(uData);
        if (converted && !deletedSet.has(converted.teacherEmail) && !deletedSet.has(emailToDocKey(converted.teacherEmail))) {
          map[converted.teacherEmail] = converted;
        }
      });
    }

    // 2. قراءة وثائق subscriptions وتغليبها
    subsSnap.forEach((docSnap) => {
      const data = docSnap.data() as TeacherSubscription;
      if (data && data.teacherEmail) {
        const cleanEmail = data.teacherEmail.trim().toLowerCase();
        const docKey = emailToDocKey(cleanEmail);
        if (deletedSet.has(cleanEmail) || deletedSet.has(docKey) || data.status === 'deleted') {
          delete map[cleanEmail];
        } else {
          map[cleanEmail] = data;
        }
      }
    });

    return map;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return {};
  }
}

/**
 * حذف سجل اشتراك الأستاذ نهائياً من Firestore وتسجيل الحذف لمنع عودته التلقائية
 */
export async function deleteSubscriptionFromFirestore(teacherEmail: string): Promise<boolean> {
  const cleanEmail = teacherEmail.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const path = `subscriptions/${docKey}`;
  const nowIso = new Date().toISOString();

  try {
    await Promise.all([
      deleteDoc(doc(db, 'subscriptions', docKey)),
      deleteDoc(doc(db, 'users', docKey)).catch(() => {}),
      setDoc(doc(db, 'deleted_subscriptions', docKey), {
        email: cleanEmail,
        docKey,
        deletedAt: nowIso
      })
    ]);

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
      const data = docSnap.data() as any;
      if (data?.email) {
        list.push(String(data.email).trim().toLowerCase());
      }
      list.push(docSnap.id.trim().toLowerCase());
    });
    return Array.from(new Set(list));
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

