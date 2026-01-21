"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Users, CreditCard, Bell } from "lucide-react"

const actions = [
  { href: "/dashboard/expenses?add=true", icon: Plus, label: "Add Expense", variant: "default" as const },
  { href: "/dashboard/groups?add=true", icon: Users, label: "New Group", variant: "outline" as const },
  { href: "/dashboard/settlements?add=true", icon: CreditCard, label: "Settle Up", variant: "outline" as const },
  { href: "/dashboard/reminders?add=true", icon: Bell, label: "Send Reminder", variant: "outline" as const },
]

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button key={action.label} variant={action.variant} asChild className="gap-2">
          <Link href={action.href}>
            <action.icon className="h-4 w-4" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  )
}
