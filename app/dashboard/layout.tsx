import React from "react"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { getCurrentUser } from "@/lib/mongodb/server"

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
    <div className="flex min-h-screen bg-muted/30">
      <DashboardSidebar userType={userType} />
      <div className="flex flex-1 flex-col lg:pl-64">
        <DashboardHeader 
          userName={userName} 
          userType={userType}
          businessName={businessName}
          userEmail={user.email || ""}
        />
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
