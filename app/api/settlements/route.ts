import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import Settlement from '@/lib/mongodb/models/Settlement';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const userId = new mongoose.Types.ObjectId(user.id);

    const settlements = await Settlement.find({
      $or: [
        { from_user_id: userId },
        { to_user_id: userId }
      ]
    })
      .sort({ created_at: -1 })
      .lean();

    const settlementsData = settlements.map(s => ({
      id: s._id.toString(),
      from_user_id: s.from_user_id.toString(),
      to_user_id: s.to_user_id.toString(),
      group_id: s.group_id?.toString() || null,
      amount: s.amount,
      payment_method: s.payment_method || null,
      status: s.status,
      notes: s.notes || null,
      settled_at: s.settled_at.toISOString(),
      created_at: s.created_at.toISOString(),
    }));

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

    await connectDB();
    const settlement = await Settlement.create({
      from_user_id: new mongoose.Types.ObjectId(user.id),
      to_user_id: new mongoose.Types.ObjectId(to_user_id),
      amount: Number(amount),
      group_id: group_id ? new mongoose.Types.ObjectId(group_id) : undefined,
      payment_method: payment_method || undefined,
      notes: notes || undefined,
      status: 'completed',
    });

    return NextResponse.json({
      id: settlement._id.toString(),
      from_user_id: settlement.from_user_id.toString(),
      to_user_id: settlement.to_user_id.toString(),
      group_id: settlement.group_id?.toString() || null,
      amount: settlement.amount,
      payment_method: settlement.payment_method || null,
      status: settlement.status,
      notes: settlement.notes || null,
      settled_at: settlement.settled_at.toISOString(),
      created_at: settlement.created_at.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
