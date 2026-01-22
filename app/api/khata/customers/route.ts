import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB, docToObject } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getFirestoreDB();

    // Fetch customers
    const customersSnapshot = await db.collection(COLLECTIONS.CUSTOMERS)
      .where('owner_id', '==', user.id)
      .orderBy('name', 'asc')
      .get();

    const customers = customersSnapshot.docs.map(doc => docToObject(doc));

    // Fetch all transactions
    const transactionsSnapshot = await db.collection(COLLECTIONS.KHATA_TRANSACTIONS)
      .where('owner_id', '==', user.id)
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc')
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => docToObject(doc));

    // Calculate balances for each customer
    const customersWithBalances = customers.map(customer => {
      const customerTransactions = transactions.filter(
        t => t.customer_id === customer.id
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
          const transDate = trans.date instanceof Date ? trans.date : new Date(trans.date);
          lastTransaction = transDate.toISOString().split('T')[0];
        }
      });

      return {
        id: customer.id,
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
