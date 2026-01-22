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
    <div className="flex min-h-screen bg-muted/30">
      {mounted ? <DashboardSidebar userType={userType} /> : null}
      <div className="flex flex-1 flex-col lg:pl-64">
        {mounted ? (
          <DashboardHeader
            userName={userName}
            userType={userType}
            businessName={businessName}
            userEmail={userEmail}
          />
        ) : null}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
