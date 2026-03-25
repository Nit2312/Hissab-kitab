"use client"

import React, { useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IndianRupee, Calendar, Tag, FileText, TrendingUp, Sparkles, Target, Plus, Trash2, PlusCircle, X } from 'lucide-react'
import { useWebSocketSafe } from '@/hooks/use-websocket-safe'

interface ExpenseDetailsProps {
  date: Date
  expenses: any[]
  onClose?: () => void
  onAddExpense?: (date: Date) => void
  onDeleteExpense?: (expenseId: string) => void
}

export function ExpenseDetails({ date, expenses, onClose, onAddExpense, onDeleteExpense }: ExpenseDetailsProps) {
  // ALL HOOKS AT THE TOP - NO CONDITIONALS
  const { lastMessage } = useWebSocketSafe()

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage && (lastMessage.type === 'expense_added' || lastMessage.type === 'expense_updated' || lastMessage.type === 'expense_deleted')) {
      console.log('Real-time expense update in details:', lastMessage)
      // The parent component will handle refetching
    }
  }, [lastMessage])

  // Memoized computed values
  const totalAmount = useMemo(() => 
    expenses.reduce((total, expense) => total + expense.amount, 0), 
    [expenses]
  )

  const averageExpense = useMemo(() => 
    expenses.length > 0 ? totalAmount / expenses.length : 0, 
    [expenses.length, totalAmount]
  )

  const expensesByCategory = useMemo(() => 
    expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = []
      }
      acc[expense.category].push(expense)
      return acc
    }, {} as Record<string, any[]>), 
    [expenses]
  )

  const highestExpense = useMemo(() => 
    expenses.length > 0 ? 
      expenses.reduce((max, expense) => expense.amount > max.amount ? expense : max) : null, 
    [expenses]
  )

  if (expenses.length === 0) {
    return (
      <Card className="w-full border shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/85">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              {format(date, 'MMMM d, yyyy')}
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
                <span className="sr-only">Close details</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">No expenses</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Start tracking your expenses for this day
            </p>
            <div className="rounded-2xl border bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-900/20 dark:to-purple-900/20">
              <p className="mb-3 text-xs text-blue-600 dark:text-blue-400">
                💡 Click the + button on any date to add expenses
              </p>
              {onAddExpense && (
                <Button 
                  onClick={() => onAddExpense(date)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Expense for {format(date, 'MMM d')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full overflow-hidden border shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/85">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {format(date, 'MMMM d, yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/50 text-sm">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="bg-white/50 text-sm font-semibold">
              <IndianRupee className="h-3 w-3 mr-1" />
              {totalAmount.toFixed(2)}
            </Badge>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
                <span className="sr-only">Close details</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          {onAddExpense && (
            <Button 
              onClick={() => onAddExpense(date)}
              size="sm"
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:from-blue-600 hover:to-blue-700"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          )}
          {expenses.length > 0 && onDeleteExpense && (
            <Button 
              onClick={() => {
                // Delete all expenses for this day
                expenses.forEach(expense => {
                  onDeleteExpense(expense.id)
                })
              }}
              size="sm"
              variant="destructive"
              className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm hover:from-red-600 hover:to-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-3 dark:from-green-900/20 dark:to-emerald-900/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Average</span>
            </div>
            <p className="text-lg font-bold text-green-900 dark:text-green-100">
              ₹{averageExpense.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-3 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Highest</span>
            </div>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
              ₹{highestExpense ? highestExpense.amount.toFixed(2) : '0'}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">By category</h3>
          <div className="space-y-2">
            {Object.entries(expensesByCategory).map(([category, categoryExpenses]) => {
              const expenses = categoryExpenses as any[]
              const categoryTotal = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0)
              const percentage = (categoryTotal / totalAmount) * 100
              
              return (
                <div key={category} className="flex items-center justify-between rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 p-2 dark:from-gray-900/20 dark:to-slate-900/20">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{category}</span>
                    <Badge variant="outline" className="text-xs">
                      {expenses.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold min-w-[60px] text-right">
                      ₹{categoryTotal.toFixed(0)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expense List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">All expenses</h3>
          {expenses.map((expense, index) => (
            <div
              key={expense.id || index}
              className="group flex items-center justify-between rounded-xl border bg-gradient-to-r from-white to-gray-50 p-3 transition-all duration-200 hover:from-blue-50 hover:to-purple-50 hover:shadow-md dark:from-gray-800 dark:to-gray-900 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  <span className="font-medium group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
                    {expense.description}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <span>{expense.category}</span>
                  </div>
                  {expense.notes && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {expense.notes}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold text-lg">₹{expense.amount.toFixed(2)}</div>
                </div>
                {onDeleteExpense && (
                  <Button
                    onClick={() => onDeleteExpense(expense.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Total Summary */}
        <div className="mt-6 -mx-4 rounded-b-lg border-t bg-gradient-to-r from-blue-50 to-purple-50 px-4 pb-4 pt-4 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-900 dark:text-blue-100">Total for {format(date, 'MMM d')}</span>
            </div>
            <span className="font-bold text-xl text-blue-900 dark:text-blue-100">
              <IndianRupee className="h-5 w-5 inline mr-1" />
              {totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
