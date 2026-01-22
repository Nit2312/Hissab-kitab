import { getFirestoreDB, docToObject, prepareDataForFirestore } from './admin';
import { COLLECTIONS } from './collections';
import { Timestamp } from 'firebase-admin/firestore';

// Helper to validate document ID format (Firestore uses alphanumeric IDs)
export function isValidFirestoreId(id: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(id) && id.length > 0 && id.length <= 1500;
}

// Helper to get a document by ID
export async function getDocumentById(collection: string, id: string) {
  const db = getFirestoreDB();
  const doc = await db.collection(collection).doc(id).get();
  if (!doc.exists) return null;
  return docToObject(doc);
}

// Helper to create a document
export async function createDocument(collection: string, data: any) {
  const db = getFirestoreDB();
  const now = Timestamp.now();
  const docData = {
    ...prepareDataForFirestore(data),
    created_at: now,
    updated_at: now,
  };
  const docRef = await db.collection(collection).add(docData);
  const doc = await docRef.get();
  return docToObject(doc);
}

// Helper to update a document
export async function updateDocument(collection: string, id: string, data: any) {
  const db = getFirestoreDB();
  const updateData = {
    ...prepareDataForFirestore(data),
    updated_at: Timestamp.now(),
  };
  await db.collection(collection).doc(id).update(updateData);
  return getDocumentById(collection, id);
}

// Helper to delete a document
export async function deleteDocument(collection: string, id: string) {
  const db = getFirestoreDB();
  await db.collection(collection).doc(id).delete();
}

// Helper to query documents
export async function queryDocuments(
  collection: string,
  filters: Array<{ field: string; operator: any; value: any }>,
  orderBy?: { field: string; direction: 'asc' | 'desc' },
  limit?: number
) {
  const db = getFirestoreDB();
  let query: any = db.collection(collection);

  // Apply filters
  filters.forEach(filter => {
    query = query.where(filter.field, filter.operator, filter.value);
  });

  // Apply ordering
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.direction);
  }

  // Apply limit
  if (limit) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => docToObject(doc));
}

// Helper to get documents by array of IDs
export async function getDocumentsByIds(collection: string, ids: string[]) {
  if (ids.length === 0) return [];
  
  const db = getFirestoreDB();
  // Firestore has a limit of 10 items for 'in' queries, so we need to batch
  const batches: Promise<any[]>[] = [];
  
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const batchPromise = Promise.all(
      batch.map(id => getDocumentById(collection, id))
    );
    batches.push(batchPromise);
  }
  
  const results = await Promise.all(batches);
  return results.flat().filter(Boolean);
}
