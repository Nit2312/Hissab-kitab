"use client"

import { useState, useEffect } from "react"
import { format } from 'date-fns'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Filter, Settings, Calendar, List } from "lucide-react"
import { ExpenseCard } from "@/components/expenses/expense-card"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { ManageCategoriesDialog } from "@/components/expenses/manage-categories-dialog"
import { ExpenseCalendar } from "@/components/calendar/expense-calendar"
import { AddExpenseModal } from "@/components/calendar/add-expense-modal"
import { ExpenseDetails } from "@/components/calendar/expense-details"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

interface Category {
  id: string
  name: string
}


type Expense = {
  id: string
  description: string
  amount: number
  paid_by: string
  date: string
  category: string
  group_id?: string | null
  split_type: string
  group_name?: string | null
  participant_count?: number
  paid_by_name?: string
}

export default function ExpensesPage() {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<"personal" | "business">("personal")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  const [selectedDateForDetails, setSelectedDateForDetails] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState("list")
  const searchParams = useSearchParams()

  const [currentUserId, setCurrentUserId] = useState<string>("")

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        // Fetch user info, categories, and expenses in parallel
        const [userResponse, categoriesResponse, expensesResponse] = await Promise.all([
          fetch("/api/auth/user", { credentials: "include" }),
          fetch("/api/categories"),
          fetch("/api/expenses", { credentials: "include" })
        ]);

        if (!userResponse.ok) throw new Error("Not authenticated");
        const userData = await userResponse.json();
        setUserType(userData.user_type || "personal");
        setCurrentUserId(userData.id || "");

        // Only allow personal users to access personal expenses
        if (userData.user_type === "business") {
          // Redirect business users to business khata page
          window.location.href = "/dashboard/khata"
          return
        }

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        }

        if (!expensesResponse.ok) throw new Error("Failed to fetch expenses");
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData);
      } catch (err) {
        console.error("Error fetching expenses:", err);
        setExpenses([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [isAddOpen, isCalendarModalOpen]); // Remove calendarRefreshKey dependency

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleCategoriesChange = () => {
    // Refetch categories when they are updated
    fetch("/api/categories")
      .then(res => {
        if (!res.ok) {
          console.error("Failed to refetch categories:", res.status)
          return []
        }
        return res.json()
      })
      .then(data => setCategories(data))
      .catch(err => {
        console.error("Error refetching categories:", err)
        // Don't crash the UI, just log the error
      })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDateForDetails(date)
  }

  const handleAddExpense = (date: Date) => {
    setSelectedDate(date)
    setIsCalendarModalOpen(true)
  }

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      console.log('Attempting to delete expense:', expenseId)
      
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      console.log('Delete response status:', response.status)
      
      if (response.ok) {
        // Remove expense from local state for immediate UI update
        setExpenses(prev => prev.filter(expense => expense.id !== expenseId))
        console.log('Expense deleted successfully')
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to delete expense:', response.status, errorData)
        
        // Show user-friendly error message
        if (response.status === 403) {
          console.error('You are not authorized to delete this expense')
        } else if (response.status === 404) {
          console.error('Expense not found')
        } else {
          console.error('Server error:', errorData.error || 'Unknown error')
        }
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const getExpensesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return expenses.filter(expense => 
      format(new Date(expense.date), 'yyyy-MM-dd') === dateStr
    )
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Expenses</h2>
            <p className="text-muted-foreground">
              {userType === "business" 
                ? "View your expense history (use Khata for managing customer transactions)"
                : "Track and manage all your expenses"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {userType === "personal" && (
              <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ManageCategoriesDialog onCategoriesChange={handleCategoriesChange}>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </ManageCategoriesDialog>
            </div>

            {/* Expenses List */}
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                          <div className="space-y-2">
                            <div className="h-4 w-40 bg-muted rounded animate-pulse"></div>
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-16 bg-muted rounded animate-pulse"></div>
                              <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-5 w-20 bg-muted rounded animate-pulse mb-1"></div>
                          <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={{
                      id: expense.id,
                      description: expense.description,
                      amount: Number(expense.amount),
                      paidBy: expense.paid_by_name || "Unknown",
                      paidById: expense.paid_by,
                      date: expense.date,
                      category: expense.category,
                      group: expense.group_name || "No Group",
                      splitType: expense.split_type,
                      participantCount: expense.participant_count,
                    }}
                    currentUserId={currentUserId}
                    onDelete={(expenseId) => {
                      setExpenses(expenses.filter(e => e.id !== expenseId))
                    }}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">No expenses found</p>
                  {userType === "personal" && (
                    <Button variant="link" onClick={() => setIsAddOpen(true)}>
                      Add your first expense
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ExpenseCalendar 
                  onDateClick={handleDateClick}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                  expenses={expenses}
                  loading={loading}
                />
              </div>
              <div>
                {selectedDateForDetails && (
                  <ExpenseDetails 
                    date={selectedDateForDetails}
                    expenses={getExpensesForDate(selectedDateForDetails)}
                    onAddExpense={handleAddExpense}
                    onDeleteExpense={handleDeleteExpense}
                  />
                )}
                {!selectedDateForDetails && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Click on a date to view expenses</p>
                        <p className="text-sm mt-2">Click the + button to add expenses</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <AddExpenseDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        <AddExpenseModal 
          open={isCalendarModalOpen} 
          onOpenChange={setIsCalendarModalOpen}
          selectedDate={selectedDate}
          onExpenseAdded={() => {
            // Calendar will automatically update since we're passing expenses as props
            console.log('Expense added - calendar will update automatically')
          }}
        />
      </div>
    </Suspense>
  )
}
