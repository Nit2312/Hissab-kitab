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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransactionAdded?: (transaction?: any) => void
}

export function AddTransactionDialog({ open, onOpenChange, onTransactionAdded }: AddTransactionDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    customerId: "",
    type: "credit",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0]
  })

  // Fetch customers when dialog opens
  useEffect(() => {
    if (open) {
      const fetchCustomers = async () => {
        try {
          const response = await fetch("/api/customers");
          if (!response.ok) return;
          const customersData = await response.json();
          setCustomers(customersData.map((c: any) => ({ id: c.id, name: c.name })))
        } catch (err) {
          console.error("Error fetching customers:", err)
        }
      }
      fetchCustomers()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch("/api/khata/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_id: formData.customerId,
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          date: formData.date,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add transaction");
      }

      const createdTransaction = await response.json()
      onOpenChange(false)
      setFormData({
        customerId: "",
        type: "credit",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0]
      })
      toast({
        title: "Transaction added",
        description: "Transaction has been successfully recorded.",
      })
      onTransactionAdded?.(createdTransaction)
    } catch (err: any) {
      console.error("Error creating transaction:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to add transaction. Please try again.",
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
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new credit or payment entry in your khata.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Transaction Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="credit"
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    formData.type === "credit"
                      ? "border-destructive bg-destructive/5"
                      : "border-border hover:border-destructive/50"
                  }`}
                >
                  <RadioGroupItem value="credit" id="credit" className="sr-only" />
                  <ArrowUpRight className={`h-5 w-5 ${
                    formData.type === "credit" ? "text-destructive" : "text-muted-foreground"
                  }`} />
                  <div>
                    <span className={`font-medium ${
                      formData.type === "credit" ? "text-destructive" : "text-foreground"
                    }`}>
                      Udhaar / Credit
                    </span>
                    <p className="text-xs text-muted-foreground">Customer took on credit</p>
                  </div>
                </Label>
                <Label
                  htmlFor="payment"
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    formData.type === "payment"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="payment" id="payment" className="sr-only" />
                  <ArrowDownLeft className={`h-5 w-5 ${
                    formData.type === "payment" ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <div>
                    <span className={`font-medium ${
                      formData.type === "payment" ? "text-primary" : "text-foreground"
                    }`}>
                      Payment Received
                    </span>
                    <p className="text-xs text-muted-foreground">Customer made payment</p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="e.g., Monthly groceries, Payment via UPI"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.customerId || !formData.amount}
              className={formData.type === "credit" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                formData.type === "credit" ? "Add Credit" : "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
