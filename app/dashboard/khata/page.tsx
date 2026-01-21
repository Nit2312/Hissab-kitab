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
import { useSearchParams } from "next/navigation"
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
  customer: string
  type: "credit" | "payment"
  amount: number
  date: string
  description: string | null
}

const Loading = () => null;

export default function KhataPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [totalCollectedToday, setTotalCollectedToday] = useState(0)
  const [totalCreditToday, setTotalCreditToday] = useState(0)
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
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
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAddOpen])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchQuery))
  )

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Khata / Bahi Khata</h2>
            <p className="text-muted-foreground">Manage your customer credit and payments</p>
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
          <Card>
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
          <Card>
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
          <Card>
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
          <TabsList>
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
              <div className="py-8 text-center text-muted-foreground">Loading customers...</div>
            ) : filteredCustomers.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCustomers.map((customer) => (
                  <KhataCustomerCard key={customer.id} customer={customer} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No customers found</p>
                <Button variant="link" onClick={() => setIsAddOpen(true)}>
                  Add your first customer
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest credit and payment entries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading transactions...</div>
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
                  <div className="py-8 text-center text-muted-foreground">No transactions yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AddTransactionDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      </div>
    </Suspense>
  )
}
