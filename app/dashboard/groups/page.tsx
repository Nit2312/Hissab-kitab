"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Search } from "lucide-react"
import { GroupCard } from "@/components/groups/group-card"
import { CreateGroupDialog } from "@/components/groups/create-group-dialog"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { formatDistanceToNow } from "date-fns"

type Group = {
  id: string
  name: string
  type: string
  created_at: string
  members: Array<{ name: string; user_id?: string }>
  totalExpenses: number
  yourBalance: number
  balanceType: "owed" | "owe" | "settled"
  lastActivity: string | null
}

export default function GroupsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()

  const fetchGroups = async () => {
    setLoading(true)
    try {
      // Get current user
      const userResponse = await fetch("/api/auth/user", { credentials: "include" })
      if (!userResponse.ok) throw new Error("Not authenticated")
      const user = await userResponse.json()

      // Only allow personal users to access personal groups
      if (user.user_type === "business") {
        // Redirect business users to business khata page
        window.location.href = "/dashboard/khata"
        return
      }

      // Fetch groups and expenses in parallel
      const [groupsResponse, expensesResponse] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/expenses")
      ])
      
      if (!groupsResponse.ok) throw new Error("Failed to fetch groups")
      const groupsData = await groupsResponse.json()
      
      const allExpenses = expensesResponse.ok ? await expensesResponse.json() : []

      // Fetch members for all groups in parallel
      const membersPromises = groupsData.map((group: any) => 
        fetch(`/api/groups/members?group_id=${group.id}`)
          .then(res => res.ok ? res.json() : [])
      )
      
      const allMembers = await Promise.all(membersPromises)

      // Process groups with fetched data
      const groupsWithDetails = groupsData.map((group: any, index: number) => {
        const members = allMembers[index]
        const groupExpenses = allExpenses.filter((e: any) => e.group_id === group.id)

        const totalExpenses = groupExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)
        const lastActivityDate = groupExpenses.length > 0
          ? groupExpenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
          : null

        // Calculate user's balance in this group
        let yourBalance = 0
        let balanceType: "owed" | "owe" | "settled" = "settled"

        if (groupExpenses.length > 0) {
          // Calculate total paid by user
          const totalPaidByUser = groupExpenses
            .filter((e: any) => e.paid_by === user.id)
            .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

          // Calculate user's share of all expenses
          const totalUserShare = groupExpenses.reduce((sum: number, e: any) => {
            // For equal splits, divide by number of members
            const memberCount = members.length || 1
            return sum + (Number(e.amount) / memberCount)
          }, 0)

          yourBalance = totalPaidByUser - totalUserShare
          
          // Determine balance type
          if (Math.abs(yourBalance) < 0.01) {
            balanceType = "settled"
          } else if (yourBalance > 0) {
            balanceType = "owed" // User is owed money
          } else {
            balanceType = "owe" // User owes money
            yourBalance = Math.abs(yourBalance)
          }
        }

        return {
          ...group,
          members,
          totalExpenses,
          yourBalance,
          balanceType,
          lastActivity: lastActivityDate || null
        }
      })

      setGroups(groupsWithDetails)
    } catch (err) {
      console.error("Error fetching groups:", err)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [isCreateOpen])

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Suspense fallback={null}>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Groups</h2>
            <p className="text-muted-foreground">Manage your expense groups</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Group
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                      <div className="h-5 w-20 bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No groups found</p>
            <Button variant="link" onClick={() => setIsCreateOpen(true)}>
              Create your first group
            </Button>
          </div>
        )}

        <CreateGroupDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreated={() => {
            fetchGroups()
          }}
        />
      </div>
    </Suspense>
  )
}
