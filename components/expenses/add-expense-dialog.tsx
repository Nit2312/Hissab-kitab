"use client"

import React from "react"
import { useState } from "react"
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
  defaultGroupId?: string
  expense?: {
    id: string
    description: string
    amount: number
    category: string
    date: string
  }
  onExpenseUpdated?: () => void
}

export function AddExpenseDialog({ open, onOpenChange, defaultGroupId, expense, onExpenseUpdated }: AddExpenseDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const isEditMode = !!expense
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    group: defaultGroupId || "",
    date: new Date().toISOString().split("T")[0]
  })

  // Update form data when defaultGroupId changes or dialog opens
  React.useEffect(() => {
    if (open) {
      if (expense) {
        // Edit mode - populate with expense data
        setFormData({
          description: expense.description,
          amount: expense.amount.toString(),
          category: expense.category,
          group: defaultGroupId || "",
          date: expense.date
        })
      } else if (defaultGroupId) {
        // Add mode with default group
        setFormData(prev => ({
          ...prev,
          group: defaultGroupId
        }))
      } else {
        // Add mode without default group
        setFormData(prev => ({
          ...prev,
          group: ""
        }))
      }
    }
    // Reset form when dialog closes
    if (!open) {
      setFormData({
        description: "",
        amount: "",
        category: "",
        group: defaultGroupId || "",
        date: new Date().toISOString().split("T")[0]
      })
    }
  }, [open, defaultGroupId, expense])

  // Fetch groups when dialog opens
  React.useEffect(() => {
    if (open) {
      const fetchGroups = async () => {
        try {
          const response = await fetch("/api/groups");
          if (!response.ok) return;
          const groupsData = await response.json();
          setGroups(groupsData.map((g: any) => ({ id: g.id, name: g.name })));
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
      if (isEditMode && expense) {
        // Update existing expense
        const response = await fetch(`/api/expenses/${expense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category || "other",
            date: formData.date,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to update expense")
        }

        onOpenChange(false)
        toast({
          title: "Expense updated",
          description: "Your expense has been successfully updated.",
        })
        if (onExpenseUpdated) {
          onExpenseUpdated()
        }
      } else {
        // Create new expense
        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category || "other",
            group_id: formData.group || null,
            split_type: "equal",
            date: formData.date,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to add expense")
        }

        onOpenChange(false)
        setFormData({
          description: "",
          amount: "",
          category: "",
          group: defaultGroupId || "",
          date: new Date().toISOString().split("T")[0]
        })
        toast({
          title: "Expense added",
          description: "Your expense has been successfully added.",
        })
        if (onExpenseUpdated) {
          onExpenseUpdated()
        }
      }
    } catch (err: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} expense:`, err)
      toast({
        title: "Error",
        description: err.message || `Failed to ${isEditMode ? 'update' : 'add'} expense. Please try again.`,
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
          <DialogTitle>{isEditMode ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update the expense details." : "Record a new expense and split it with your group."}
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

            <div className={`grid gap-4 ${defaultGroupId ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
              {!defaultGroupId && (
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
              )}
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
                  {isEditMode ? "Updating..." : "Adding..."}
                </>
              ) : (
                isEditMode ? "Update Expense" : "Add Expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
