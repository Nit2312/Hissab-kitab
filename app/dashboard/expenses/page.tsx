"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Filter } from "lucide-react"
import { ExpenseCard } from "@/components/expenses/expense-card"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"


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
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<"personal" | "business">("personal")
  const searchParams = useSearchParams()

  const [currentUserId, setCurrentUserId] = useState<string>("")

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        // Fetch user info to get user type and ID
        const userResponse = await fetch("/api/auth/user", { credentials: "include" });
        if (!userResponse.ok) throw new Error("Not authenticated");
        const userData = await userResponse.json();
        setUserType(userData.user_type || "personal");
        setCurrentUserId(userData.id || "");

        // Fetch expenses
        const expensesResponse = await fetch("/api/expenses", { credentials: "include" });
        if (!expensesResponse.ok) throw new Error("Failed to fetch expenses");
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData);
      } catch (err) {
        console.error("Error fetching expenses:", err);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [isAddOpen]);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    return matchesSearch && matchesCategory
  })

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
          {userType === "personal" && (
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
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
              <SelectItem value="Food">Food</SelectItem>
              <SelectItem value="Travel">Travel</SelectItem>
              <SelectItem value="Bills">Bills</SelectItem>
              <SelectItem value="Groceries">Groceries</SelectItem>
              <SelectItem value="Shopping">Shopping</SelectItem>
              <SelectItem value="Entertainment">Entertainment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading expenses...</div>
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

        <AddExpenseDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      </div>
    </Suspense>
  )
}
