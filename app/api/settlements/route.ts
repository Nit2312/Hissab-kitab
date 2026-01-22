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

    // Get settlements where user is either from_user or to_user
    const fromSettlementsSnapshot = await db.collection(COLLECTIONS.SETTLEMENTS)
      .where('from_user_id', '==', user.id)
      .get();

    const toSettlementsSnapshot = await db.collection(COLLECTIONS.SETTLEMENTS)
      .where('to_user_id', '==', user.id)
      .get();

    // Combine and deduplicate
    const allSettlements = new Map();
    [...fromSettlementsSnapshot.docs, ...toSettlementsSnapshot.docs].forEach(doc => {
      allSettlements.set(doc.id, docToObject(doc));
    });

    const settlementsData = Array.from(allSettlements.values()).map(s => ({
      id: s.id,
      from_user_id: s.from_user_id,
      to_user_id: s.to_user_id,
      group_id: s.group_id || null,
      amount: s.amount,
      payment_method: s.payment_method || null,
      status: s.status,
      notes: s.notes || null,
      settled_at: s.settled_at instanceof Date ? s.settled_at.toISOString() : s.settled_at,
      created_at: s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at,
    }));

    // Sort by created_at descending (in-memory to avoid composite index requirements)
    settlementsData.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json(settlementsData);
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

    const { to_user_id, amount, group_id, payment_method, notes } = await request.json();

    if (!to_user_id || !amount) {
      return NextResponse.json({ error: 'to_user_id and amount are required' }, { status: 400 });
    }

    const now = Timestamp.now();
    const settlement = await createDocument(COLLECTIONS.SETTLEMENTS, {
      from_user_id: user.id,
      to_user_id: to_user_id,
      amount: Number(amount),
      group_id: group_id || null,
      payment_method: payment_method || null,
      notes: notes || null,
      status: 'completed',
      settled_at: now,
    });

    return NextResponse.json({
      id: settlement.id,
      from_user_id: settlement.from_user_id,
      to_user_id: settlement.to_user_id,
      group_id: settlement.group_id || null,
      amount: settlement.amount,
      payment_method: settlement.payment_method || null,
      status: settlement.status,
      notes: settlement.notes || null,
      settled_at: settlement.settled_at instanceof Date ? settlement.settled_at.toISOString() : settlement.settled_at,
      created_at: settlement.created_at instanceof Date ? settlement.created_at.toISOString() : settlement.created_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
