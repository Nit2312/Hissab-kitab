"use client"

import React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const categories = [
  "Food",
  "Travel",
  "Bills",
  "Groceries",
  "Shopping",
  "Entertainment",
  "Rent",
  "Others"
]

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddExpenseDialog({ open, onOpenChange }: AddExpenseDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    group: "",
    splitType: "equal",
    date: new Date().toISOString().split("T")[0]
  })

  // Fetch groups when dialog opens
  React.useEffect(() => {
    if (open) {
      const fetchGroups = async () => {
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          // Fetch groups where user is a member
          const { data: groupMembers } = await supabase
            .from("group_members")
            .select("group_id")
            .eq("user_id", user.id)

          const groupIds = groupMembers?.map(gm => gm.group_id) || []
          if (groupIds.length === 0) {
            setGroups([])
            return
          }

          const { data: groupsData } = await supabase
            .from("groups")
            .select("id, name")
            .in("id", groupIds)
            .order("created_at", { ascending: false })

          setGroups(groupsData || [])
        } catch (err) {
          console.error("Error fetching groups:", err)
        }
      }
      fetchGroups()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert([
          {
            group_id: formData.group || null,
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category.toLowerCase() || "other",
            paid_by: user.id,
            split_type: formData.splitType,
            date: formData.date,
          }
        ])
        .select()
        .single()

      if (expenseError) throw expenseError

      // If expense is in a group, create expense splits
      if (formData.group && expense) {
        // Fetch group members
        const { data: members } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", formData.group)

        if (members && members.length > 0) {
          const amount = parseFloat(formData.amount)
          const splitAmount = amount / members.length

          // Create splits for each member (excluding the payer if they're a member)
          const splits = members
            .filter(m => {
              // For now, include all members. In a real scenario, you might want to exclude the payer
              return true
            })
            .map(member => ({
              expense_id: expense.id,
              member_id: member.id,
              amount: splitAmount,
              is_paid: false,
            }))

          if (splits.length > 0) {
            const { error: splitsError } = await supabase
              .from("expense_splits")
              .insert(splits)

            if (splitsError) {
              console.error("Error creating splits:", splitsError)
              // Don't throw - expense is already created
            }
          }
        }
      }

      onOpenChange(false)
      setFormData({
        description: "",
        amount: "",
        category: "",
        group: "",
        splitType: "equal",
        date: new Date().toISOString().split("T")[0]
      })
      toast({
        title: "Expense added",
        description: "Your expense has been successfully added.",
      })
      // Refresh the page to show new expense
      window.location.reload()
    } catch (err) {
      console.error("Error creating expense:", err)
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Record a new expense and split it with your group.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Dinner at restaurant"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group (Optional)</Label>
                <Select
                  value={formData.group || "none"}
                  onValueChange={(value) => setFormData({ ...formData, group: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Group</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Split Type</Label>
              <RadioGroup
                value={formData.splitType}
                onValueChange={(value) => setFormData({ ...formData, splitType: value })}
                className="grid grid-cols-3 gap-4"
              >
                {[
                  { value: "equal", label: "Equal", desc: "Split equally" },
                  { value: "unequal", label: "Unequal", desc: "Custom amounts" },
                  { value: "percentage", label: "Percentage", desc: "By percent" }
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors ${
                      formData.splitType === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                    <span className={`text-sm font-medium ${
                      formData.splitType === option.value ? "text-primary" : "text-foreground"
                    }`}>
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {option.desc}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.description || !formData.amount}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
