import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { getFirestoreDB, docToObject } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

type MemberRow = {
  id: string
  user_id: string | null
  name: string
  email?: string | null
  phone?: string | null
  is_registered?: boolean
}

type ExpenseRow = {
  id: string
  amount: number
  paid_by: string
}

type SplitRow = {
  id: string
  expense_id: string
  member_id: string
  amount: number
  is_paid: boolean
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function addToMap(map: Map<string, number>, key: string, amount: number) {
  map.set(key, round2((map.get(key) || 0) + amount))
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('group_id')

    if (!groupId) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 })
    }

    const db = getFirestoreDB()

    const membersSnapshot = await db
      .collection(COLLECTIONS.GROUP_MEMBERS)
      .where('group_id', '==', groupId)
      .get()

    const members: MemberRow[] = membersSnapshot.docs.map((d) => {
      const m: any = docToObject(d)
      return {
        id: m.id,
        user_id: m.user_id || null,
        name: m.name,
        email: m.email || null,
        phone: m.phone || null,
        is_registered: !!m.is_registered,
      }
    })

    const memberById = new Map(members.map((m) => [m.id, m]))
    const memberIdByUserId = new Map(
      members.filter((m) => m.user_id).map((m) => [m.user_id as string, m.id]),
    )

    const expensesSnapshot = await db
      .collection(COLLECTIONS.EXPENSES)
      .where('group_id', '==', groupId)
      .get()

    const expenses: ExpenseRow[] = expensesSnapshot.docs.map((d) => {
      const e: any = docToObject(d)
      return {
        id: e.id,
        amount: Number(e.amount || 0),
        paid_by: e.paid_by,
      }
    })

    const payerMemberIdByExpenseId = new Map<string, string | null>()
    expenses.forEach((e) => {
      payerMemberIdByExpenseId.set(e.id, memberIdByUserId.get(e.paid_by) || null)
    })

    const expenseIds = expenses.map((e) => e.id)

    // Fetch splits in batches of 10 using 'in' query to avoid N+1.
    const splits: SplitRow[] = []
    if (expenseIds.length > 0) {
      for (let i = 0; i < expenseIds.length; i += 10) {
        const batch = expenseIds.slice(i, i + 10)
        const splitsSnapshot = await db
          .collection(COLLECTIONS.EXPENSE_SPLITS)
          .where('expense_id', 'in', batch)
          .get()

        splitsSnapshot.docs.forEach((doc) => {
          const s: any = docToObject(doc)
          splits.push({
            id: s.id,
            expense_id: s.expense_id,
            member_id: s.member_id,
            amount: Number(s.amount || 0),
            is_paid: !!s.is_paid,
          })
        })
      }
    }

    // Core model (Splitwise style):
    // - Each split represents a member's share of an expense.
    // - Total paid is derived from expenses.paid_by.
    // - Net balance per member = paid - share.
    // We intentionally ignore split.is_paid here because we aren't tracking settlements
    // through splits yet; using is_paid would skew balances.
    const shareByMember = new Map<string, number>()
    const paidByMember = new Map<string, number>()

    // init
    members.forEach((m) => {
      shareByMember.set(m.id, 0)
      paidByMember.set(m.id, 0)
    })

    // paid totals
    expenses.forEach((e) => {
      const payerMemberId = memberIdByUserId.get(e.paid_by)
      if (payerMemberId) {
        paidByMember.set(payerMemberId, (paidByMember.get(payerMemberId) || 0) + e.amount)
      }
    })

    // share totals
    for (const s of splits) {
      shareByMember.set(s.member_id, (shareByMember.get(s.member_id) || 0) + s.amount)
    }

    // net = paid - share
    const netByMember = new Map<string, number>()
    members.forEach((m) => {
      const net = (paidByMember.get(m.id) || 0) - (shareByMember.get(m.id) || 0)
      netByMember.set(m.id, round2(net))
    })

    // Transfers (payer-based, aggregated per expense):
    // For each expense, each non-payer member owes their split to the payer.
    // This matches the user's expectation: if two different people paid expenses,
    // you may owe both, even if a minimized netting would reduce it to one transfer.
    const owedPairTotals = new Map<string, number>()
    for (const s of splits) {
      const payerMemberId = payerMemberIdByExpenseId.get(s.expense_id) || null
      if (!payerMemberId) continue
      if (s.member_id === payerMemberId) continue
      if (s.amount <= 0) continue
      addToMap(owedPairTotals, `${s.member_id}->${payerMemberId}`, Number(s.amount))
    }

    const transfers: Array<{
      from_member_id: string
      to_member_id: string
      amount: number
      from_name: string
      to_name: string
    }> = Array.from(owedPairTotals.entries())
      .map(([key, amount]) => {
        const [fromId, toId] = key.split('->')
        return {
          from_member_id: fromId,
          to_member_id: toId,
          amount: round2(amount),
          from_name: memberById.get(fromId)?.name || 'Member',
          to_name: memberById.get(toId)?.name || 'Member',
        }
      })
      .filter((t) => t.amount > 0.01)
      .sort((a, b) => b.amount - a.amount)

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    const memberRows = members.map((m) => ({
      member: m,
      paid: round2(paidByMember.get(m.id) || 0),
      share: round2(shareByMember.get(m.id) || 0),
      owed: round2(Math.max(0, -(netByMember.get(m.id) || 0))),
      credit: round2(Math.max(0, netByMember.get(m.id) || 0)),
      net: round2(netByMember.get(m.id) || 0),
    }))

    return NextResponse.json({
      group_id: groupId,
      total_expenses: round2(totalExpenses),
      members: memberRows,
      transfers,
    })
  } catch (error: any) {
    console.error('Error calculating group balances:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
