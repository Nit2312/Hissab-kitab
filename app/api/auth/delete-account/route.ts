import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import User from '@/lib/mongodb/models/User';
import Group from '@/lib/mongodb/models/Group';
import GroupMember from '@/lib/mongodb/models/GroupMember';
import Expense from '@/lib/mongodb/models/Expense';
import ExpenseSplit from '@/lib/mongodb/models/ExpenseSplit';
import Settlement from '@/lib/mongodb/models/Settlement';
import Reminder from '@/lib/mongodb/models/Reminder';
import Customer from '@/lib/mongodb/models/Customer';
import KhataTransaction from '@/lib/mongodb/models/KhataTransaction';
import Session from '@/lib/mongodb/models/Session';
import mongoose from 'mongoose';

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const userId = new mongoose.Types.ObjectId(user.id);

    // Delete all user data (MongoDB will handle cascading via application logic)
    // Delete in order to respect foreign key constraints
    
    // Delete sessions
    await Session.deleteMany({ user_id: userId });
    
    // Delete reminders
    await Reminder.deleteMany({ 
      $or: [{ from_user_id: userId }, { to_user_id: userId }] 
    });
    
    // Delete settlements
    await Settlement.deleteMany({ 
      $or: [{ from_user_id: userId }, { to_user_id: userId }] 
    });
    
    // Delete expense splits (via expenses)
    const userExpenses = await Expense.find({ paid_by: userId });
    const expenseIds = userExpenses.map(e => e._id);
    await ExpenseSplit.deleteMany({ expense_id: { $in: expenseIds } });
    
    // Delete expenses
    await Expense.deleteMany({ paid_by: userId });
    
    // Delete group members
    const userGroupMembers = await GroupMember.find({ user_id: userId });
    const groupIds = userGroupMembers.map(gm => gm.group_id);
    
    // Delete expense splits for groups user was in
    const groupExpenses = await Expense.find({ group_id: { $in: groupIds } });
    const groupExpenseIds = groupExpenses.map(e => e._id);
    await ExpenseSplit.deleteMany({ expense_id: { $in: groupExpenseIds } });
    
    // Delete group expenses
    await Expense.deleteMany({ group_id: { $in: groupIds } });
    
    // Delete group members
    await GroupMember.deleteMany({ user_id: userId });
    
    // Delete groups created by user
    await Group.deleteMany({ created_by: userId });
    
    // Delete khata transactions
    await KhataTransaction.deleteMany({ owner_id: userId });
    
    // Delete customers
    await Customer.deleteMany({ owner_id: userId });
    
    // Finally, delete user
    await User.findByIdAndDelete(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
