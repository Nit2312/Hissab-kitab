import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const userType = profile?.user_type || "personal"
  const userName = profile?.full_name || user.email?.split("@")[0] || "User"

  // If business user, redirect to khata
  if (userType === "business") {
    redirect("/dashboard/khata")
  }

  // Fetch user's groups
  const { data: groupMembers } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)

  const groupIds = groupMembers?.map(gm => gm.group_id) || []

  // Fetch groups data
  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .in("id", groupIds.length > 0 ? groupIds : ['00000000-0000-0000-0000-000000000000'])

  // Fetch recent expenses
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .or(`paid_by.eq.${user.id},group_id.in.(${groupIds.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(10)

  // Calculate balances from expense splits
  let youOwe = 0
  let youAreOwed = 0

  // Get user's group member IDs
  const { data: userGroupMembers } = await supabase
    .from("group_members")
    .select("id")
    .eq("user_id", user.id)

  const memberIds = userGroupMembers?.map(gm => gm.id) || []

  if (memberIds.length > 0) {
    // Fetch expense splits where user is a member
    const { data: expenseSplits } = await supabase
      .from("expense_splits")
      .select("*, expenses(*)")
      .in("member_id", memberIds)

    // Calculate what user owes (splits where user hasn't paid and expense wasn't paid by them)
    expenseSplits?.forEach(split => {
      const expense = split.expenses as any
      if (expense && expense.paid_by !== user.id && !split.is_paid) {
        youOwe += Number(split.amount)
      }
    })

    // Calculate what user is owed (expenses user paid, splits by others)
    const paidExpenseIds = expenses?.filter(e => e.paid_by === user.id).map(e => e.id) || []
    if (paidExpenseIds.length > 0) {
      const { data: otherSplits } = await supabase
        .from("expense_splits")
        .select("*, group_members!inner(user_id)")
        .in("expense_id", paidExpenseIds)
        .not("member_id", "in", `(${memberIds.join(",")})`)
        .eq("is_paid", false)

      otherSplits?.forEach(split => {
        youAreOwed += Number(split.amount)
      })
    }
  }

  // Fetch settlements
  const { data: settlements } = await supabase
    .from("settlements")
    .select("*")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <PersonalDashboard
      userName={userName}
      groups={groups || []}
      expenses={expenses || []}
      settlements={settlements || []}
      youOwe={youOwe}
      youAreOwed={youAreOwed}
      userId={user.id}
    />
  )
}
