"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Send, Clock, CheckCircle } from "lucide-react"
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

type ReminderHistory = {
  id: string
  name: string
  initials: string
  amount: number
  sentDate: string
  type: "manual" | "auto"
}

export default function RemindersPage() {
  const [autoReminders, setAutoReminders] = useState(true)
  const [pendingReminders, setPendingReminders] = useState<PendingSettlement[]>([])
  const [reminderHistory, setReminderHistory] = useState<ReminderHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    setLoading(true)
    try {
      // Get current user
      const userResponse = await fetch("/api/auth/user")
      if (!userResponse.ok) return
      const user = await userResponse.json()
      setCurrentUserId(user.id)

      // Only allow personal users to access personal reminders
      if (user.user_type === "business") {
        // Redirect business users to business khata page
        window.location.href = "/dashboard/khata"
        return
      }

      // Fetch pending settlements (only people who owe you money)
      const pendingResponse = await fetch("/api/settlements/pending")
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json()
        console.log('🔍 Reminders Page - Raw pending data:', pendingData)
        console.log('🔍 Reminders Page - Current user ID:', currentUserId)
        console.log('🔍 Reminders Page - Pending data length:', pendingData.length)
        
        // Log each settlement for debugging
        pendingData.forEach((settlement: any, index: number) => {
          console.log(`🔍 Reminders Page - Settlement ${index}:`, {
            name: settlement.name,
            amount: settlement.amount,
            type: settlement.type
          })
        });
        
        // Only show people who owe you money (not people you owe)
        const owesYouData = pendingData.filter((s: PendingSettlement) => s.type === "owes_you")
        console.log('🔍 Reminders Page - Filtered owes_you data:', owesYouData)
        console.log('🔍 Reminders Page - Final owes_you count:', owesYouData.length)
        setPendingReminders(owesYouData)
      } else {
        console.error('🔍 Reminders Page - Failed to fetch pending settlements')
        setPendingReminders([])
      }

      // Fetch reminder history
      const remindersResponse = await fetch("/api/reminders")
      if (remindersResponse.ok) {
        const remindersData = await remindersResponse.json()

        const history: ReminderHistory[] = remindersData.map((reminder: any) => ({
          id: reminder.id,
          name: reminder.to_name || "Unknown",
          initials: (reminder.to_name || "UK").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
          amount: Number(reminder.amount),
          sentDate: reminder.sent_at || reminder.created_at,
          type: reminder.reminder_type as "manual" | "auto"
        }))

        setReminderHistory(history)
      }
    } catch (err) {
      console.error("Error fetching reminders:", err)
      toast({
        title: "Error",
        description: "Failed to load reminders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendReminder = async (reminder: PendingSettlement) => {
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: reminder.userId || undefined,
          to_name: reminder.name,
          amount: reminder.amount,
          message: `Reminder: You owe ₹${reminder.amount.toLocaleString("en-IN")}`,
          reminder_type: "manual",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to send reminder")
      }

      toast({
        title: "Reminder sent",
        description: `Reminder sent to ${reminder.name}`,
      })

      // Refresh reminders
      fetchReminders()
    } catch (err: any) {
      console.error("Error sending reminder:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to send reminder",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reminders</h2>
          <p className="text-muted-foreground">Send payment reminders to your contacts</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="auto-reminders" className="text-sm">
            Auto Reminders
          </Label>
          <Switch
            id="auto-reminders"
            checked={autoReminders}
            onCheckedChange={setAutoReminders}
          />
        </div>
      </div>

      {/* Pending Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Payments</CardTitle>
          <CardDescription>People who owe you money</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading reminders...</div>
          ) : pendingReminders.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No pending payments</p>
              <p className="text-sm text-muted-foreground">People who owe you money will appear here</p>
            </div>
          ) : (
            pendingReminders.map((reminder) => (
              <Card key={reminder.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {reminder.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{reminder.name}</p>
                        <p className="text-sm text-muted-foreground">
                          owes you ₹{reminder.amount.toLocaleString("en-IN")}
                        </p>
                        {reminder.groupNames && reminder.groupNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {reminder.groupNames.slice(0, 2).map((groupName, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {groupName}
                              </Badge>
                            ))}
                            {reminder.groupNames.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{reminder.groupNames.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">
                        +₹{reminder.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {reminder.memberEmail && (
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span>{reminder.memberEmail}</span>
                        </div>
                      )}
                      {reminder.isRegistered && (
                        <Badge variant="outline" className="text-xs">Registered User</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleSendReminder(reminder)}>
                        <Send className="mr-2 h-4 w-4" />
                        Send Reminder
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder Settings</CardTitle>
          <CardDescription>Configure automatic reminder preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Send before due date</p>
                <p className="text-sm text-muted-foreground">Remind 3 days before payment is due</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Bell className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-foreground">Send for overdue payments</p>
                <p className="text-sm text-muted-foreground">Remind weekly for overdue amounts</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Reminder History */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder History</CardTitle>
          <CardDescription>Recently sent reminders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reminderHistory.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Reminder sent to {reminder.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {reminder.type === "auto" ? "Automatic" : "Manual"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(reminder.sentDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <span className="font-medium text-muted-foreground">
                ₹{reminder.amount.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
