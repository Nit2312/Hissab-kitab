import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB, docToObject } from '@/lib/firebase/admin';
import { updateDocument, deleteDocument, isValidFirestoreId } from '@/lib/firebase/helpers';
import { COLLECTIONS } from '@/lib/firebase/collections';

// Calculate member balance (positive = they are owed, negative = they owe)
async function calculateMemberBalance(memberId: string, groupId: string): Promise<number> {
  const db = getFirestoreDB();

  const memberDoc = await db.collection(COLLECTIONS.GROUP_MEMBERS).doc(memberId).get();
  if (!memberDoc.exists) {
    return 0;
  }

  const member = docToObject(memberDoc);

  // Get all expenses for this group
  const groupExpensesSnapshot = await db.collection(COLLECTIONS.EXPENSES)
    .where('group_id', '==', groupId)
    .get();

  const groupExpenses = groupExpensesSnapshot.docs.map(doc => docToObject(doc));

  let balance = 0;

  for (const expense of groupExpenses) {
    // Get all splits for this expense
    const splitsSnapshot = await db.collection(COLLECTIONS.EXPENSE_SPLITS)
      .where('expense_id', '==', expense.id)
      .get();

    const splits = splitsSnapshot.docs.map(doc => docToObject(doc));
    const memberSplit = splits.find(s => s.member_id === memberId);
    if (!memberSplit) continue;

    const splitAmount = Number(memberSplit.amount);
    const isPaid = memberSplit.is_paid;

    // If member paid this expense
    if (member.user_id && expense.paid_by === member.user_id) {
      // They paid, so they're owed by others (positive balance)
      // But if their own split is unpaid, they still owe their share
      if (!isPaid) {
        balance -= splitAmount; // They owe their share
      }
      // The amount they're owed is calculated from other members' unpaid splits
      const otherUnpaidSplits = splits
        .filter(s => s.member_id !== memberId && !s.is_paid)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      balance += otherUnpaidSplits;
    } else {
      // Member didn't pay, so they owe their share if unpaid
      if (!isPaid) {
        balance -= splitAmount; // They owe this amount
      }
    }
  }

  return balance;
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
    const { name, email, phone } = body;

    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!isValidFirestoreId(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid member ID format' }, { status: 400 });
    }

    const db = getFirestoreDB();
    const memberDoc = await db.collection(COLLECTIONS.GROUP_MEMBERS).doc(resolvedParams.id).get();

    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = docToObject(memberDoc);

    // Check if user is the group creator
    const groupDoc = await db.collection(COLLECTIONS.GROUPS).doc(member.group_id).get();
    if (!groupDoc.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    const group = docToObject(groupDoc);
    if (group.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the group creator can edit members' }, { status: 403 });
    }

    // Update member
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;

    const updatedMember = await updateDocument(COLLECTIONS.GROUP_MEMBERS, resolvedParams.id, updateData);

    return NextResponse.json({
      id: updatedMember.id,
      name: updatedMember.name,
      email: updatedMember.email || null,
      phone: updatedMember.phone || null,
      user_id: updatedMember.user_id || null,
      is_registered: updatedMember.is_registered,
    });
  } catch (error: any) {
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
      return NextResponse.json({ error: 'Invalid member ID format' }, { status: 400 });
    }

    const db = getFirestoreDB();
    const memberDoc = await db.collection(COLLECTIONS.GROUP_MEMBERS).doc(resolvedParams.id).get();

    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = docToObject(memberDoc);

    const groupDoc = await db.collection(COLLECTIONS.GROUPS).doc(member.group_id).get();
    if (!groupDoc.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = docToObject(groupDoc);
    const isCreator = group.created_by === user.id;
    const isMember = member.user_id === user.id;

    // Only creator can delete members, or member can delete themselves (leave)
    if (!isCreator && !isMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // If member is leaving (not creator deleting), check balance
    if (isMember && !isCreator) {
      const balance = await calculateMemberBalance(resolvedParams.id, member.group_id);
      if (Math.abs(balance) > 0.01) { // Allow small floating point differences
        return NextResponse.json({ 
          error: 'Cannot leave group with outstanding balance. Please settle all expenses first.',
          balance: balance 
        }, { status: 400 });
      }
    }

    // Delete expense splits for this member
    const splitsSnapshot = await db.collection(COLLECTIONS.EXPENSE_SPLITS)
      .where('member_id', '==', resolvedParams.id)
      .get();
    
    const batch = db.batch();
    splitsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection(COLLECTIONS.GROUP_MEMBERS).doc(resolvedParams.id));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check member balance
export async function GET(
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
      return NextResponse.json({ error: 'Invalid member ID format' }, { status: 400 });
    }

    const db = getFirestoreDB();
    const memberDoc = await db.collection(COLLECTIONS.GROUP_MEMBERS).doc(resolvedParams.id).get();

    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = docToObject(memberDoc);
    const balance = await calculateMemberBalance(resolvedParams.id, member.group_id);

    return NextResponse.json({ balance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
