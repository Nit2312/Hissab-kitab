"use client"

import React from "react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { Plus, Receipt, Users, CreditCard, TrendingUp, Clock } from "lucide-react"

type User = {
  id: string
  email?: string
  full_name?: string
  user_type?: "personal" | "business"
  business_name?: string | null
}

type Group = {
  id: string
  name: string
  type: string
  created_at: string
}

type Expense = {
  id: string
  description: string
  amount: number
  paid_by: string
  date: string
  category: string
  group_id?: string | null
  group_name?: string | null
  paid_by_name?: string
  participant_count?: number
}

type Settlement = {
  id: string
  from_user_id: string
  to_user_id: string
  amount: number
  status: string
  created_at: string
  settled_at?: string
}

function startOfMonthISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isSameOrAfter(a: Date, b: Date) {
  return a.getTime() >= b.getTime()
}

export default function DashboardPage() {
  useRequireAuth()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const userRes = await fetch("/api/auth/user", { credentials: "include" })
        if (!userRes.ok) throw new Error("Not authenticated")
        const userData = (await userRes.json()) as User
        setUser(userData)

        const [groupsRes, expensesRes, settlementsRes] = await Promise.all([
          fetch("/api/groups", { credentials: "include" }),
          fetch("/api/expenses", { credentials: "include" }),
          fetch("/api/settlements", { credentials: "include" }),
        ])

        setGroups(groupsRes.ok ? await groupsRes.json() : [])
        setExpenses(expensesRes.ok ? await expensesRes.json() : [])
        setSettlements(settlementsRes.ok ? await settlementsRes.json() : [])
      } catch (e) {
        setUser(null)
        setGroups([])
        setExpenses([])
        setSettlements([])
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const insights = useMemo(() => {
    const now = new Date()
    const monthStart = startOfMonthISO(now)
    const last7Start = new Date(now)
    last7Start.setDate(last7Start.getDate() - 6)
    last7Start.setHours(0, 0, 0, 0)

    const parsedExpenses = expenses
      .map((e) => ({
        ...e,
        amount: Number(e.amount),
        _date: new Date(e.date),
      }))
      .filter((e) => !Number.isNaN(e._date.getTime()))

    const thisMonthExpenses = parsedExpenses.filter((e) => isSameOrAfter(e._date, monthStart))
    const last7Expenses = parsedExpenses.filter((e) => isSameOrAfter(e._date, last7Start))

    const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
    const last7Total = last7Expenses.reduce((sum, e) => sum + e.amount, 0)
    const totalAllTime = parsedExpenses.reduce((sum, e) => sum + e.amount, 0)

    const byCategory = new Map<string, number>()
    for (const e of thisMonthExpenses) {
      const key = e.category || "Others"
      byCategory.set(key, (byCategory.get(key) || 0) + e.amount)
    }

    const categoryRows = Array.from(byCategory.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)

    const topCategory = categoryRows[0]?.category || "—"

    const recent = parsedExpenses
      .slice()
      .sort((a, b) => b._date.getTime() - a._date.getTime())
      .slice(0, 6)

    const settlementsTotal = settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0)

    return {
      thisMonthTotal,
      last7Total,
      totalAllTime,
      topCategory,
      categoryRows,
      recent,
      settlementsTotal,
    }
  }, [expenses, settlements])


  const formatINR = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
    return (amount: number) => formatter.format(amount);
  }, []);

  const RecentExpenses = React.memo(({ recent, loading }: { recent: any[]; loading: boolean }) => (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Expenses</CardTitle>
        <Button variant="outline" asChild className="bg-transparent">
          <Link href="/dashboard/expenses">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">No expenses yet.</div>
        ) : (
          <div className="space-y-3">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{e.description}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {e.category || "Others"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{e.group_name || "No Group"}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold text-foreground">₹{Number(e.amount).toLocaleString("en-IN")}</div>
                  <div className="text-xs text-muted-foreground">{e.paid_by_name || "Unknown"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  ));

  const CategoryBreakdown = React.memo(({ categoryRows, loading }: { categoryRows: any[]; loading: boolean }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">This Month Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">Loading…</div>
        ) : categoryRows.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">No data for this month.</div>
        ) : (
          <div className="space-y-3">
            {categoryRows.slice(0, 6).map((row) => (
              <div key={row.category} className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate text-sm text-foreground">{row.category}</div>
                <div className="shrink-0 text-sm font-semibold text-foreground">
                  {formatINR(row.total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  ));

  const userName = user?.full_name || user?.email?.split("@")[0] || "User"
  const isBusinessUser = (user?.user_type || "personal") === "business"

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Namaste, {userName}!</h2>
          <p className="text-muted-foreground">
            {isBusinessUser
              ? "A quick snapshot of your activity"
              : "Here’s what’s happening across your expenses and groups"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isBusinessUser && (
            <Button asChild className="gap-2">
              <Link href="/dashboard/expenses?action=add">
                <Plus className="h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild className="gap-2 bg-transparent">
            <Link href="/dashboard/groups?action=create">
              <Users className="h-4 w-4" />
              Create Group
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2 bg-transparent">
            <Link href="/dashboard/settlements">
              <CreditCard className="h-4 w-4" />
              Settle Up
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "—" : formatINR(insights.thisMonthTotal)}
            </div>
            <p className="text-xs text-muted-foreground">Spending since month start</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "—" : formatINR(insights.last7Total)}
            </div>
            <p className="text-xs text-muted-foreground">Short-term trend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "—" : insights.topCategory}
            </div>
            <p className="text-xs text-muted-foreground">Based on this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Groups</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{loading ? "—" : groups.length}</div>
            <p className="text-xs text-muted-foreground">Where you share expenses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RecentExpenses recent={insights.recent} loading={loading} />
        <CategoryBreakdown categoryRows={insights.categoryRows} loading={loading} />
      </div>
    </div>
  )
}
