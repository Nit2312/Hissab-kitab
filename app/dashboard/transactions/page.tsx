"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  Filter
} from "lucide-react"
import { AddTransactionDialog } from "@/components/khata/add-transaction-dialog"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

type Transaction = {
  id: string
  customer: string
  customer_id: string
  type: "credit" | "payment"
  amount: number
  date: string
  description: string | null
  customer_phone?: string
}

const Loading = () => null;

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<string>("personal")
  const [totalCredit, setTotalCredit] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)
  const [filterType, setFilterType] = useState<"all" | "credit" | "payment">("all")
  const searchParams = useSearchParams()

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      try {
        // Get current user
        const userResponse = await fetch("/api/auth/user", { credentials: "include" })
        if (!userResponse.ok) throw new Error("Not authenticated")
        const user = await userResponse.json()
        setUserType(user.user_type || "personal")

        // Only allow business users to access transactions page
        if (user.user_type !== "business") {
          // Redirect personal users to personal dashboard
          window.location.href = "/dashboard"
          return
        }

        // Fetch transactions
        const response = await fetch("/api/khata/transactions")
        if (!response.ok) throw new Error("Failed to fetch transactions")
        const data = await response.json()

        // Calculate totals
        const creditTotal = data
          .filter((t: any) => t.type === "credit")
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
        const paymentTotal = data
          .filter((t: any) => t.type === "payment")
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        setTransactions(data)
        setTotalCredit(creditTotal)
        setTotalPayments(paymentTotal)
      } catch (err) {
        console.error("Error fetching transactions:", err)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [isAddOpen])

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (transaction.customer_phone && transaction.customer_phone.includes(searchQuery)) ||
      (transaction.description && transaction.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = filterType === "all" || transaction.type === filterType
    
    return matchesSearch && matchesType
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
            <p className="text-muted-foreground">View and manage all your credit and payment transactions</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Credit Given
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                ₹{totalCredit.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">
                {transactions.filter(t => t.type === "credit").length} credits
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Payments Received
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                ₹{totalPayments.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">
                {transactions.filter(t => t.type === "payment").length} payments
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Balance
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${
                totalCredit > totalPayments ? "text-destructive" : "text-primary"
              }`}>
                ₹{Math.abs(totalCredit - totalPayments).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalCredit > totalPayments ? "To be collected" : "Net collected"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
              <Badge variant="secondary">{transactions.length}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {transactions.length}
              </p>
              <p className="text-xs text-muted-foreground">
                All time transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer, phone, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filterType} onValueChange={(value: any) => setFilterType(value)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="credit">Credit</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transactions found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading transactions...</div>
            ) : filteredTransactions.length > 0 ? (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        transaction.type === "credit"
                          ? "bg-destructive/10"
                          : "bg-primary/10"
                      }`}>
                        {transaction.type === "credit" ? (
                          <ArrowUpRight className="h-5 w-5 text-destructive" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{transaction.customer}</p>
                          <Badge variant={transaction.type === "credit" ? "destructive" : "secondary"} className="text-xs">
                            {transaction.type === "credit" ? "Credit" : "Payment"}
                          </Badge>
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatDate(transaction.date)}</span>
                          {transaction.customer_phone && (
                            <span>{transaction.customer_phone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.type === "credit" ? "text-destructive" : "text-primary"
                      }`}>
                        {transaction.type === "credit" ? "-" : "+"}₹{transaction.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No transactions found</p>
                <Button variant="link" onClick={() => setIsAddOpen(true)}>
                  Add your first transaction
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <AddTransactionDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      </div>
    </Suspense>
  )
}
