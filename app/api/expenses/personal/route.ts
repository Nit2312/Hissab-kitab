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

    console.log('Checking personal expenses for user:', user.id, user.email);

    const db = getFirestoreDB();

    // Get all personal expenses (non-group expenses)
    const personalExpensesSnapshot = await db.collection(COLLECTIONS.EXPENSES)
      .where('group_id', '==', null)
      .get();

    const personalExpenses = personalExpensesSnapshot.docs.map(doc => {
      const expense = docToObject(doc);
      return {
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount || 0),
        paid_by: expense.paid_by,
        date: expense.date,
        category: expense.category,
        split_type: expense.split_type,
        created_at: expense.created_at
      };
    });

    console.log(`Found ${personalExpenses.length} personal expenses total`);

    // Filter expenses where user is involved (either paid by or has splits)
    const userExpenses = [];
    
    for (const expense of personalExpenses) {
      // Check if user paid for this expense
      if (expense.paid_by === user.id) {
        userExpenses.push({
          ...expense,
          userRole: 'payer'
        });
        continue;
      }

      // Check if user has splits for this expense
      const splitsSnapshot = await db.collection(COLLECTIONS.EXPENSE_SPLITS)
        .where('expense_id', '==', expense.id)
        .where('user_id', '==', user.id)
        .get();

      if (!splitsSnapshot.empty) {
        const splitAmount = splitsSnapshot.docs.reduce((sum, doc) => {
          return sum + Number(doc.data().amount || 0);
        }, 0);

        userExpenses.push({
          ...expense,
          userRole: 'participant',
          splitAmount,
          splitCount: splitsSnapshot.docs.length
        });
      }
    }

    console.log(`User is involved in ${userExpenses.length} personal expenses`);

    // Calculate balances
    let totalPaid = 0;
    let totalOwed = 0;

    userExpenses.forEach(expense => {
      if (expense.userRole === 'payer') {
        totalPaid += expense.amount;
      } else if (expense.userRole === 'participant') {
        totalOwed += (expense as any).splitAmount;
      }
    });

    const netBalance = totalPaid - totalOwed;

    console.log('Personal expense summary:', {
      totalPaid,
      totalOwed,
      netBalance
    });

    return NextResponse.json({
      expenses: userExpenses,
      summary: {
        totalPaid,
        totalOwed,
        netBalance
      }
    });

  } catch (error: any) {
    console.error('Error checking personal expenses:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
