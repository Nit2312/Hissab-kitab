"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Users,
  Receipt,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useState, useEffect } from "react"

interface PersonalDashboardProps {
  userName: string
  groups: Array<{
    id: string
    name: string
    type: string
    created_at: string
  }>
  expenses: Array<{
    id: string
    description: string
    amount: number
    category: string
    paid_by: string
    created_at: string
  }>
  settlements: Array<{
    id: string
    amount: number
    from_user_id: string
    to_user_id: string
    status: string
    created_at: string
  }>
  youOwe: number
  youAreOwed: number
  userId: string
}

export function PersonalDashboard({
  userName,
  groups,
  expenses,
  settlements,
  youOwe,
  youAreOwed,
  userId
}: PersonalDashboardProps) {
  const [mounted, setMounted] = useState(false)
  const netBalance = youAreOwed - youOwe
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Welcome Message */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Namaste, {userName}!</h2>
        <p className="text-muted-foreground">Here&apos;s your financial summary</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/dashboard/expenses?action=add">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Link>
        </Button>
        <Button variant="outline" asChild className="bg-transparent">
          <Link href="/dashboard/groups?action=create">
            <Users className="mr-2 h-4 w-4" />
            Create Group
          </Link>
        </Button>
        <Button variant="outline" asChild className="bg-transparent">
          <Link href="/dashboard/settlements">
            <CreditCard className="mr-2 h-4 w-4" />
            Settle Up
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              You Owe
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(youOwe)}
            </div>
            <p className="text-xs text-muted-foreground">
              To {groups.length} group{groups.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              You Are Owed
            </CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(youAreOwed)}
            </div>
            <p className="text-xs text-muted-foreground">
              From friends & groups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Balance
            </CardTitle>
            {netBalance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-primary" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-primary" : "text-destructive"}`}>
              {netBalance >= 0 ? "+" : ""}{formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netBalance >= 0 ? "You're in good shape!" : "Time to collect"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Groups and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Groups */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Groups</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/groups">View All</Link>
              </Button>
            </div>
            <CardDescription>Groups you&apos;re part of</CardDescription>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">No groups yet</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href="/dashboard/groups?action=create">Create Your First Group</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.slice(0, 5).map((group) => (
                  <Link
                    key={group.id}
                    href={`/dashboard/groups/${group.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{group.type}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{group.type}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Expenses</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/expenses">View All</Link>
              </Button>
            </div>
            <CardDescription>Latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">No expenses yet</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href="/dashboard/expenses?action=add">Add Your First Expense</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.slice(0, 5).map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{expense.category}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>
                            {mounted 
                              ? formatDistanceToNow(new Date(expense.created_at), { addSuffix: true })
                              : new Date(expense.created_at).toLocaleDateString()
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${expense.paid_by === userId ? "text-primary" : "text-foreground"}`}>
                        {formatCurrency(expense.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expense.paid_by === userId ? "You paid" : "Split"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Settlements */}
      {settlements.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Settlements</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/settlements">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {settlements.map((settlement) => {
                const isPayer = settlement.from_user_id === userId
                return (
                  <div
                    key={settlement.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isPayer ? "bg-destructive/10" : "bg-primary/10"
                      }`}>
                        {isPayer ? (
                          <ArrowUpRight className="h-5 w-5 text-destructive" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {isPayer ? "You paid" : "You received"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mounted
                            ? formatDistanceToNow(new Date(settlement.created_at), { addSuffix: true })
                            : new Date(settlement.created_at).toLocaleDateString()
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isPayer ? "text-destructive" : "text-primary"}`}>
                        {isPayer ? "-" : "+"}{formatCurrency(settlement.amount)}
                      </p>
                      <Badge variant={settlement.status === "completed" ? "default" : "secondary"}>
                        {settlement.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
