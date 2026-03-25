"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee,
  Users,
  Calendar,
  Download,
  Filter
} from "lucide-react"
import { Suspense } from "react"
import { useToast } from "@/hooks/use-toast"

type ReportData = {
  totalCustomers: number
  totalOutstanding: number
  totalCollected: number
  totalCredit: number
  averageTransaction: number
  topCustomers: Array<{
    name: string
    balance: number
    totalCredit: number
    totalPaid: number
  }>
  monthlyTrends: Array<{
    month: string
    credit: number
    payments: number
  }>
}

const Loading = () => null;

export default function ReportsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<string>("personal")
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "quarter" | "year">("month")

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        // Get current user
        const userResponse = await fetch("/api/auth/user", { credentials: "include" })
        if (!userResponse.ok) throw new Error("Not authenticated")
        const user = await userResponse.json()
        setUserType(user.user_type || "personal")

        // Only allow business users to access reports page
        if (user.user_type !== "business") {
          // Redirect personal users to personal dashboard
          window.location.href = "/dashboard"
          return
        }

        // Fetch report data (this would be a real API endpoint)
        // For now, using mock data
        const mockData: ReportData = {
          totalCustomers: 45,
          totalOutstanding: 125000,
          totalCollected: 89000,
          totalCredit: 214000,
          averageTransaction: 4756,
          topCustomers: [
            { name: "Rahul Sharma", balance: 15000, totalCredit: 25000, totalPaid: 10000 },
            { name: "Priya Patel", balance: 12000, totalCredit: 20000, totalPaid: 8000 },
            { name: "Amit Kumar", balance: 10000, totalCredit: 18000, totalPaid: 8000 },
            { name: "Sunita Devi", balance: 8000, totalCredit: 15000, totalPaid: 7000 },
            { name: "Vikram Singh", balance: 6000, totalCredit: 12000, totalPaid: 6000 }
          ],
          monthlyTrends: [
            { month: "Jan", credit: 45000, payments: 32000 },
            { month: "Feb", credit: 52000, payments: 38000 },
            { month: "Mar", credit: 48000, payments: 41000 },
            { month: "Apr", credit: 58000, payments: 35000 },
            { month: "May", credit: 61000, payments: 43000 },
            { month: "Jun", credit: 55000, payments: 40000 }
          ]
        }

        setReportData(mockData)
      } catch (err) {
        console.error("Error fetching reports:", err)
        setReportData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getCollectionRate = () => {
    if (!reportData) return 0
    return ((reportData.totalCollected / reportData.totalCredit) * 100).toFixed(1)
  }

  const handleExportReport = () => {
    if (!reportData) return

    const rows = [
      ["Metric", "Value"],
      ["Total Customers", String(reportData.totalCustomers)],
      ["Total Outstanding", String(reportData.totalOutstanding)],
      ["Total Collected", String(reportData.totalCollected)],
      ["Total Credit", String(reportData.totalCredit)],
      ["Average Transaction", String(reportData.averageTransaction)],
      ["Collection Rate", `${getCollectionRate()}%`],
      [],
      ["Top Customers"],
      ["Name", "Balance", "Total Credit", "Total Paid"],
      ...reportData.topCustomers.map((customer) => [
        customer.name,
        String(customer.balance),
        String(customer.totalCredit),
        String(customer.totalPaid),
      ]),
    ]

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `reports-${selectedPeriod}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Report exported",
      description: "Your report CSV is ready.",
    })
  }

  const periodLabel = {
    month: "This month",
    quarter: "This quarter",
    year: "This year",
  }[selectedPeriod]

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <Card className="glass-card overflow-hidden">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Business analytics
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Reports & Analytics</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Track your business performance, customer balances, and collection trends for {periodLabel.toLowerCase()}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportReport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  toast({
                    title: "Filters coming soon",
                    description: "Period tabs are active. Advanced filters will be added next.",
                  })
                }
              >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            </div>
          </CardContent>
        </Card>

        {/* Period Selector */}
        <Tabs value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:w-[360px]">
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="quarter">This Quarter</TabsTrigger>
            <TabsTrigger value="year">This Year</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading reports...</div>
        ) : reportData ? (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-2xl border border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Customers
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">
                    {reportData.totalCustomers}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active customers
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Outstanding
                  </CardTitle>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-destructive">
                    {formatINR(reportData.totalOutstanding)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To be collected
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Collection Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {getCollectionRate()}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Of total credit
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Transaction
                  </CardTitle>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">
                    {formatINR(reportData.averageTransaction)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Per transaction
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Customers */}
              <Card className="rounded-2xl border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Top Customers by Balance</CardTitle>
                  <CardDescription>Customers with highest outstanding amounts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reportData.topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Credit: {formatINR(customer.totalCredit)} | Paid: {formatINR(customer.totalPaid)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-destructive">{formatINR(customer.balance)}</p>
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card className="rounded-2xl border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                  <CardDescription>Credit given vs payments received</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reportData.monthlyTrends.map((trend, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{trend.month}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-destructive">{formatINR(trend.credit)}</span>
                          <span className="text-primary">{formatINR(trend.payments)}</span>
                        </div>
                      </div>
                      <div className="flex h-2 gap-1">
                        <div 
                          className="h-full bg-destructive rounded-l" 
                          style={{ width: `${(trend.credit / (trend.credit + trend.payments)) * 100}%` }}
                        />
                        <div 
                          className="h-full bg-primary rounded-r" 
                          style={{ width: `${(trend.payments / (trend.credit + trend.payments)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-destructive rounded" />
                      <span>Credit Given</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-primary rounded" />
                      <span>Payments Received</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            <Card className="rounded-2xl border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Summary Statistics</CardTitle>
                <CardDescription>Overall business performance for {periodLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{formatINR(reportData.totalCredit)}</p>
                    <p className="text-sm text-muted-foreground">Total Credit Given</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{formatINR(reportData.totalCollected)}</p>
                    <p className="text-sm text-muted-foreground">Total Collected</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">{formatINR(reportData.totalOutstanding)}</p>
                    <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No report data available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Suspense>
  )
}
