import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Plane, Home, Briefcase, Heart } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useState, useEffect } from "react"

const typeIcons = {
  trip: Plane,
  home: Home,
  work: Briefcase,
  family: Heart,
  friends: Users,
}

const typeColors = {
  trip: "bg-primary/10 text-primary",
  home: "bg-accent/20 text-accent",
  work: "bg-muted text-muted-foreground",
  family: "bg-destructive/10 text-destructive",
  friends: "bg-primary/10 text-primary",
}

interface GroupCardProps {
  group: {
    id: string
    name: string
    type: string
    members: Array<{ name: string; user_id?: string }>
    totalExpenses: number
    yourBalance: number
    balanceType: "owed" | "owe" | "settled"
    lastActivity: string
  }
}

export function GroupCard({ group }: GroupCardProps) {
  const Icon = typeIcons[group.type as keyof typeof typeIcons] || Users
  const colorClass = typeColors[group.type as keyof typeof typeColors] || typeColors.friends
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formattedActivity = mounted && group.lastActivity
    ? formatDistanceToNow(new Date(group.lastActivity), { addSuffix: true })
    : group.lastActivity 
    ? "Recent activity"
    : "No activity"

  return (
    <Link href={`/dashboard/groups/${group.id}`}>
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{group.name}</h3>
              <p className="text-xs text-muted-foreground">{formattedActivity}</p>
            </div>
          </div>
          <Badge
            variant={
              group.balanceType === "settled"
                ? "secondary"
                : group.balanceType === "owed"
                ? "default"
                : "destructive"
            }
            className="text-xs"
          >
            {group.balanceType === "settled"
              ? "Settled"
              : group.balanceType === "owed"
              ? `+₹${group.yourBalance.toLocaleString("en-IN")}`
              : `-₹${group.yourBalance.toLocaleString("en-IN")}`}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-bold text-foreground">
              ₹{group.totalExpenses.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {group.members.slice(0, 4).map((member, i) => {
                const memberName = typeof member === 'string' ? member : member.name
                const initials = memberName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                return (
                  <Avatar key={i} className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )
              })}
              {group.members.length > 4 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs text-muted-foreground">
                  +{group.members.length - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {group.members.length} members
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
