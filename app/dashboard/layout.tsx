"use client"

import React from "react"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useRequireAuth()

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }
  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login?error=unauthorized"
    }
    return null
  }

  const userType = user.user_type || "personal"
  const userName = user.full_name || user.email?.split("@")[0] || "User"
  const businessName = user.business_name || null

  return (
    <DashboardShell
      userType={userType}
      userName={userName}
      businessName={businessName}
      userEmail={user.email || ""}
    >
      {children}
    </DashboardShell>
  )
}
