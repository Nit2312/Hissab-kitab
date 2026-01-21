import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Phone } from "lucide-react"

interface KhataCustomerCardProps {
  customer: {
    id: string
    name: string
    phone: string
    balance: number
    type: "credit" | "settled"
    lastTransaction: string
    totalCredit: number
    totalPaid: number
  }
}

export function KhataCustomerCard({ customer }: KhataCustomerCardProps) {
  const initials = customer.name.split(" ").map(n => n[0]).join("")
  const formattedDate = new Date(customer.lastTransaction).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  })

  return (
    <Link href={`/dashboard/customers/${customer.id}`}>
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className={`${
                customer.type === "credit"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">{customer.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </div>
            </div>
          </div>
          <Badge
            variant={customer.type === "credit" ? "destructive" : "secondary"}
            className="text-xs"
          >
            {customer.type === "credit"
              ? `₹${customer.balance.toLocaleString("en-IN")} due`
              : "Settled"
            }
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Credit</p>
              <p className="font-medium text-foreground">
                ₹{customer.totalCredit.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Paid</p>
              <p className="font-medium text-primary">
                ₹{customer.totalPaid.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Last transaction: {formattedDate}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
