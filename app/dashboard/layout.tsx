"use client"

import React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { PageLoading } from "@/components/ui/loading-skeleton"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useRequireAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?error=unauthorized")
    }
  }, [loading, router, user])

  if (loading) {
    return <PageLoading />
  }

  if (!user) {
    return <PageLoading />
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
