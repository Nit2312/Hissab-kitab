"use client"

import React from "react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { useExpenses, useGroups, useSettlements } from "@/hooks/use-optimized-data"
import { Plus, Users, CreditCard } from "lucide-react"

type User = {
  id: string
  email?: string
  full_name?: string
  user_type?: "personal" | "business"
  business_name?: string | null
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

export default function DashboardPage() {
  useRequireAuth()

  const [user, setUser] = useState<User | null>(null)
  
  // Use optimized hooks with caching
  const { expenses, loading: expensesLoading } = useExpenses()
  const { groups, loading: groupsLoading } = useGroups()
  const { loading: settlementsLoading } = useSettlements()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRes = await fetch("/api/auth/user", { credentials: "include" })
        if (!userRes.ok) throw new Error("Not authenticated")
        const userData = (await userRes.json()) as User
        setUser(userData)

        // Business users should be redirected
        if (userData.user_type === "business") {
          window.location.href = "/dashboard/khata"
          return
        }
      } catch (e) {
        setUser(null)
      }
    }

    fetchUser()
  }, [])

  const loading = expensesLoading || groupsLoading || settlementsLoading

  const insights = useMemo(() => {
    if (!expenses.length) return {
      thisMonthTotal: 0,
      last7Total: 0,
      topCategory: "—",
      categoryRows: [],
      recent: [],
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
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

    const thisMonthExpenses = parsedExpenses.filter((e) => e._date >= monthStart)
    const last7Expenses = parsedExpenses.filter((e) => e._date >= last7Start)

    const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
    const last7Total = last7Expenses.reduce((sum, e) => sum + e.amount, 0)
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

    return {
      thisMonthTotal,
      last7Total,
      topCategory,
      categoryRows,
      recent,
    }
  }, [expenses])


  const formatINR = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
    return (amount: number) => formatter.format(amount);
  }, []);

  const RecentExpenses = React.memo(({ recent, loading }: { recent: any[]; loading: boolean }) => (
    <Card className="glass-card lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Expenses</CardTitle>
        <Button variant="outline" asChild className="bg-transparent">
          <Link href="/dashboard/expenses">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-16 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-5 w-16 bg-muted rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
            No expenses yet. Add your first expense to see it here.
          </div>
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
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base">This Month Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : categoryRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
            No spend data yet for this month.
          </div>
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
      <Card className="glass-card">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Dashboard overview
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Namaste, {userName}!</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {isBusinessUser
                ? "A quick snapshot of outstanding balances, collections, and recent activity."
                : "A quick snapshot of your spending, groups, and recent expenses."}
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
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              ) : (
                formatINR(insights.thisMonthTotal)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Spending since month start</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              ) : (
                formatINR(insights.last7Total)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Short-term trend</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? (
                <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
              ) : (
                insights.topCategory
              )}
            </div>
            <p className="text-xs text-muted-foreground">Based on this month</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? (
                <div className="h-8 w-12 bg-muted rounded animate-pulse"></div>
              ) : (
                groups.length
              )}
            </div>
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
