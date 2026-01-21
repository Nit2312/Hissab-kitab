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
import { MoreVertical, Pencil, Trash2 } from "lucide-react"

interface ExpenseCardProps {
  expense: {
    id: string
    description: string
    amount: number
    paidBy: string
    date: string
    category: string
    group: string
    splitType: string
    participants?: string[]
    participantCount?: number
  }
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const formattedDate = new Date(expense.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })

  const participantCount = expense.participants?.length || expense.participantCount || 1
  const yourShare = expense.amount / participantCount
  const isPaidByYou = expense.paidBy === "You"

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
