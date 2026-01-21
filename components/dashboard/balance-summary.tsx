import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

const balances = [
  { name: "Priya Sharma", amount: 1200, type: "owes_you", initials: "PS" },
  { name: "Rahul Verma", amount: 2500, type: "owes_you", initials: "RV" },
  { name: "Amit Singh", amount: 800, type: "you_owe", initials: "AS" },
  { name: "Sneha Patel", amount: 1650, type: "you_owe", initials: "SP" },
  { name: "Vikram Mehta", amount: 2080, type: "owes_you", initials: "VM" },
]

export function BalanceSummary() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Balance Summary</CardTitle>
          <CardDescription>Who owes whom</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/settlements" className="gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {balances.map((balance) => (
            <div key={balance.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={`text-xs ${
                    balance.type === "owes_you" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {balance.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{balance.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {balance.type === "owes_you" ? "owes you" : "you owe"}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${
                balance.type === "owes_you" ? "text-primary" : "text-destructive"
              }`}>
                {balance.type === "owes_you" ? "+" : "-"}₹{balance.amount.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
