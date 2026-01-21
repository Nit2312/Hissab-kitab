"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Send, Clock, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type PendingReminder = {
  id: string
  name: string
  initials: string
  amount: number
  userId: string | null
  lastReminder: string | null
  status: "overdue" | "upcoming"
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
  const [pendingReminders, setPendingReminders] = useState<PendingReminder[]>([])
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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      setCurrentUserId(user.id)

      // Fetch pending payments from expense splits
      const { data: groupMembers } = await supabase
        .from("group_members")
        .select("group_id, user_id, name")
        .eq("group_id", "(SELECT DISTINCT group_id FROM group_members WHERE user_id = $1)")

      // Calculate who owes current user money
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, amount, paid_by, group_id")
        .eq("paid_by", user.id)

      // Get expense splits
      const { data: splits } = await supabase
        .from("expense_splits")
        .select("expense_id, user_id, amount")

      // Calculate balances per user
      const balances = new Map<string, { name: string; amount: number }>()
      
      if (expenses && splits) {
        for (const expense of expenses) {
          const expenseSplits = splits.filter(s => s.expense_id === expense.id)
          for (const split of expenseSplits) {
            if (split.user_id !== user.id) {
              const current = balances.get(split.user_id) || { name: "", amount: 0 }
              balances.set(split.user_id, {
                ...current,
                amount: current.amount + Number(split.amount)
              })
            }
          }
        }
      }

      // Get member names
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id, name")
        .in("user_id", Array.from(balances.keys()))

      const pending: PendingReminder[] = Array.from(balances.entries())
        .filter(([_, data]) => data.amount > 0)
        .map(([userId, data]) => {
          const member = members?.find(m => m.user_id === userId)
          const name = member?.name || "Unknown"
          return {
            id: userId,
            name,
            initials: name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
            amount: data.amount,
            userId,
            lastReminder: null,
            status: "upcoming" as const
          }
        })

      setPendingReminders(pending)

      // Fetch reminder history
      const { data: historyData } = await supabase
        .from("reminders")
        .select("*")
        .eq("from_user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(10)

      const history: ReminderHistory[] = (historyData || []).map(reminder => ({
        id: reminder.id,
        name: reminder.to_name || "Unknown",
        initials: (reminder.to_name || "UK").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
        amount: Number(reminder.amount),
        sentDate: reminder.sent_at || reminder.created_at,
        type: reminder.reminder_type as "manual" | "auto"
      }))

      setReminderHistory(history)
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

  const handleSendReminder = async (reminder: PendingReminder) => {
    try {
      const supabase = createClient()
      
      // Insert reminder record
      const { error } = await supabase
        .from("reminders")
        .insert({
          from_user_id: currentUserId,
          to_user_id: reminder.userId,
          to_name: reminder.name,
          amount: reminder.amount,
          message: `Reminder: You owe ₹${reminder.amount.toLocaleString("en-IN")}`,
          status: "sent",
          reminder_type: "manual",
          sent_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: "Reminder sent",
        description: `Reminder sent to ${reminder.name}`,
      })

      // Refresh reminders
      fetchReminders()
    } catch (err) {
      console.error("Error sending reminder:", err)
      toast({
        title: "Error",
        description: "Failed to send reminder",
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
              <p className="text-sm text-muted-foreground">People you owe money will appear here</p>
            </div>
          ) : (
            pendingReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className={`${
                      reminder.status === "overdue"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {reminder.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{reminder.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={reminder.status === "overdue" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {reminder.status === "overdue" ? "Overdue" : "Pending"}
                      </Badge>
                    </div>
                    {reminder.lastReminder && (
                      <p className="text-xs text-muted-foreground">
                        Last reminder: {new Date(reminder.lastReminder).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-primary">
                    ₹{reminder.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                  <Button
                    size="sm"
                    variant={reminder.status === "overdue" ? "destructive" : "default"}
                    onClick={() => handleSendReminder(reminder)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {reminder.lastReminder ? "Remind Again" : "Send Reminder"}
                  </Button>
                </div>
              </div>
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
