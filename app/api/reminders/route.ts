import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import Reminder from '@/lib/mongodb/models/Reminder';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const userId = new mongoose.Types.ObjectId(user.id);

    const reminders = await Reminder.find({
      $or: [
        { from_user_id: userId },
        { to_user_id: userId }
      ]
    })
      .sort({ created_at: -1 })
      .lean();

    const remindersData = reminders.map(r => ({
      id: r._id.toString(),
      from_user_id: r.from_user_id.toString(),
      to_user_id: r.to_user_id?.toString() || null,
      to_name: r.to_name || null,
      to_phone: r.to_phone || null,
      amount: r.amount,
      message: r.message || null,
      status: r.status,
      reminder_type: r.reminder_type,
      sent_at: r.sent_at?.toISOString() || null,
      created_at: r.created_at.toISOString(),
    }));

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

    await connectDB();
    const reminder = await Reminder.create({
      from_user_id: new mongoose.Types.ObjectId(user.id),
      to_user_id: to_user_id ? new mongoose.Types.ObjectId(to_user_id) : undefined,
      to_name: to_name || undefined,
      to_phone: to_phone || undefined,
      amount: Number(amount),
      message: message || undefined,
      reminder_type: reminder_type || 'manual',
      status: 'pending',
    });

    return NextResponse.json({
      id: reminder._id.toString(),
      from_user_id: reminder.from_user_id.toString(),
      to_user_id: reminder.to_user_id?.toString() || null,
      to_name: reminder.to_name || null,
      to_phone: reminder.to_phone || null,
      amount: reminder.amount,
      message: reminder.message || null,
      status: reminder.status,
      reminder_type: reminder.reminder_type,
      created_at: reminder.created_at.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
