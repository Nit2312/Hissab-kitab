import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/mongodb/server"
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard"
import connectDB from "@/lib/mongodb/connect"
import Group from "@/lib/mongodb/models/Group"
import GroupMember from "@/lib/mongodb/models/GroupMember"
import Expense from "@/lib/mongodb/models/Expense"
import ExpenseSplit from "@/lib/mongodb/models/ExpenseSplit"
import Settlement from "@/lib/mongodb/models/Settlement"
import mongoose from "mongoose"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/login?error=unauthorized")
  }

  const userType = user.user_type || "personal"
  const userName = user.full_name || user.email?.split("@")[0] || "User"

  // If business user, redirect to khata
  if (userType === "business") {
    redirect("/dashboard/khata")
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(user.id)

  // Fetch user's groups
  const groupMembers = await GroupMember.find({ user_id: userId })
  const groupIds = groupMembers.map(gm => gm.group_id)

  // Fetch groups data
  const groups = groupIds.length > 0 
    ? await Group.find({ _id: { $in: groupIds } })
    : []

  // Fetch recent expenses
  const expenses = await Expense.find({
    $or: [
      { paid_by: userId },
      { group_id: { $in: groupIds } }
    ]
  })
    .sort({ created_at: -1 })
    .limit(10)
    .lean()

  // Calculate balances from expense splits
  let youOwe = 0
  let youAreOwed = 0

  // Get user's group member IDs
  const userGroupMembers = await GroupMember.find({ user_id: userId })
  const memberIds = userGroupMembers.map(gm => gm._id)

  if (memberIds.length > 0) {
    // Fetch expense splits where user is a member
    const expenseSplits = await ExpenseSplit.find({
      member_id: { $in: memberIds }
    }).populate('expense_id').lean()

    // Calculate what user owes (splits where user hasn't paid and expense wasn't paid by them)
    for (const split of expenseSplits) {
      const expense = split.expense_id as any
      if (expense && expense.paid_by.toString() !== user.id && !split.is_paid) {
        youOwe += Number(split.amount)
      }
    }

    // Calculate what user is owed (expenses user paid, splits by others)
    const paidExpenseIds = expenses.filter(e => e.paid_by.toString() === user.id).map(e => e._id)
    if (paidExpenseIds.length > 0) {
      const otherSplits = await ExpenseSplit.find({
        expense_id: { $in: paidExpenseIds },
        member_id: { $nin: memberIds },
        is_paid: false
      }).populate({
        path: 'member_id',
        populate: { path: 'user_id' }
      }).lean()

      for (const split of otherSplits) {
        youAreOwed += Number(split.amount)
      }
    }
  }

  // Fetch settlements
  const settlements = await Settlement.find({
    $or: [
      { from_user_id: userId },
      { to_user_id: userId }
    ]
  })
    .sort({ created_at: -1 })
    .limit(5)
    .lean()

  // Convert MongoDB documents to plain objects with id field
  const groupsData = groups.map(g => ({
    id: g._id.toString(),
    name: g.name,
    description: g.description,
    type: g.type,
    created_by: g.created_by.toString(),
    created_at: g.created_at.toISOString(),
    updated_at: g.updated_at.toISOString(),
  }))

  const expensesData = expenses.map(e => ({
    id: e._id.toString(),
    group_id: e.group_id?.toString() || null,
    description: e.description,
    amount: e.amount,
    category: e.category,
    paid_by: e.paid_by.toString(),
    split_type: e.split_type,
    date: e.date.toISOString().split('T')[0],
    notes: e.notes,
    created_at: e.created_at.toISOString(),
    updated_at: e.updated_at.toISOString(),
  }))

  const settlementsData = settlements.map(s => ({
    id: s._id.toString(),
    from_user_id: s.from_user_id.toString(),
    to_user_id: s.to_user_id.toString(),
    group_id: s.group_id?.toString() || null,
    amount: s.amount,
    payment_method: s.payment_method,
    status: s.status,
    notes: s.notes,
    settled_at: s.settled_at.toISOString(),
    created_at: s.created_at.toISOString(),
  }))

  return (
    <PersonalDashboard
      userName={userName}
      groups={groupsData}
      expenses={expensesData}
      settlements={settlementsData}
      youOwe={youOwe}
      youAreOwed={youAreOwed}
      userId={user.id}
    />
  )
}
