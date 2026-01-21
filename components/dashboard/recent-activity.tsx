import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Receipt, CreditCard, Users, Bell } from "lucide-react"
import Link from "next/link"

const activities = [
  {
    id: 1,
    type: "expense",
    icon: Receipt,
    title: "Dinner at Barbeque Nation",
    description: "Split equally with Goa Trip group",
    amount: "₹2,400",
    time: "2 hours ago",
    badge: "Food"
  },
  {
    id: 2,
    type: "settlement",
    icon: CreditCard,
    title: "Received from Priya Sharma",
    description: "Via UPI",
    amount: "+₹1,200",
    time: "Yesterday",
    badge: "Settled"
  },
  {
    id: 3,
    type: "group",
    icon: Users,
    title: "New group created",
    description: "Office Lunch added 4 members",
    amount: null,
    time: "2 days ago",
    badge: "Group"
  },
  {
    id: 4,
    type: "reminder",
    icon: Bell,
    title: "Reminder sent to Amit Singh",
    description: "For pending amount of ₹800",
    amount: null,
    time: "3 days ago",
    badge: "Reminder"
  },
  {
    id: 5,
    type: "expense",
    icon: Receipt,
    title: "Uber to Airport",
    description: "Paid by you",
    amount: "₹650",
    time: "4 days ago",
    badge: "Travel"
  }
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest transactions and updates</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/expenses" className="gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <div className={`rounded-full p-2 ${
                activity.type === "expense" 
                  ? "bg-primary/10 text-primary"
                  : activity.type === "settlement"
                  ? "bg-accent/20 text-accent"
                  : activity.type === "group"
                  ? "bg-muted text-muted-foreground"
                  : "bg-destructive/10 text-destructive"
              }`}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  {activity.amount && (
                    <span className={`text-sm font-semibold ${
                      activity.amount.startsWith("+") ? "text-primary" : "text-foreground"
                    }`}>
                      {activity.amount}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <Badge variant="secondary" className="text-xs">
                    {activity.badge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
