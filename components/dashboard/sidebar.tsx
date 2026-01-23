"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BookOpen,
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  Bell,
  Settings,
  Store,
  UserCircle,
  TrendingUp
} from "lucide-react"

const personalNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/groups", icon: Users, label: "Groups" },
  { href: "/dashboard/expenses", icon: Receipt, label: "Expenses" },
  { href: "/dashboard/settlements", icon: CreditCard, label: "Settlements" },
  { href: "/dashboard/reminders", icon: Bell, label: "Reminders" },
]

const businessNavItems = [
  { href: "/dashboard/khata", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/customers", icon: UserCircle, label: "Customers" },
  { href: "/dashboard/transactions", icon: Receipt, label: "Transactions" },
  { href: "/dashboard/reports", icon: TrendingUp, label: "Reports" },
]

const bottomNavItems = [
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
]

interface DashboardSidebarProps {
  userType: string
}

export function DashboardSidebar({ userType }: DashboardSidebarProps) {
  const pathname = usePathname()
  const isBusinessUser = userType === "business"
  
  // Debug: Log the user type
  console.log('[Sidebar Debug] userType:', userType, 'isBusinessUser:', isBusinessUser)
  
  // Extra safety check: Always use personal navigation if user_type is not explicitly "business"
  const navItems = (userType && userType === "business") ? businessNavItems : personalNavItems

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-card lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-border px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">HisaabKitab</span>
            </Link>
          </div>

          {/* User Type Badge */}
          <div className="px-6 py-3 border-b border-border">
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              (userType && userType === "business") 
                ? "bg-accent/20 text-accent-foreground" 
                : "bg-primary/10 text-primary"
            )}>
              {(userType && userType === "business") ? (
                <>
                  <Store className="h-3 w-3" />
                  Business Mode
                </>
              ) : (
                <>
                  <Users className="h-3 w-3" />
                  Personal Mode
                </>
              )}
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <div className="space-y-6">
              <div>
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {(userType && userType === "business") ? "Khata Management" : "Expense Tracking"}
                </p>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== "/dashboard" && item.href !== "/dashboard/khata" && pathname.startsWith(item.href))
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3",
                            isActive && "bg-primary/10 text-primary"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Bottom Navigation */}
              <div className="border-t border-border p-3">
                {bottomNavItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        pathname === item.href && "bg-primary/10 text-primary"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card lg:hidden">
        <div className="flex items-center justify-around py-2">
          {[...navItems.slice(0, 4), bottomNavItems[0]].map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
