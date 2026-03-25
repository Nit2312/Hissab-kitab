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
  ArrowDownLeft
} from "lucide-react"
import { KhataCustomerCard } from "@/components/khata/khata-customer-card"
import { AddTransactionDialog } from "@/components/khata/add-transaction-dialog"
import { Suspense } from "react"

type Customer = {
  id: string
  name: string
  phone: string | null
  balance: number
  type: "credit" | "settled"
  lastTransaction: string | null
  totalCredit: number
  totalPaid: number
}

type Transaction = {
  id: string
  customer_id?: string
  customer: string
  type: "credit" | "payment"
  amount: number
  date: string
  description: string | null
}

function normalizeTransaction(transaction: any): Transaction {
  return {
    id: transaction.id,
    customer_id: transaction.customer_id,
    customer: transaction.customer || "Unknown",
    type: transaction.type,
    amount: Number(transaction.amount || 0),
    date: transaction.date,
    description: transaction.description || null,
  }
}

const Loading = () => null;

export default function KhataPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<string>("personal")
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [totalCollectedToday, setTotalCollectedToday] = useState(0)
  const [totalCreditToday, setTotalCreditToday] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKhataData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Get current user
        const userResponse = await fetch("/api/auth/user", { credentials: "include" })
        if (!userResponse.ok) throw new Error("Not authenticated")
        const userData = await userResponse.json()
        setUserType(userData.user_type || "personal")

        // Only allow business users to access khata
        if (userData.user_type !== "business") {
          // Redirect personal users to personal dashboard
          window.location.assign("/dashboard")
          return
        }

        // Fetch customers with balances
        const customersResponse = await fetch("/api/khata/customers")
        if (!customersResponse.ok) throw new Error("Failed to fetch customers")
        const customersWithBalances: Customer[] = await customersResponse.json()

        // Fetch recent transactions
        const transactionsResponse = await fetch("/api/khata/transactions")
        if (!transactionsResponse.ok) throw new Error("Failed to fetch transactions")
        const transactionsData = await transactionsResponse.json()

        // Calculate summary stats
        const outstanding = customersWithBalances.reduce((sum, c) => sum + c.balance, 0)
        const today = new Date().toISOString().split("T")[0]
        const todayTransactions = transactionsData.filter((t: any) => t.date === today) || []
        const collectedToday = todayTransactions
          .filter((t: any) => t.type === "payment")
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
        const creditToday = todayTransactions
          .filter((t: any) => t.type === "credit")
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        // Format recent transactions
        const recent: Transaction[] = transactionsData
          .slice(0, 10)
          .map((t: any) => ({
            id: t.id,
            customer: t.customer || "Unknown",
            type: t.type as "credit" | "payment",
            amount: Number(t.amount),
            date: t.date,
            description: t.description,
          }))

        setCustomers(customersWithBalances)
        setRecentTransactions(recent)
        setTotalOutstanding(outstanding)
        setTotalCollectedToday(collectedToday)
        setTotalCreditToday(creditToday)
      } catch (err) {
        console.error("Error fetching khata data:", err)
        setCustomers([])
        setRecentTransactions([])
        setError("We could not load your khata data right now. Please try again in a moment.")
      } finally {
        setLoading(false)
      }
    }

    fetchKhataData()
  }, [])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchQuery))
  )

  const handleTransactionAdded = (transaction?: any) => {
    if (!transaction) return

    const normalized = normalizeTransaction(transaction)
    const signedAmount = normalized.type === "credit" ? normalized.amount : -normalized.amount

    setRecentTransactions((prev) => [normalized, ...prev.filter((item) => item.id !== normalized.id)])
    setTotalOutstanding((prev) => Math.max(0, prev + signedAmount))

    if (normalized.type === "credit") {
      setTotalCreditToday((prev) => prev + normalized.amount)
    } else {
      setTotalCollectedToday((prev) => prev + normalized.amount)
    }

    if (normalized.customer_id) {
      setCustomers((prev) =>
        prev.map((customer) => {
          if (customer.id !== normalized.customer_id) return customer

          const nextBalance = Math.max(0, customer.balance + signedAmount)
          return {
            ...customer,
            balance: nextBalance,
            type: nextBalance > 0 ? "credit" : "settled",
          }
        })
      )
    }
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <Card className="glass-card">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Business khata
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Khata / Bahi Khata</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Manage customer credit, collections, and daily cash flow from one clean dashboard.
              </p>
            </div>
            <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Outstanding
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                ₹{totalOutstanding.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">
                From {customers.filter(c => c.type === "credit").length} customers
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Collected Today
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                ₹{totalCollectedToday.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalCollectedToday > 0 ? "Payments received today" : "No payments today"}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Credit Given Today
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-accent">
                ₹{totalCreditToday.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalCreditToday > 0 ? "New credits today" : "No credits today"}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Customers
              </CardTitle>
              <Badge variant="secondary">{customers.length}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {customers.filter(c => c.type === "credit").length}
              </p>
              <p className="text-xs text-muted-foreground">
                With pending balance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList className="w-full justify-start gap-2 rounded-2xl border border-border/60 bg-card/70 p-1">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Customer List */}
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 py-10 text-center text-muted-foreground">
                Loading customers...
              </div>
            ) : filteredCustomers.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCustomers.map((customer) => (
                  <KhataCustomerCard key={customer.id} customer={customer} />
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No customers match your search." : "No customers yet. Add your first customer to begin."}
                  </p>
                  {!searchQuery && (
                    <Button variant="link" onClick={() => setIsAddOpen(true)}>
                      Add your first customer
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest credit and payment entries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 py-10 text-center text-muted-foreground">
                    Loading transactions...
                  </div>
                ) : recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
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
                        <p className="font-medium text-foreground">{transaction.customer}</p>
                        <p className="text-sm text-muted-foreground">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${
                      transaction.type === "credit" ? "text-destructive" : "text-primary"
                    }`}>
                      {transaction.type === "credit" ? "+" : "-"}₹{transaction.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
                    No transactions yet. Add the first payment or credit entry to start tracking.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AddTransactionDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onTransactionAdded={handleTransactionAdded}
        />
      </div>
    </Suspense>
  )
}
