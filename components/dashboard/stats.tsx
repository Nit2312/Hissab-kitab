import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownLeft, ArrowUpRight, IndianRupee, TrendingUp } from "lucide-react"

const stats = [
  {
    title: "You Owe",
    value: "2,450",
    change: "+12%",
    changeType: "negative",
    icon: ArrowUpRight,
    description: "To 3 people"
  },
  {
    title: "You Are Owed",
    value: "5,780",
    change: "+8%",
    changeType: "positive",
    icon: ArrowDownLeft,
    description: "From 5 people"
  },
  {
    title: "This Month",
    value: "12,340",
    change: "-5%",
    changeType: "neutral",
    icon: IndianRupee,
    description: "Total expenses"
  },
  {
    title: "Net Balance",
    value: "+3,330",
    change: "+15%",
    changeType: "positive",
    icon: TrendingUp,
    description: "Overall"
  }
]

export function DashboardStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`rounded-full p-2 ${
              stat.changeType === "positive" 
                ? "bg-primary/10 text-primary" 
                : stat.changeType === "negative"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}>
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {stat.value.startsWith("+") || stat.value.startsWith("-") ? "" : "₹"}
                {stat.value}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
