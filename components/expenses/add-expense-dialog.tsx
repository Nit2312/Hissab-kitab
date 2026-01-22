"use client"

import React from "react"
import { useState, useEffect } from "react"
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

interface Category {
  id: string
  name: string
}

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
  const [categories, setCategories] = useState<Category[]>([])
  const isEditMode = !!expense
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0]
  })

  // Fetch categories when dialog opens
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories")
        if (!response.ok) {
          // If response is not ok, try to get error details but don't crash
          let errorMessage = "Failed to load categories"
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError)
          }
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
          return
        }
        const data = await response.json()
        setCategories(data)
      } catch (err) {
        console.error("Error fetching categories:", err)
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive",
        })
      }
    }
    if (open) {
      fetchCategories()
    }
  }, [open])

  // Update form data when dialog opens
  React.useEffect(() => {
    if (open) {
      if (expense) {
        // Edit mode - populate with expense data
        setFormData({
          description: expense.description,
          amount: expense.amount.toString(),
          category: expense.category,
          date: expense.date
        })
      } else {
        // Add mode - reset form
        setFormData({
          description: "",
          amount: "",
          category: "",
          date: new Date().toISOString().split("T")[0]
        })
      }
    }
  }, [open, expense])


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
            category: formData.category || "Others",
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
            category: formData.category || "Others",
            group_id: null,
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
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
