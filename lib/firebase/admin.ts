import fs from "fs"
import path from "path"
import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app"
import { getFirestore, type Firestore, Timestamp } from "firebase-admin/firestore"

let app: App | undefined
let db: Firestore | undefined

function getAdminProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    null
  )
}

function loadServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  if (!raw) return null

  const normalized = raw.startsWith("{")
    ? raw
    : fs.existsSync(path.resolve(raw))
      ? fs.readFileSync(path.resolve(raw), "utf8")
      : raw

  return JSON.parse(normalized)
}

function initializeFirebase(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const projectId = getAdminProjectId()
  const serviceAccount = loadServiceAccountFromEnv()

  if (serviceAccount) {
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId || undefined,
    })
    return app
  }

  if (projectId) {
    app = initializeApp({
      projectId,
      credential: applicationDefault(),
    })
    return app
  }

  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID/NEXT_PUBLIC_FIREBASE_PROJECT_ID."
  )
}

export function getFirestoreDB(): Firestore {
  if (!app) {
    app = initializeFirebase()
  }

  if (!db) {
    db = getFirestore(app)
    try {
      db.settings({ ignoreUndefinedProperties: true })
    } catch {
      // Settings can only be configured once.
    }
  }

  return db
}

export function convertTimestamp(timestamp: any): Date {
  if (timestamp?.toDate) {
    return timestamp.toDate()
  }
  if (timestamp instanceof Date) {
    return timestamp
  }
  if (typeof timestamp === "string") {
    return new Date(timestamp)
  }
  return new Date()
}

export function docToObject(doc: any): any {
  if (!doc) return null

  const data = doc.data()
  if (!data) return null

  return {
    id: doc.id,
    ...data,
    created_at: data.created_at ? convertTimestamp(data.created_at) : new Date(),
    updated_at: data.updated_at ? convertTimestamp(data.updated_at) : new Date(),
    date: data.date ? convertTimestamp(data.date) : undefined,
    expires_at: data.expires_at ? convertTimestamp(data.expires_at) : undefined,
    settled_at: data.settled_at ? convertTimestamp(data.settled_at) : undefined,
    sent_at: data.sent_at ? convertTimestamp(data.sent_at) : undefined,
  }
}

export function prepareDataForFirestore(data: any): any {
  const prepared: any = { ...data }

  Object.keys(prepared).forEach((key) => {
    if (prepared[key] instanceof Date) {
      prepared[key] = Timestamp.fromDate(prepared[key])
    }
    if (prepared[key] === undefined) {
      delete prepared[key]
    }
  })

  return prepared
}

export async function createDocument(collection: string, data: any) {
  const database = getFirestoreDB()
  const preparedData = prepareDataForFirestore({
    ...data,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })
  const docRef = await database.collection(collection).add(preparedData)
  const doc = await docRef.get()
  return docToObject(doc)
}
