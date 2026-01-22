import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB, docToObject, createDocument } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getFirestoreDB();
    const transactionsSnapshot = await db.collection(COLLECTIONS.KHATA_TRANSACTIONS)
      .where('owner_id', '==', user.id)
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => docToObject(doc));

    // Fetch customer details for each transaction
    const transactionsData = await Promise.all(
      transactions.map(async (t) => {
        const customerDoc = await db.collection(COLLECTIONS.CUSTOMERS).doc(t.customer_id).get();
        const customer = customerDoc.exists ? customerDoc.data() : null;

        return {
          id: t.id,
          customer_id: t.customer_id,
          customer: customer?.name || 'Unknown',
          type: t.type,
          amount: t.amount,
          date: t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date.split('T')[0],
          description: t.description || null,
          created_at: t.created_at instanceof Date ? t.created_at.toISOString() : t.created_at,
        };
      })
    );

    return NextResponse.json(transactionsData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { customer_id, type, amount, description, date } = await request.json();

    if (!customer_id || !type || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getFirestoreDB();
    const transactionDate = date ? new Date(date) : new Date();
    
    const transaction = await createDocument(COLLECTIONS.KHATA_TRANSACTIONS, {
      owner_id: user.id,
      customer_id: customer_id,
      type,
      amount: Number(amount),
      description: description || null,
      date: transactionDate,
    });

    // Get customer details
    const customerDoc = await db.collection(COLLECTIONS.CUSTOMERS).doc(customer_id).get();
    const customer = customerDoc.exists ? customerDoc.data() : null;

    return NextResponse.json({
      id: transaction.id,
      customer_id: transaction.customer_id,
      customer: customer?.name || 'Unknown',
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date instanceof Date ? transaction.date.toISOString().split('T')[0] : transaction.date.split('T')[0],
      description: transaction.description || null,
      created_at: transaction.created_at instanceof Date ? transaction.created_at.toISOString() : transaction.created_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
