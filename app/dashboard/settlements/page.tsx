"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, ArrowRight, CheckCircle } from "lucide-react"
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog"
import { useToast } from "@/hooks/use-toast"

type PendingSettlement = {
  id: string
  name: string
  initials: string
  amount: number
  type: "owes_you" | "you_owe"
  lastReminder: string | null
  userId?: string
  groupId?: string
  groupName?: string
  memberEmail?: string | null
  memberPhone?: string | null
  isRegistered?: boolean
  groups?: string[]
  groupNames?: string[]
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
  const { toast } = useToast()
  const [isSettleOpen, setIsSettleOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<PendingSettlement | null>(null)
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistory[]>([])
  const [youOweList, setYouOweList] = useState<PendingSettlement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Get current user
        const userResponse = await fetch("/api/auth/user")
        if (!userResponse.ok) throw new Error("Not authenticated")
        const user = await userResponse.json()

        // Only allow personal users to access personal settlements
        if (user.user_type === "business") {
          // Redirect business users to business khata page
          window.location.href = "/dashboard/khata"
          return
        }

        // Make all API calls in parallel for faster loading
        const [settlementsResponse, pendingResponse] = await Promise.all([
          fetch("/api/settlements"),
          fetch("/api/settlements/pending")
        ])

        // Process settlements history
        if (settlementsResponse.ok) {
          const settlements = await settlementsResponse.json()

          // Use user data directly from settlements without additional API calls
          const history: SettlementHistory[] = settlements.map((s: any) => {
            const isFromUser = s.from_user_id === user.id
            const otherUserId = isFromUser ? s.to_user_id : s.from_user_id

            // Use the name from settlement data or fallback
            const otherUserName = s.from_user_id === user.id 
              ? s.to_user_name || s.to_user_id 
              : s.from_user_name || s.from_user_id

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

          setSettlementHistory(history)
        } else {
          console.error("Failed to fetch settlements history")
          setSettlementHistory([])
        }

        // Process pending settlements - only show money you owe
        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json()
          console.log('🔍 Settlements Page - Raw pending data:', pendingData)
          console.log('🔍 Settlements Page - Current user ID:', user.id)
          
          // Log each settlement for debugging
          pendingData.forEach((settlement: any, index: number) => {
            console.log(`🔍 Settlements Page - Settlement ${index}:`, {
              name: settlement.name,
              amount: settlement.amount,
              type: settlement.type
            })
          });
          
          // Only show people you owe money to
          const youOweData = pendingData.filter((s: PendingSettlement) => s.type === "you_owe")
          console.log('🔍 Settlements Page - Filtered you_owe data:', youOweData)
          console.log('🔍 Settlements Page - Final you_owe count:', youOweData.length)
          setYouOweList(youOweData)
        } else {
          console.error("Failed to fetch pending settlements")
          setYouOweList([])
        }
      } catch (err) {
        console.error("Error fetching settlements:", err)
        // Set empty arrays on error to prevent infinite loading
        setSettlementHistory([])
        setYouOweList([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isSettleOpen])

  const handleSettle = (person: PendingSettlement) => {
    setSelectedPerson(person)
    setIsSettleOpen(true)
  }

  const handleSendReminder = (person: PendingSettlement) => {
    // TODO: Implement reminder functionality
    toast({
      title: "Reminder Sent",
      description: `Reminder sent to ${person.name} for ₹${person.amount.toLocaleString("en-IN")}`,
    })
  }

  const handleSettled = () => {
    // Refresh settlements data when a settlement is recorded
    window.location.reload()
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
              Total You Owe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              ) : (
                `-₹${youOweList.reduce((sum, s) => sum + s.amount, 0).toLocaleString("en-IN")}`
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? (
                <div className="h-4 w-16 bg-muted rounded animate-pulse mt-1"></div>
              ) : (
                `To ${youOweList.length} people`
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              ) : (
                `-₹${settlementHistory.filter(s => s.type === "paid").reduce((sum, s) => sum + s.amount, 0).toLocaleString("en-IN")}`
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? (
                <div className="h-4 w-16 bg-muted rounded animate-pulse mt-1"></div>
              ) : (
                `In ${settlementHistory.filter(s => s.type === "paid").length} payments`
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              ) : (
                `-₹${youOweList.reduce((sum, s) => sum + s.amount, 0).toLocaleString("en-IN")}`
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? (
                <div className="h-4 w-16 bg-muted rounded animate-pulse mt-1"></div>
              ) : (
                `${youOweList.length} pending payments`
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="you-owe" className="space-y-4">
        <TabsList>
          <TabsTrigger value="you-owe">You Owe</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="you-owe" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                          <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
                          <div className="h-5 w-20 bg-muted rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-6 w-16 bg-muted rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-4">
                        <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
                        <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                        <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : youOweList.length > 0 ? (
            youOweList.map((settlement) => (
              <Card key={settlement.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-destructive/10 text-destructive">
                          {settlement.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{settlement.name}</p>
                        <p className="text-sm text-muted-foreground">
                          you owe ₹{settlement.amount.toLocaleString("en-IN")}
                        </p>
                        {settlement.groupNames && settlement.groupNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {settlement.groupNames.slice(0, 2).map((groupName, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {groupName}
                              </Badge>
                            ))}
                            {settlement.groupNames.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{settlement.groupNames.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-destructive">
                        -₹{settlement.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {settlement.memberEmail && (
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span>{settlement.memberEmail}</span>
                        </div>
                      )}
                      {settlement.memberPhone && (
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          <span>{settlement.memberPhone}</span>
                        </div>
                      )}
                      {settlement.isRegistered && (
                        <Badge variant="outline" className="text-xs">Registered User</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleSettle(settlement)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground">You don't owe anyone money</div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-40 bg-muted rounded animate-pulse"></div>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-16 bg-muted rounded animate-pulse"></div>
                          <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-muted rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
        onSettled={handleSettled}
      />
    </div>
  )
}
