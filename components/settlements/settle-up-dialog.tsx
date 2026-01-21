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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Banknote, Smartphone, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const paymentMethods = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "bank", label: "Bank Transfer", icon: Building2 }
]

interface SettleUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: {
    id: string
    name: string
    amount: number
    type: "owes_you" | "you_owe"
    userId?: string // Add user_id if available
  } | null
}

export function SettleUpDialog({ open, onOpenChange, person }: SettleUpDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: "",
    method: "upi",
    date: new Date().toISOString().split("T")[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (!person || !person.userId) {
        throw new Error("User ID is required to record settlement")
      }

      // Determine settlement amount
      const settlementAmount = formData.amount 
        ? parseFloat(formData.amount) 
        : person.amount

      // Get current user
      const userResponse = await fetch("/api/auth/user")
      if (!userResponse.ok) throw new Error("Not authenticated")
      const user = await userResponse.json()

      // Determine from_user_id and to_user_id
      const fromUserId = person.type === "you_owe" ? user.id : person.userId
      const toUserId = person.type === "you_owe" ? person.userId : user.id

      // Create settlement
      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: toUserId,
          amount: settlementAmount,
          payment_method: formData.method === "bank" ? "bank_transfer" : formData.method,
          settled_at: formData.date,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to record settlement")
      }

      onOpenChange(false)
      setFormData({
        amount: "",
        method: "upi",
        date: new Date().toISOString().split("T")[0]
      })
      toast({
        title: "Settlement recorded",
        description: "Payment has been successfully recorded.",
      })
      // Refresh the page
      window.location.reload()
    } catch (err: any) {
      console.error("Error creating settlement:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to record settlement. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!person) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {person.type === "you_owe" ? "Pay" : "Record Payment from"} {person.name}
          </DialogTitle>
          <DialogDescription>
            {person.type === "you_owe"
              ? `You owe ₹${person.amount.toLocaleString("en-IN")} to ${person.name}`
              : `${person.name} owes you ₹${person.amount.toLocaleString("en-IN")}`
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (INR)</Label>
              <Input
                id="amount"
                type="number"
                placeholder={person.amount.toString()}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to settle full amount
              </p>
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

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup
                value={formData.method}
                onValueChange={(value) => setFormData({ ...formData, method: value })}
                className="grid grid-cols-3 gap-4"
              >
                {paymentMethods.map((method) => (
                  <Label
                    key={method.value}
                    htmlFor={method.value}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                      formData.method === method.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={method.value} id={method.value} className="sr-only" />
                    <method.icon className={`h-5 w-5 ${
                      formData.method === method.value ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <span className={`text-sm ${
                      formData.method === method.value ? "text-primary font-medium" : "text-muted-foreground"
                    }`}>
                      {method.label}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Settlement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
