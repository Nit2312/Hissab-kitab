import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import Expense from '@/lib/mongodb/models/Expense';
import ExpenseSplit from '@/lib/mongodb/models/ExpenseSplit';
import GroupMember from '@/lib/mongodb/models/GroupMember';
import mongoose from 'mongoose';

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

    await connectDB();
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid expense ID format' }, { status: 400 });
    }

    const expense = await Expense.findById(resolvedParams.id);

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Check if user owns this expense
    const expensePaidBy = expense.paid_by.toString();
    const userId = user.id.toString();
    
    if (expensePaidBy !== userId) {
      console.error('Authorization failed:', { expensePaidBy, userId, expenseId: resolvedParams.id });
      return NextResponse.json({ error: 'Not authorized to edit this expense' }, { status: 403 });
    }

    // Update expense
    const oldAmount = expense.amount;
    if (description !== undefined) expense.description = description;
    if (amount !== undefined) expense.amount = Number(amount);
    if (category !== undefined) expense.category = category;
    if (date !== undefined) expense.date = new Date(date);

    await expense.save();

    // If amount changed and expense has a group, update expense splits
    if (amount !== undefined && expense.group_id && Number(amount) !== oldAmount) {
      const groupMembers = await GroupMember.find({
        group_id: expense.group_id,
      });
      
      if (groupMembers.length > 0) {
        const newSplitAmount = Number(amount) / groupMembers.length;
        // Update all splits for this expense
        await ExpenseSplit.updateMany(
          { expense_id: expense._id },
          { amount: newSplitAmount }
        );
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

    await connectDB();
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid expense ID format' }, { status: 400 });
    }

    const expense = await Expense.findById(resolvedParams.id);

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Check if user owns this expense
    const expensePaidBy = expense.paid_by.toString();
    const userId = user.id.toString();
    
    if (expensePaidBy !== userId) {
      return NextResponse.json({ error: 'Not authorized to delete this expense' }, { status: 403 });
    }

    // Delete expense splits first
    await ExpenseSplit.deleteMany({ expense_id: expense._id });

    // Delete expense
    await Expense.findByIdAndDelete(resolvedParams.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
