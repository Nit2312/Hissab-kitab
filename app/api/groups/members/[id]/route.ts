import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import GroupMember from '@/lib/mongodb/models/GroupMember';
import Group from '@/lib/mongodb/models/Group';
import ExpenseSplit from '@/lib/mongodb/models/ExpenseSplit';
import Expense from '@/lib/mongodb/models/Expense';
import mongoose from 'mongoose';

// Calculate member balance (positive = they are owed, negative = they owe)
async function calculateMemberBalance(memberId: string, groupId: string): Promise<number> {
  await connectDB();
  const memberObjectId = new mongoose.Types.ObjectId(memberId);
  const groupObjectId = new mongoose.Types.ObjectId(groupId);

  const member = await GroupMember.findById(memberId).lean();
  if (!member) {
    return 0;
  }

  // Get all expenses for this group
  const groupExpenses = await Expense.find({
    group_id: groupObjectId,
  }).lean();

  let balance = 0;

  for (const expense of groupExpenses) {
    // Get all splits for this expense
    const splits = await ExpenseSplit.find({
      expense_id: expense._id,
    }).lean();

    const memberSplit = splits.find(s => s.member_id.toString() === memberId);
    if (!memberSplit) continue;

    const splitAmount = Number(memberSplit.amount);
    const isPaid = memberSplit.is_paid;

    // If member paid this expense
    if (member.user_id && expense.paid_by.toString() === member.user_id.toString()) {
      // They paid, so they're owed by others (positive balance)
      // But if their own split is unpaid, they still owe their share
      if (!isPaid) {
        balance -= splitAmount; // They owe their share
      }
      // The amount they're owed is calculated from other members' unpaid splits
      const otherUnpaidSplits = splits
        .filter(s => s.member_id.toString() !== memberId && !s.is_paid)
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

    await connectDB();
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid member ID format' }, { status: 400 });
    }

    const member = await GroupMember.findById(resolvedParams.id);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if user is the group creator
    const group = await Group.findById(member.group_id);
    if (!group || group.created_by.toString() !== user.id) {
      return NextResponse.json({ error: 'Only the group creator can edit members' }, { status: 403 });
    }

    // Update member
    if (name !== undefined) member.name = name;
    if (email !== undefined) member.email = email || undefined;
    if (phone !== undefined) member.phone = phone || undefined;

    await member.save();

    return NextResponse.json({
      id: member._id.toString(),
      name: member.name,
      email: member.email || null,
      phone: member.phone || null,
      user_id: member.user_id?.toString() || null,
      is_registered: member.is_registered,
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

    await connectDB();
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid member ID format' }, { status: 400 });
    }

    const member = await GroupMember.findById(resolvedParams.id);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const group = await Group.findById(member.group_id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isCreator = group.created_by.toString() === user.id;
    const isMember = member.user_id?.toString() === user.id;

    // Only creator can delete members, or member can delete themselves (leave)
    if (!isCreator && !isMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // If member is leaving (not creator deleting), check balance
    if (isMember && !isCreator) {
      const balance = await calculateMemberBalance(resolvedParams.id, member.group_id.toString());
      if (Math.abs(balance) > 0.01) { // Allow small floating point differences
        return NextResponse.json({ 
          error: 'Cannot leave group with outstanding balance. Please settle all expenses first.',
          balance: balance 
        }, { status: 400 });
      }
    }

    // Delete expense splits for this member
    await ExpenseSplit.deleteMany({ member_id: member._id });

    // Delete member
    await GroupMember.findByIdAndDelete(resolvedParams.id);

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

    await connectDB();
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid member ID format' }, { status: 400 });
    }

    const member = await GroupMember.findById(resolvedParams.id);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const balance = await calculateMemberBalance(resolvedParams.id, member.group_id.toString());

    return NextResponse.json({ balance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
