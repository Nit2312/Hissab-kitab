import { Timestamp } from 'firebase-admin/firestore';
// Create a new document in a Firestore collection
export async function createDocument(collection: string, data: any) {
  const db = getFirestoreDB();
  const preparedData = prepareDataForFirestore({
    ...data,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });
  const docRef = await db.collection(collection).add(preparedData);
  const doc = await docRef.get();
  return docToObject(doc);
}
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let db: Firestore | undefined;

// Initialize Firebase Admin
function initializeFirebase(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Check if we have service account credentials
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  console.log('DEBUG: FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!serviceAccount);
  if (serviceAccount) {
    try {
      // Parse the service account key from environment variable
      const serviceAccountKey = JSON.parse(serviceAccount);
      console.log('DEBUG: serviceAccountKey.project_id:', serviceAccountKey.project_id);
      app = initializeApp({
        credential: cert(serviceAccountKey),
        projectId: serviceAccountKey.project_id,
      });
    } catch (error: any) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Please check your .env.local.local file.');
    }
  } else {
    // For local development, you can use Application Default Credentials
    // Make sure to set GOOGLE_APPLICATION_CREDENTIALS environment variable
    app = initializeApp();
  }

  return app;
}

// Get Firestore instance
export function getFirestoreDB(): Firestore {
  if (!app) {
    app = initializeFirebase();
  }
  
  if (!db) {
    try {
      // Initialize Firestore - connect to default database
      // For Enterprise edition, explicitly specify the database
      // The default database ID is '(default)' but we can omit it
      db = getFirestore(app);
      
      // Set Firestore settings (can only be called once)
      try {
        db.settings({
          ignoreUndefinedProperties: true,
        });
      } catch (settingsError) {
        // Settings already configured, ignore
      }
      
      console.log('✅ Firestore initialized - Project:', app.options.projectId);
    } catch (error: any) {
      console.error('❌ Firestore initialization error:', error);
      throw error;
    }
  }
  
  return db;
}

// Helper function to convert Firestore timestamp to Date
export function convertTimestamp(timestamp: any): Date {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
}

// Helper function to convert Firestore document to plain object
export function docToObject(doc: any): any {
  if (!doc) return null;
  
  const data = doc.data();
  if (!data) return null;
  
  return {
    id: doc.id,
    ...data,
    // Convert timestamps
    created_at: data.created_at ? convertTimestamp(data.created_at) : new Date(),
    updated_at: data.updated_at ? convertTimestamp(data.updated_at) : new Date(),
    date: data.date ? convertTimestamp(data.date) : undefined,
    expires_at: data.expires_at ? convertTimestamp(data.expires_at) : undefined,
    settled_at: data.settled_at ? convertTimestamp(data.settled_at) : undefined,
    sent_at: data.sent_at ? convertTimestamp(data.sent_at) : undefined,
  };
}

// Helper function to prepare data for Firestore (convert Date to Firestore Timestamp)
export function prepareDataForFirestore(data: any): any {
  const prepared: any = { ...data };
  
  // Convert Date objects to Firestore Timestamps
  Object.keys(prepared).forEach(key => {
    if (prepared[key] instanceof Date) {
      const { Timestamp } = require('firebase-admin/firestore');
      prepared[key] = Timestamp.fromDate(prepared[key]);
    }
    // Remove undefined values
    if (prepared[key] === undefined) {
      delete prepared[key];
    }
  });
  
  return prepared;
}

export {
  getFirestoreDB,
  createDocument,
  convertTimestamp,
  docToObject,
  prepareDataForFirestore
};
