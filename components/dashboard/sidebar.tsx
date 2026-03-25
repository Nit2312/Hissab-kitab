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
  const navItems = isBusinessUser ? businessNavItems : personalNavItems

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border/60 bg-card/90 backdrop-blur xl:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-border/60 px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="leading-tight">
                <span className="block text-sm font-semibold tracking-tight text-foreground">HisaabKitab</span>
                <span className="block text-xs text-muted-foreground">Expense and khata manager</span>
              </div>
            </Link>
          </div>

          <div className="border-b border-border/60 px-6 py-4">
            <div className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
              isBusinessUser
                ? "bg-accent/15 text-accent-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {isBusinessUser ? (
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
                  {isBusinessUser ? "Khata Management" : "Expense Tracking"}
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
                            "h-11 w-full justify-start gap-3 rounded-xl px-3 font-medium",
                            isActive
                              ? "bg-primary/10 text-primary shadow-sm"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
              <div className="border-t border-border/60 p-3">
                {bottomNavItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      className={cn(
                        "h-11 w-full justify-start gap-3 rounded-xl px-3 font-medium",
                        pathname === item.href
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 items-center gap-1 px-2 py-2">
          {[...navItems.slice(0, 4), bottomNavItems[0]].map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
