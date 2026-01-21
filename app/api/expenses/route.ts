import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import Expense from '@/lib/mongodb/models/Expense';
import ExpenseSplit from '@/lib/mongodb/models/ExpenseSplit';
import GroupMember from '@/lib/mongodb/models/GroupMember';
import Group from '@/lib/mongodb/models/Group';
import User from '@/lib/mongodb/models/User';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const userId = new mongoose.Types.ObjectId(user.id);

    // Get user type
    const userDoc = await User.findById(userId).select('user_type');
    const userType = userDoc?.user_type || 'personal';

    let expensesQuery: any = {};

    if (userType === 'personal') {
      // Get groups user is a member of
      const groupMembers = await GroupMember.find({ user_id: userId });
      const groupIds = groupMembers.map(gm => gm.group_id);

      if (groupIds.length > 0) {
        expensesQuery = {
          $or: [
            { paid_by: userId },
            { group_id: { $in: groupIds } }
          ]
        };
      } else {
        expensesQuery = { paid_by: userId };
      }
    } else {
      // Business users: only show expenses they paid (no group expenses)
      expensesQuery = { paid_by: userId, group_id: null };
    }

    const expenses = await Expense.find(expensesQuery)
      .sort({ date: -1, created_at: -1 })
      .lean();

    // Fetch additional details for each expense
    const expensesWithDetails = await Promise.all(
      expenses.map(async (expense) => {
        let groupName = null;
        let participantCount = 1;
        let paidByName = 'Unknown';

        // Get paid by name
        if (expense.paid_by.toString() === user.id) {
          paidByName = 'You';
        } else if (expense.group_id) {
          const member = await GroupMember.findOne({
            group_id: expense.group_id,
            user_id: expense.paid_by,
          }).lean();
          paidByName = member?.name || 'Unknown';
        } else {
          const paidByUser = await User.findById(expense.paid_by).select('full_name').lean();
          paidByName = (paidByUser as any)?.full_name || 'Unknown';
        }

        // Get group name and participant count
        if (expense.group_id) {
          const group = await Group.findById(expense.group_id).select('name').lean();
          groupName = (group as any)?.name || null;

          const splitCount = await ExpenseSplit.countDocuments({ expense_id: expense._id });
          participantCount = splitCount || 1;
        }

        return {
          id: expense._id.toString(),
          description: expense.description,
          amount: expense.amount,
          paid_by: expense.paid_by.toString(),
          date: expense.date.toISOString().split('T')[0],
          category: expense.category,
          group_id: expense.group_id?.toString() || null,
          split_type: expense.split_type,
          group_name: groupName,
          participant_count: participantCount,
          paid_by_name: paidByName,
          created_at: (expense as any).created_at?.toISOString() || new Date().toISOString(),
        };
      })
    );

    return NextResponse.json(expensesWithDetails);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, category, group_id, split_type, date, members } = body;

    if (!description || !amount) {
      return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 });
    }

    await connectDB();
    const userId = new mongoose.Types.ObjectId(user.id);

    // Create expense
    const expense = await Expense.create({
      description,
      amount: Number(amount),
      category: category || 'other',
      group_id: group_id ? new mongoose.Types.ObjectId(group_id) : undefined,
      split_type: split_type || 'equal',
      paid_by: userId,
      date: date ? new Date(date) : new Date(),
    });

    // Create expense splits if group is provided
    if (expense.group_id) {
      // Get all group members for this group
      const groupMembers = await GroupMember.find({
        group_id: expense.group_id,
      });

      if (groupMembers.length > 0) {
        const splitAmount = Number(amount) / groupMembers.length;
        const splits = groupMembers.map((member) => ({
          expense_id: expense._id,
          member_id: member._id,
          amount: splitAmount,
          is_paid: false,
        }));

        await ExpenseSplit.insertMany(splits);
      }
    }

    return NextResponse.json({
      id: expense._id.toString(),
      description: expense.description,
      amount: expense.amount,
      paid_by: expense.paid_by.toString(),
      date: expense.date.toISOString().split('T')[0],
      category: expense.category,
      group_id: expense.group_id?.toString() || null,
      split_type: expense.split_type,
    });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
