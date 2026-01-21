"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { GroupCard } from "@/components/groups/group-card"
import { CreateGroupDialog } from "@/components/groups/create-group-dialog"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
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
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")

        // Fetch groups where user is a member
        const { data: groupMembers } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id)

        const groupIds = groupMembers?.map(gm => gm.group_id) || []

        if (groupIds.length === 0) {
          setGroups([])
          setLoading(false)
          return
        }

        // Fetch groups data
        const { data: groupsData, error } = await supabase
          .from("groups")
          .select("*")
          .in("id", groupIds)
          .order("created_at", { ascending: false })

        if (error) throw error

        // Fetch members for each group
        const groupsWithMembers = await Promise.all(
          (groupsData || []).map(async (group) => {
            const { data: members } = await supabase
              .from("group_members")
              .select("name, user_id")
              .eq("group_id", group.id)

            // Calculate expenses for this group
            const { data: expenses } = await supabase
              .from("expenses")
              .select("amount, paid_by, created_at")
              .eq("group_id", group.id)
              .order("created_at", { ascending: false })
              .limit(1)

            const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
            const lastActivityDate = expenses?.[0]?.created_at || null

            return {
              ...group,
              members: members || [],
              totalExpenses,
              yourBalance: 0, // TODO: Calculate actual balance
              balanceType: "settled" as const,
              lastActivity: lastActivityDate,
            }
          })
        )

        setGroups(groupsWithMembers)
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
