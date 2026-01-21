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

import { createClient } from "@/lib/supabase/client"

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

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Fetch user profile to get user type
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single();

        const currentUserType = (profile?.user_type as "personal" | "business") || "personal";
        setUserType(currentUserType);

        // Fetch expenses based on user type
        let expensesQuery = supabase
          .from("expenses")
          .select("id, description, amount, paid_by, date, category, group_id, split_type");

        // Personal users: show expenses from groups they're in
        // Business users: don't show group expenses (they use khata instead)
        if (currentUserType === "personal") {
          // Get groups user is a member of
          const { data: groupMembers } = await supabase
            .from("group_members")
            .select("group_id")
            .eq("user_id", user.id);

          const groupIds = groupMembers?.map(gm => gm.group_id) || [];

          if (groupIds.length > 0) {
            expensesQuery = expensesQuery.or(`paid_by.eq.${user.id},group_id.in.(${groupIds.join(",")})`);
          } else {
            expensesQuery = expensesQuery.eq("paid_by", user.id);
          }
        } else {
          // Business users: only show expenses they paid (no group expenses)
          expensesQuery = expensesQuery.eq("paid_by", user.id).is("group_id", null);
        }

        const { data: expensesData, error } = await expensesQuery
          .order("date", { ascending: false });

        if (error) throw error;

        // Fetch group names, participant counts, and paid by names for each expense
        const expensesWithDetails = await Promise.all(
          (expensesData || []).map(async (expense) => {
            let groupName = null;
            let participantCount = 1;
            let paidByName = "Unknown";

            // Determine paid by name
            if (expense.paid_by === user.id) {
              paidByName = "You";
            } else if (expense.group_id) {
              // If expense is in a group, get member name
              const { data: member } = await supabase
                .from("group_members")
                .select("name")
                .eq("group_id", expense.group_id)
                .eq("user_id", expense.paid_by)
                .single();
              
              paidByName = member?.name || "Unknown";
            } else {
              // Try to get from profile
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", expense.paid_by)
                .single();
              
              paidByName = profile?.full_name || "Unknown";
            }

            // If expense has a group, fetch group name and member count
            if (expense.group_id) {
              const { data: group } = await supabase
                .from("groups")
                .select("name")
                .eq("id", expense.group_id)
                .single();

              groupName = group?.name || null;

              // Count participants from expense_splits
              const { count } = await supabase
                .from("expense_splits")
                .select("id", { count: "exact", head: true })
                .eq("expense_id", expense.id);

              participantCount = count || 1;
            }

            return {
              ...expense,
              group_name: groupName,
              participant_count: participantCount,
              paid_by_name: paidByName,
            };
          })
        );

        setExpenses(expensesWithDetails);
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
                  date: expense.date,
                  category: expense.category,
                  group: expense.group_name || "No Group",
                  splitType: expense.split_type,
                  participantCount: expense.participant_count,
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
