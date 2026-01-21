"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  Menu,
  LogOut,
  Settings,
  User,
  BookOpen,
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  Store,
  UserCircle,
  TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

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

interface DashboardHeaderProps {
  userName: string
  userType: string
  businessName: string | null
  userEmail: string
}

export function DashboardHeader({ userName, userType, businessName, userEmail }: DashboardHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isBusinessUser = userType === "business"
  const navItems = isBusinessUser ? businessNavItems : personalNavItems

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const allNavItems = [...navItems, ...bottomNavItems]
  const currentPageTitle = allNavItems.find((item) => item.href === pathname)?.label || "Dashboard"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      {/* Mobile Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center gap-2 border-b border-border px-6">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
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
                isBusinessUser 
                  ? "bg-accent/20 text-accent-foreground" 
                  : "bg-primary/10 text-primary"
              )}>
                {isBusinessUser ? (
                  <>
                    <Store className="h-3 w-3" />
                    {businessName || "Business Mode"}
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" />
                    Personal Mode
                  </>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 px-3 py-4">
              <div className="space-y-6">
                <div>
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {isBusinessUser ? "Khata Management" : "Expense Tracking"}
                  </p>
                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
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
                  </nav>
                </div>

                {/* Other mode as secondary */}
                <div>
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {isBusinessUser ? "Personal Features" : "Business Features"}
                  </p>
                  <nav className="space-y-1">
                    {(isBusinessUser ? personalNavItems.slice(0, 3) : businessNavItems.slice(0, 2)).map((item) => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 text-muted-foreground"
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    ))}
                  </nav>
                </div>

                <div>
                  <nav className="space-y-1">
                    {bottomNavItems.map((item) => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
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
                  </nav>
                </div>
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Page Title - Desktop */}
      <div className="hidden lg:block">
        <h1 className="text-lg font-semibold text-foreground">{currentPageTitle}</h1>
      </div>

      {/* Mobile Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <BookOpen className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground">HisaabKitab</span>
      </Link>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {isBusinessUser ? `${businessName || "Business"}` : "Personal Account"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
