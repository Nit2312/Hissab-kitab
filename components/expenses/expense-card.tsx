"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExpenseCardProps {
  expense: {
    id: string
    description: string
    amount: number
    paidBy: string
    paidById?: string
    date: string
    category: string
    group: string
    splitType: string
    participants?: string[]
    participantCount?: number
  }
  currentUserId?: string
  onEdit?: (expense: ExpenseCardProps['expense']) => void
  onDelete?: (expenseId: string) => void
}

export function ExpenseCard({ expense, currentUserId, onEdit, onDelete }: ExpenseCardProps) {
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const formattedDate = new Date(expense.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })

  const participantCount = expense.participants?.length || expense.participantCount || 1
  const yourShare = expense.amount / participantCount
  const isPaidByYou = expense.paidBy === "You" || (currentUserId && expense.paidById === currentUserId)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Delete failed:', data)
        throw new Error(data.error || "Failed to delete expense")
      }

      toast({
        title: "Expense deleted",
        description: "The expense has been successfully deleted.",
      })

      if (onDelete) {
        onDelete(expense.id)
      }
    } catch (err: any) {
      console.error("Error deleting expense:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to delete expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {expense.paidBy.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-medium text-foreground">{expense.description}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {expense.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {expense.group}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formattedDate}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {expense.paidBy} paid - Split {expense.splitType}ly between {participantCount} {participantCount === 1 ? 'person' : 'people'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">
                ₹{expense.amount.toLocaleString("en-IN")}
              </p>
              <p className={`text-sm ${isPaidByYou ? "text-primary" : "text-destructive"}`}>
                {isPaidByYou
                  ? `You lent ₹${(expense.amount - yourShare).toLocaleString("en-IN")}`
                  : `You owe ₹${yourShare.toLocaleString("en-IN")}`
                }
              </p>
            </div>
            {isPaidByYou && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(expense)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense
              "{expense.description}" and all associated splits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
