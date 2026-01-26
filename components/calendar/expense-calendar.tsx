"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameWeek, differenceInDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, IndianRupee, TrendingUp, TrendingDown, Target, Sparkles, BarChart3, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useExpenses } from '@/hooks/use-optimized-data'
import { useWebSocketSafe } from '@/hooks/use-websocket-safe'

interface ExpenseCalendarProps {
  onDateClick?: (date: Date) => void
  onAddExpense?: (date: Date) => void
  onDeleteExpense?: (expenseId: string) => void
  className?: string
  expenses?: any[] // Add expenses as prop
  loading?: boolean // Add loading state as prop
}

export function ExpenseCalendar({ onDateClick, onAddExpense, onDeleteExpense, className, expenses: propExpenses, loading: propLoading }: ExpenseCalendarProps) {
  // ALL HOOKS AT THE TOP - NO CONDITIONALS
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Use prop expenses if provided, otherwise fall back to hook
  const { expenses: hookExpenses, loading: hookLoading, refetch } = useExpenses()
  const expenses = propExpenses || hookExpenses
  const loading = propLoading !== undefined ? propLoading : hookLoading
  
  // Safe WebSocket hook that prevents SSR issues
  const { isConnected, lastMessage } = useWebSocketSafe()

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage && refetch && (lastMessage.type === 'expense_added' || lastMessage.type === 'expense_updated' || lastMessage.type === 'expense_deleted')) {
      console.log('Real-time expense update received:', lastMessage)
      refetch()
    }
  }, [lastMessage, refetch])

  // Handle expense deletion
  const handleDeleteExpense = useCallback(async (expenseId: string) => {
    if (onDeleteExpense) {
      onDeleteExpense(expenseId)
    }
  }, [onDeleteExpense])

  // Memoized computed values
  const expensesByDate = useMemo(() => {
    return expenses?.reduce((acc: Record<string, any[]>, expense: any) => {
      const date = format(new Date(expense.date), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(expense)
      return acc
    }, {} as Record<string, any[]>)
  }, [expenses])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  const previousMonth = useCallback(() => setCurrentMonth(subMonths(currentMonth, 1)), [currentMonth])
  const nextMonth = useCallback(() => setCurrentMonth(addMonths(currentMonth, 1)), [currentMonth])

  const handleDateClick = useCallback((date: Date) => {
    if (onDateClick) {
      onDateClick(date)
    }
  }, [onDateClick])

  const handleAddExpense = useCallback((e: React.MouseEvent, date: Date) => {
    e.stopPropagation()
    if (onAddExpense) {
      onAddExpense(date)
    }
  }, [onAddExpense])

  const getTotalForDate = useCallback((date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayExpenses = expensesByDate?.[dateStr] || []
    return dayExpenses.reduce((total: number, expense: any) => total + expense.amount, 0)
  }, [expensesByDate])

  const getExpenseCountForDate = useCallback((date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return expensesByDate?.[dateStr]?.length || 0
  }, [expensesByDate])

  const getMonthTotal = useCallback((): number => {
    let total = 0
    for (const day of calendarDays) {
      if (isSameMonth(day, currentMonth)) {
        total += getTotalForDate(day)
      }
    }
    return total
  }, [calendarDays, currentMonth, getTotalForDate])

  const getMonthAverage = useCallback((): number => {
    const daysWithExpenses = calendarDays.filter(day => 
      isSameMonth(day, currentMonth) && getExpenseCountForDate(day) > 0
    ).length
    return daysWithExpenses > 0 ? getMonthTotal() / daysWithExpenses : 0
  }, [calendarDays, currentMonth, getExpenseCountForDate, getMonthTotal])

  const getHighestExpenseDay = useCallback((): { date: Date; amount: number } | null => {
    let highest = { date: new Date(), amount: 0 }
    let found = false
    
    for (const day of calendarDays) {
      if (isSameMonth(day, currentMonth)) {
        const total = getTotalForDate(day)
        if (total > highest.amount) {
          highest = { date: day, amount: total }
          found = true
        }
      }
    }
    
    return found ? highest : null
  }, [calendarDays, currentMonth, getTotalForDate])

  const getSpendingTrend = useCallback((): 'up' | 'down' | 'neutral' => {
    const currentMonthTotal = getMonthTotal()
    const lastMonth = subMonths(currentMonth, 1)
    const lastMonthStart = startOfMonth(lastMonth)
    const lastMonthEnd = endOfMonth(lastMonth)
    const lastMonthDays = eachDayOfInterval({ start: lastMonthStart, end: lastMonthEnd })
    
    let lastMonthTotal = 0
    for (const day of lastMonthDays) {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayExpenses = expensesByDate?.[dateStr] || []
      lastMonthTotal += dayExpenses.reduce((total: number, expense: any) => total + expense.amount, 0)
    }
    
    if (currentMonthTotal > lastMonthTotal * 1.1) return 'up'
    if (currentMonthTotal < lastMonthTotal * 0.9) return 'down'
    return 'neutral'
  }, [getMonthTotal, expensesByDate])

  const getDailyProgress = useCallback((): number => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd }).length
    const daysPassed = differenceInDays(new Date(), monthStart) + 1
    return Math.min((daysPassed / daysInMonth) * 100, 100)
  }, [currentMonth])

  const getExpenseIntensity = useCallback((amount: number): 'low' | 'medium' | 'high' => {
    const average = getMonthAverage()
    if (amount === 0) return 'low'
    if (amount < average * 0.5) return 'low'
    if (amount < average * 1.5) return 'medium'
    return 'high'
  }, [getMonthAverage])

  const trend = getSpendingTrend()
  const highestDay = getHighestExpenseDay()
  const progress = getDailyProgress()

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Monthly Total</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  ₹{getMonthTotal().toFixed(0)}
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center">
                <IndianRupee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Daily Average</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  ₹{getMonthAverage().toFixed(0)}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Spending Trend</p>
                <div className="flex items-center gap-1">
                  {trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                  {trend === 'neutral' && <Target className="h-4 w-4 text-gray-500" />}
                  <p className="text-lg font-bold text-purple-900 dark:text-purple-100 capitalize">
                    {trend}
                  </p>
                </div>
              </div>
              <div className="h-8 w-8 bg-purple-500 bg-opacity-20 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Month Progress</p>
                <div className="mt-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">{progress.toFixed(0)}%</p>
                </div>
              </div>
              <div className="h-8 w-8 bg-orange-500 bg-opacity-20 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar */}
      <Card className={cn("w-full backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border shadow-xl", className)}>
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="h-5 w-5 text-primary" />
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <Badge variant="secondary" className="text-xs bg-white/50">
                ₹{getMonthTotal().toFixed(0)} total
              </Badge>
              {highestDay && (
                <Badge variant="outline" className="text-xs">
                  Highest: {format(highestDay.date, 'MMM d')} - ₹{highestDay.amount.toFixed(0)}
                </Badge>
              )}
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Wifi className="h-3 w-3" />
                    <span className="text-xs">Live</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <WifiOff className="h-3 w-3" />
                    <span className="text-xs">Offline</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={previousMonth}
                className="h-8 w-8 bg-white/50 hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
                className="h-8 w-8 bg-white/50 hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-muted-foreground p-2 bg-gradient-to-b from-muted/50 to-muted/30 rounded-lg"
              >
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const totalAmount = getTotalForDate(day)
              const expenseCount = getExpenseCountForDate(day)
              const hasExpenses = expenseCount > 0
              const isCurrentDay = isToday(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const intensity = getExpenseIntensity(totalAmount)
              
              return (
                <div
                  key={`${day.toString()}-${index}`}
                  className={cn(
                    "h-16 p-1 flex flex-col items-center justify-center relative transition-all duration-300 cursor-pointer",
                    "hover:scale-105 hover:shadow-lg hover:z-10",
                    "border border-transparent hover:border-blue-200 dark:hover:border-blue-800 rounded-lg",
                    !isCurrentMonth && "text-muted-foreground opacity-30",
                    isCurrentDay && "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-400 dark:border-blue-600 shadow-lg",
                    hasExpenses && isCurrentMonth && cn(
                      "bg-gradient-to-br border",
                      intensity === 'low' && "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800",
                      intensity === 'medium' && "from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800",
                      intensity === 'high' && "from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800"
                    )
                  )}
                  onClick={() => handleDateClick(day)}
                  role="button"
                  tabIndex={isCurrentMonth ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleDateClick(day)
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-1 w-full relative">
                    <span className={cn(
                      "text-sm font-medium",
                      isCurrentDay && "text-blue-600 dark:text-blue-400 font-bold text-base"
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {hasExpenses && isCurrentMonth && (
                      <div className="flex flex-col items-center gap-0.5 w-full px-1">
                        <div className="flex items-center gap-1 w-full justify-between">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-[10px] px-1 py-0 h-4 min-w-0 flex-1",
                              intensity === 'low' && "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200",
                              intensity === 'medium' && "bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200",
                              intensity === 'high' && "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200"
                            )}
                          >
                            {expenseCount}
                          </Badge>
                          {/* Delete button for expenses */}
                          {expenseCount > 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-4 w-4 p-0 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 hover:text-red-700 dark:hover:text-red-300 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Get first expense for this date to delete
                                const dateStr = format(day, 'yyyy-MM-dd')
                                const dayExpenses = expensesByDate?.[dateStr] || []
                                if (dayExpenses.length > 0) {
                                  handleDeleteExpense(dayExpenses[0].id)
                                }
                              }}
                              title="Delete expense"
                            >
                              <span className="text-xs">×</span>
                            </Button>
                          )}
                        </div>
                        <div className={cn(
                          "flex items-center gap-0.5 text-[10px] font-semibold",
                          intensity === 'low' && "text-green-600 dark:text-green-400",
                          intensity === 'medium' && "text-yellow-600 dark:text-yellow-400",
                          intensity === 'high' && "text-red-600 dark:text-red-400"
                        )}>
                          <IndianRupee className="h-2.5 w-2.5" />
                          {totalAmount >= 1000 ? `${(totalAmount/1000).toFixed(1)}k` : totalAmount.toFixed(0)}
                        </div>
                      </div>
                    )}
                    
                    {/* Plus button for adding expenses - only show on days with no expenses */}
                    {isCurrentMonth && !hasExpenses && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 rounded-full shadow-lg opacity-0 hover:opacity-100 transition-all duration-200 hover:scale-110"
                        onClick={(e) => handleAddExpense(e, day)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {isCurrentDay && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-lg" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="mt-6 pt-4 border-t bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 -mx-4 px-4 -mb-4 pb-4 rounded-b-lg">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full" />
                  <span className="text-muted-foreground">Low spending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full" />
                  <span className="text-muted-foreground">Medium spending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-pink-400 rounded-full" />
                  <span className="text-muted-foreground">High spending</span>
                </div>
              </div>
              <div className="text-muted-foreground font-medium">
                {expenses?.length || 0} expenses • {calendarDays.filter(d => isSameMonth(d, currentMonth) && getExpenseCountForDate(d) > 0).length} active days
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
