import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import KhataTransaction from '@/lib/mongodb/models/KhataTransaction';
import Customer from '@/lib/mongodb/models/Customer';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const transactions = await KhataTransaction.find({
      owner_id: new mongoose.Types.ObjectId(user.id)
    })
      .populate('customer_id', 'name phone')
      .sort({ date: -1, created_at: -1 })
      .limit(50)
      .lean();

    const transactionsData = transactions.map(t => ({
      id: t._id.toString(),
      customer_id: (t.customer_id as any)._id.toString(),
      customer: (t.customer_id as any).name,
      type: t.type,
      amount: t.amount,
      date: t.date.toISOString().split('T')[0],
      description: t.description || null,
      created_at: t.created_at.toISOString(),
    }));

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

    await connectDB();
    const transaction = await KhataTransaction.create({
      owner_id: new mongoose.Types.ObjectId(user.id),
      customer_id: new mongoose.Types.ObjectId(customer_id),
      type,
      amount: Number(amount),
      description: description || undefined,
      date: date ? new Date(date) : new Date(),
    });

    await transaction.populate('customer_id', 'name phone');

    return NextResponse.json({
      id: transaction._id.toString(),
      customer_id: transaction.customer_id._id.toString(),
      customer: (transaction.customer_id as any).name,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date.toISOString().split('T')[0],
      description: transaction.description || null,
      created_at: transaction.created_at.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
