import React from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/login?error=unauthorized")
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
