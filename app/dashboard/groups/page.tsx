"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  members?: Array<{ name: string; user_id?: string }>
  totalExpenses?: number
  yourBalance?: number
  balanceType?: "owed" | "owe" | "settled"
  lastActivity?: string
}

export default function GroupsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true)
      try {
        // Fetch groups
        const groupsResponse = await fetch("/api/groups")
        if (!groupsResponse.ok) throw new Error("Failed to fetch groups")
        const groupsData = await groupsResponse.json()

        // Fetch members and expenses for each group
        const groupsWithDetails = await Promise.all(
          groupsData.map(async (group: any) => {
            // Fetch members
            const membersResponse = await fetch(`/api/groups/members?group_id=${group.id}`)
            const members = membersResponse.ok ? await membersResponse.json() : []

            // Fetch recent expenses for this group
            const expensesResponse = await fetch("/api/expenses")
            const allExpenses = expensesResponse.ok ? await expensesResponse.json() : []
            const groupExpenses = allExpenses.filter((e: any) => e.group_id === group.id)

            const totalExpenses = groupExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)
            const lastActivityDate = groupExpenses.length > 0 
              ? groupExpenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
              : null

            return {
              ...group,
              members: members.map((m: any) => ({ name: m.name, user_id: m.user_id })),
              totalExpenses,
              yourBalance: 0, // TODO: Calculate actual balance
              balanceType: "settled" as const,
              lastActivity: lastActivityDate,
            }
          })
        )

        setGroups(groupsWithDetails)
      } catch (err) {
        console.error("Error fetching groups:", err)
        setGroups([])
      } finally {
        setLoading(false)
      }
    }

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
          <div className="py-8 text-center text-muted-foreground">Loading groups...</div>
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

        <CreateGroupDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    </Suspense>
  )
}
