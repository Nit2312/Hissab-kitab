"use client"

import React from "react"
import { useEffect, useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"

interface DashboardShellProps {
  children: React.ReactNode
  userType: string
  userName: string
  businessName: string | null
  userEmail: string
}

export function DashboardShell({
  children,
  userType,
  userName,
  businessName,
  userEmail,
}: DashboardShellProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>
      {mounted ? <DashboardSidebar userType={userType} /> : null}
      <div className="relative z-10 flex min-h-screen flex-1 flex-col lg:pl-64">
        {mounted ? (
          <DashboardHeader
            userName={userName}
            userType={userType}
            businessName={businessName}
            userEmail={userEmail}
          />
        ) : null}
        <main className="flex-1 px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
