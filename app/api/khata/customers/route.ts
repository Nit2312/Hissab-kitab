import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import Customer from '@/lib/mongodb/models/Customer';
import KhataTransaction from '@/lib/mongodb/models/KhataTransaction';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const userId = new mongoose.Types.ObjectId(user.id);

    // Fetch customers
    const customers = await Customer.find({ owner_id: userId })
      .sort({ name: 1 })
      .lean();

    // Fetch all transactions
    const transactions = await KhataTransaction.find({ owner_id: userId })
      .sort({ date: -1, created_at: -1 })
      .lean();

    // Calculate balances for each customer
    const customersWithBalances = customers.map(customer => {
      const customerTransactions = transactions.filter(
        t => t.customer_id.toString() === customer._id.toString()
      );

      let balance = 0;
      let totalCredit = 0;
      let totalPaid = 0;
      let lastTransaction: string | null = null;

      customerTransactions.forEach(trans => {
        if (trans.type === 'credit') {
          balance += Number(trans.amount);
          totalCredit += Number(trans.amount);
        } else {
          balance -= Number(trans.amount);
          totalPaid += Number(trans.amount);
        }
        if (!lastTransaction) {
          lastTransaction = trans.date.toISOString().split('T')[0];
        }
      });

      return {
        id: customer._id.toString(),
        name: customer.name,
        phone: customer.phone || null,
        balance,
        type: balance > 0 ? 'credit' as const : 'settled' as const,
        lastTransaction,
        totalCredit,
        totalPaid,
      };
    });

    return NextResponse.json(customersWithBalances);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
