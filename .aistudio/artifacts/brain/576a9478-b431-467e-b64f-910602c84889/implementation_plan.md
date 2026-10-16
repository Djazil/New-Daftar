# Official Firebase Firestore Direct Integration & Real-Time Activation Sync Plan

In response to the user's explicit choices (direct Firebase Firestore setup and real-time cloud sync with instant alerts for new registration requests), this plan outlines the architecture for connecting the application directly to Firebase Firestore, deploying robust security rules, and wiring live `onSnapshot` listeners to ensure teacher registration requests instantly reach the admin dashboard (`AdminSubscriptionManager`) from any device or domain (Netlify, GitHub, AI Studio).

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following structural architecture during Turn 1 clarification:
> 1. **Real-time Live Sync & Instant Alerts**: Admin dashboard receives live notification toasts whenever a teacher registers or submits an activation request.
> 2. **Official Firebase Firestore SDK Direct Integration**: Direct database persistence using Firebase Firestore, replacing local-only fallbacks so data syncs across all devices, browsers, and host domains.

---

## 1. Overview & Core Concept

- **Overarching Goal**: Eliminate data isolation on static hosts (like Netlify) by migrating the subscription registry to a centralized Firebase Firestore database.
- **Key Experience**:
  - Teachers registering via Google or submitting BaridiMob activation proofs write directly to the `/subscriptions` and `/subscription_requests` Firestore collections.
  - The Admin (`djazild@gmail.com`) hears new incoming requests in real time via Firestore `onSnapshot` active listeners, receiving instant toast notifications and status badge counters.
  - Admin activation, extension, suspension, or deletion operations perform transactional writes to Firestore, updating the teacher's status live without manual browser reloads.

---

## 2. User Experience & Visual Design

- **Admin Control Panel Live Updates**:
  - **Live Counter Badges**: Real-time counter badge showing pending requests (`طلبات الجدد بانتظار التفعيل`).
  - **Instant Toast Notification**: High-visibility banner when a new request arrives while the admin dashboard is open.
  - **Action Status Feedback**: Seamless button state spinners during Firestore mutations (`جاري التفعيل...`, `جاري الحفظ...`).
- **Teacher Registration & Subscription Flow**:
  - **Single-Click Request Submission**: Seamless Google Login auto-creates a pending subscription record in Firestore.
  - **Direct WhatsApp Deep Link**: Encoded `https://wa.me/213656636033?text=...` deep link opens WhatsApp with full encoded request message.
  - **Live Activation Banner**: Teachers see their status transition from `pending` to `active` immediately upon admin approval.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Firebase Firestore as Single Source of Truth**:
  - *Chosen Approach*: Official `@google/genai` & `firebase/firestore` SDK initialization loaded from `firebase-applet-config.json` with `getDocFromServer` connection verification on app boot.
  - *Why*: Static hosts like Netlify do not run local Node.js Express servers. Firestore provides global high-availability persistence across all domains.
  - *Fallback Strategy*: Local `localStorage` acts as an optimistic offline cache, ensuring zero latency UI rendering while Firestore syncing completes.

- **Decision 2: Strict Access Control & Role Protection in Rules**:
  - *Chosen Approach*: Enforce `isAdmin()` helper check in `firestore.rules` for write/activate/delete operations (`request.auth.token.email == 'djazild@gmail.com'`).
  - *Why*: Prevents identity spoofing or unauthorized self-activation by non-admin users.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User & Admin Web Clients                        │
│             (Netlify SPA / Mobile / Desktop - React 19)                │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
    1. Google Sign-In & Payment Proofs      2. Live Firestore Listener
    (addDoc / setDoc to /subscriptions)     (onSnapshot /subscriptions)
                    │                                │
                    ▼                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Firebase Firestore Database                        │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ /subscriptions/{emailKey}                                      │   │
│   │   - teacherEmail, teacherName, planId, status, requestedAt...   │   │
│   └────────────────────────────────────────────────────────────────┘   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ /subscription_requests/{requestId}                             │   │
│   │   - teacherEmail, proof, timestamp, status                     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Planned Implementation Steps

1. **Step 1: Firebase Blueprint & Config Preparation**:
   - Create/update `firebase-blueprint.json` defining `EntityDefinition` for `Subscription` and `SubscriptionRequest`.
   - Ensure `firebase-applet-config.json` is loaded cleanly into `src/services/firebase.ts`.

2. **Step 2: Firestore SDK Service Layer (`src/services/firebaseSubscriptionService.ts`)**:
   - Initialize `db` with `getFirestore(app, config.firestoreDatabaseId)`.
   - Add `testConnection()` using `getDocFromServer(doc(db, 'test', 'connection'))`.
   - Implement `handleFirestoreError` with structured `FirestoreErrorInfo` throwing JSON errors for diagnostics.
   - Implement `subscribeToAllSubscriptions(callback)` using `onSnapshot(collection(db, 'subscriptions'))`.
   - Implement `saveSubscriptionToFirestore(sub)`, `activateSubscriptionInFirestore(email, planId, options)`, and `deleteSubscriptionFromFirestore(email)`.

3. **Step 3: Update `subscriptionService.ts` & Admin UI**:
   - Route `fetchSubscriptionsFromServer` and `saveAllSubscriptions` through the new Firebase service layer.
   - Wire `onSnapshot` in `AdminSubscriptionManager.tsx` to automatically trigger toast alerts when pending requests count increases.
   - Keep WhatsApp deep link generator `createWhatsAppActivationLink` using `wa.me/213656636033` with full `encodeURIComponent` encoding.

4. **Step 4: Rules & ESLint Audit**:
   - Audit `firestore.rules` to ensure `/subscriptions/{teacherId}` read is allowed for the owner or admin, and write is strictly restricted to `isAdmin()`.
   - Compile and verify applet build state via `compile_applet` and `lint_applet`.
