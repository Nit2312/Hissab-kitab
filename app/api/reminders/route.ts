import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB, docToObject, createDocument } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getFirestoreDB();

    // Get reminders where user is either from_user or to_user
    const fromRemindersSnapshot = await db.collection(COLLECTIONS.REMINDERS)
      .where('from_user_id', '==', user.id)
      .get();

    const toRemindersSnapshot = await db.collection(COLLECTIONS.REMINDERS)
      .where('to_user_id', '==', user.id)
      .get();

    // Combine and deduplicate
    const allReminders = new Map();
    [...fromRemindersSnapshot.docs, ...toRemindersSnapshot.docs].forEach(doc => {
      allReminders.set(doc.id, docToObject(doc));
    });

    const remindersData = Array.from(allReminders.values()).map(r => ({
      id: r.id,
      from_user_id: r.from_user_id,
      to_user_id: r.to_user_id || null,
      to_name: r.to_name || null,
      to_phone: r.to_phone || null,
      amount: r.amount,
      message: r.message || null,
      status: r.status,
      reminder_type: r.reminder_type,
      sent_at: r.sent_at instanceof Date ? r.sent_at.toISOString() : (r.sent_at || null),
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));

    // Sort by created_at descending (in-memory to avoid composite index requirements)
    remindersData.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json(remindersData);
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

    const { to_user_id, to_name, to_phone, amount, message, reminder_type } = await request.json();

    if (!amount) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 });
    }

    const reminder = await createDocument(COLLECTIONS.REMINDERS, {
      from_user_id: user.id,
      to_user_id: to_user_id || null,
      to_name: to_name || null,
      to_phone: to_phone || null,
      amount: Number(amount),
      message: message || null,
      reminder_type: reminder_type || 'manual',
      status: 'pending',
    });

    return NextResponse.json({
      id: reminder.id,
      from_user_id: reminder.from_user_id,
      to_user_id: reminder.to_user_id || null,
      to_name: reminder.to_name || null,
      to_phone: reminder.to_phone || null,
      amount: reminder.amount,
      message: reminder.message || null,
      status: reminder.status,
      reminder_type: reminder.reminder_type,
      created_at: reminder.created_at instanceof Date ? reminder.created_at.toISOString() : reminder.created_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
