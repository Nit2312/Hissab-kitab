import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB, docToObject } from '@/lib/firebase/admin';
import { updateDocument, deleteDocument, isValidFirestoreId } from '@/lib/firebase/helpers';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';

function normalizeCategory(category: unknown) {
  if (typeof category !== 'string') return 'Others';
  if (category.toLowerCase() === 'other') return 'Others';
  return category;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, category, date } = body;

    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!isValidFirestoreId(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid expense ID format' }, { status: 400 });
    }

    const db = getFirestoreDB();
    const expenseDoc = await db.collection(COLLECTIONS.EXPENSES).doc(resolvedParams.id).get();

    if (!expenseDoc.exists) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const expense = docToObject(expenseDoc);

    // Check if user owns this expense
    if (expense.paid_by !== user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this expense' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (category !== undefined) updateData.category = normalizeCategory(category);
    if (date !== undefined) updateData.date = Timestamp.fromDate(new Date(date));

    const oldAmount = expense.amount;
    const updatedExpense = await updateDocument(COLLECTIONS.EXPENSES, resolvedParams.id, updateData);

    // If amount changed and expense has a group, update expense splits
    if (amount !== undefined && expense.group_id && Number(amount) !== oldAmount) {
      const groupMembersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
        .where('group_id', '==', expense.group_id)
        .get();
      
      if (!groupMembersSnapshot.empty) {
        const newSplitAmount = Number(amount) / groupMembersSnapshot.size;
        const batch = db.batch();
        
        const splitsSnapshot = await db.collection(COLLECTIONS.EXPENSE_SPLITS)
          .where('expense_id', '==', resolvedParams.id)
          .get();
        
        splitsSnapshot.docs.forEach((splitDoc: FirebaseFirestore.QueryDocumentSnapshot) => {
          batch.update(splitDoc.ref, { amount: newSplitAmount });
        });
        
        await batch.commit();
      }
    }

    return NextResponse.json({
      id: updatedExpense.id,
      description: updatedExpense.description,
      amount: updatedExpense.amount,
      paid_by: updatedExpense.paid_by,
      date: updatedExpense.date instanceof Date ? updatedExpense.date.toISOString().split('T')[0] : updatedExpense.date.split('T')[0],
      category: normalizeCategory(updatedExpense.category),
      group_id: updatedExpense.group_id || null,
      split_type: updatedExpense.split_type,
    });
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!isValidFirestoreId(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid expense ID format' }, { status: 400 });
    }

    const db = getFirestoreDB();
    const expenseDoc = await db.collection(COLLECTIONS.EXPENSES).doc(resolvedParams.id).get();

    if (!expenseDoc.exists) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const expense = docToObject(expenseDoc);

    // Check if user owns this expense
    if (expense.paid_by !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this expense' }, { status: 403 });
    }

    // Delete expense splits first
    const splitsSnapshot = await db.collection(COLLECTIONS.EXPENSE_SPLITS)
      .where('expense_id', '==', resolvedParams.id)
      .get();
    
    const batch = db.batch();
    splitsSnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => batch.delete(doc.ref));
    batch.delete(db.collection(COLLECTIONS.EXPENSES).doc(resolvedParams.id));
    await batch.commit();

    // Broadcast WebSocket event for real-time updates (optional)
    try {
      const { broadcastExpenseUpdate } = await import('@/lib/websocket/server');
      broadcastExpenseUpdate('deleted', {
        id: resolvedParams.id,
        paid_by: expense.paid_by,
        date: expense.date,
        amount: expense.amount,
        category: expense.category,
        description: expense.description
      }, user.id);
    } catch (wsError: any) {
      // WebSocket server might not be running - that's okay
      console.log('WebSocket broadcast skipped (server not available):', wsError?.message || wsError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
