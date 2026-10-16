import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validate Connection to Firestore on startup as required by skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firebase Firestore connection established successfully!');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("⚠️ Firebase Firestore is currently offline or connecting:", error.message);
    }
  }
}

testConnection();
