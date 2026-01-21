import React from "react"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/signup")
  }

  const userType = profile?.user_type || "personal"
  const userName = profile?.full_name || user.email?.split("@")[0] || "User"
  const businessName = profile?.business_name || null

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
