"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const admin = localStorage.getItem("isAdmin")
      if (admin === "true") {
        setIsAdmin(true)
      } else {
        router.replace("/admin")
      }
    }
  }, [router])

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-muted p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Control Panel</h1>
        <p className="mb-8 text-muted-foreground">You have access to all data and controls.</p>
        {/* TODO: Add tabs or sections for viewing all users, customers, expenses, groups, reminders, settlements, etc. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">All Users</h2>
            <p className="text-muted-foreground">(Coming soon)</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">All Customers</h2>
            <p className="text-muted-foreground">(Coming soon)</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">All Expenses</h2>
            <p className="text-muted-foreground">(Coming soon)</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">All Groups</h2>
            <p className="text-muted-foreground">(Coming soon)</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">All Reminders</h2>
            <p className="text-muted-foreground">(Coming soon)</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">All Settlements</h2>
            <p className="text-muted-foreground">(Coming soon)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
