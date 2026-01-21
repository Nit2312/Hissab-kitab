"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, ArrowRight, CheckCircle } from "lucide-react"
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog"

const pendingSettlements = [
  {
    id: "1",
    name: "Priya Sharma",
    initials: "PS",
    amount: 1200,
    type: "owes_you",
    lastReminder: "2 days ago"
  },
  {
    id: "2",
    name: "Rahul Verma",
    initials: "RV",
    amount: 2500,
    type: "owes_you",
    lastReminder: null
  },
  {
    id: "3",
    name: "Amit Singh",
    initials: "AS",
    amount: 800,
    type: "you_owe",
    lastReminder: null
  },
  {
    id: "4",
    name: "Sneha Patel",
    initials: "SP",
    amount: 1650,
    type: "you_owe",
    lastReminder: null
  }
]

const settlementHistory = [
  {
    id: "1",
    name: "Vikram Mehta",
    initials: "VM",
    amount: 2080,
    type: "received",
    date: "2024-01-12",
    method: "UPI"
  },
  {
    id: "2",
    name: "Kavita Rao",
    initials: "KR",
    amount: 950,
    type: "paid",
    date: "2024-01-10",
    method: "Cash"
  },
  {
    id: "3",
    name: "Deepak Jain",
    initials: "DJ",
    amount: 1500,
    type: "received",
    date: "2024-01-05",
    method: "Bank Transfer"
  }
]

type PendingSettlement = {
  id: string
  name: string
  initials: string
  amount: number
  type: "owes_you" | "you_owe"
  lastReminder: string | null
  userId?: string
}

type SettlementHistory = {
  id: string
  name: string
  initials: string
  amount: number
  type: "received" | "paid"
  date: string
  method: string
}

export default function SettlementsPage() {
  const [isSettleOpen, setIsSettleOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<PendingSettlement | null>(null)
  const [pendingSettlements, setPendingSettlements] = useState<PendingSettlement[]>([])
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Get current user
        const userResponse = await fetch("/api/auth/user")
        if (!userResponse.ok) throw new Error("Not authenticated")
        const user = await userResponse.json()

        // Fetch settlements history
        const settlementsResponse = await fetch("/api/settlements")
        if (!settlementsResponse.ok) throw new Error("Failed to fetch settlements")
        const settlements = await settlementsResponse.json()

        // Fetch user details for settlements
        const history: SettlementHistory[] = await Promise.all(
          settlements.map(async (s: any) => {
            const isFromUser = s.from_user_id === user.id
            const otherUserId = isFromUser ? s.to_user_id : s.from_user_id

            // Try to get other user's name
            let otherUserName = "Unknown"
            try {
              const otherUserResponse = await fetch(`/api/users/${otherUserId}`)
              if (otherUserResponse.ok) {
                const otherUser = await otherUserResponse.json()
                otherUserName = otherUser.full_name || otherUser.email?.split("@")[0] || "Unknown"
              }
            } catch {
              // Use email if available
              otherUserName = "User"
            }

            const initials = otherUserName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

            return {
              id: s.id,
              name: otherUserName,
              initials,
              amount: Number(s.amount),
              type: isFromUser ? "paid" : "received",
              date: s.settled_at || s.created_at,
              method: s.payment_method || "other",
            }
          })
        )

        setSettlementHistory(history)

        // TODO: Calculate pending settlements from expense_splits
        // This is complex and would require aggregating splits by user
        // For now, we'll leave it empty or use a simplified calculation
        setPendingSettlements([])
      } catch (err) {
        console.error("Error fetching settlements:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isSettleOpen])

  const totalOwedToYou = pendingSettlements
    .filter(s => s.type === "owes_you")
    .reduce((sum, s) => sum + s.amount, 0)

  const totalYouOwe = pendingSettlements
    .filter(s => s.type === "you_owe")
    .reduce((sum, s) => sum + s.amount, 0)

  const handleSettle = (person: typeof pendingSettlements[0]) => {
    setSelectedPerson(person)
    setIsSettleOpen(true)
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settlements</h2>
        <p className="text-muted-foreground">Track and record your payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Owed to You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              +₹{totalOwedToYou.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground">
              From {pendingSettlements.filter(s => s.type === "owes_you").length} people
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total You Owe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              -₹{totalYouOwe.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground">
              To {pendingSettlements.filter(s => s.type === "you_owe").length} people
            </p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              totalOwedToYou - totalYouOwe >= 0 ? "text-primary" : "text-destructive"
            }`}>
              {totalOwedToYou - totalYouOwe >= 0 ? "+" : ""}₹{(totalOwedToYou - totalYouOwe).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground">
              {totalOwedToYou - totalYouOwe >= 0 ? "You're in credit" : "You're in debt"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading settlements...</div>
          ) : pendingSettlements.length > 0 ? (
            pendingSettlements.map((settlement) => (
            <Card key={settlement.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className={`${
                      settlement.type === "owes_you"
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {settlement.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{settlement.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {settlement.type === "owes_you" ? "owes you" : "you owe"}
                    </p>
                    {settlement.lastReminder && (
                      <p className="text-xs text-muted-foreground">
                        Reminder sent {settlement.lastReminder}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold ${
                    settlement.type === "owes_you" ? "text-primary" : "text-destructive"
                  }`}>
                    {settlement.type === "owes_you" ? "+" : "-"}₹{settlement.amount.toLocaleString("en-IN")}
                  </span>
                  <Button size="sm" onClick={() => handleSettle(settlement)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Settle
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground">No pending settlements</div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading history...</div>
          ) : settlementHistory.length > 0 ? (
            settlementHistory.map((settlement) => (
            <Card key={settlement.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {settlement.type === "received" ? "Received from" : "Paid to"} {settlement.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {settlement.method}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(settlement.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`text-lg font-bold ${
                  settlement.type === "received" ? "text-primary" : "text-muted-foreground"
                }`}>
                  {settlement.type === "received" ? "+" : "-"}₹{settlement.amount.toLocaleString("en-IN")}
                </span>
              </CardContent>
            </Card>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground">No settlement history</div>
          )}
        </TabsContent>
      </Tabs>

      <SettleUpDialog
        open={isSettleOpen}
        onOpenChange={setIsSettleOpen}
        person={selectedPerson}
      />
    </div>
  )
}
