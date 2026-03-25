"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Plus, 
  Users as UsersIcon, 
  Receipt, 
  TrendingUp,
  TrendingDown,
  MoreVertical,
  UserPlus,
  Settings as SettingsIcon,
  Pencil,
  Trash2,
  LogOut
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { AddMembersDialog } from "@/components/groups/add-members-dialog"
import { EditMemberDialog } from "@/components/groups/edit-member-dialog"
import { useToast } from "@/hooks/use-toast"

type Group = {
  id: string
  name: string
  type: string
  description: string | null
  created_by: string
  created_at: string
}

type Member = {
  id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  is_registered: boolean
}

type Expense = {
  id: string
  description: string
  amount: number
  category: string
  paid_by: string
  date: string
  created_at: string
  paid_by_name?: string
}

type GroupBalancesResponse = {
  group_id: string
  total_expenses: number
  members: Array<{
    member: Member
    paid: number
    share: number
    owed: number
    credit: number
    net: number
  }>
  transfers: Array<{
    from_member_id: string
    to_member_id: string
    amount: number
    from_name: string
    to_name: string
  }>
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const groupId = params.id as string

  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false)
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false)
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [yourShare, setYourShare] = useState(0)
  const [youPaid, setYouPaid] = useState(0)
  const [balancesData, setBalancesData] = useState<GroupBalancesResponse | null>(null)

  useEffect(() => {
    void fetchGroupDetails()
  }, [groupId])

  const fetchGroupDetails = async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options
    if (!silent) {
      setLoading(true)
    }
    try {
      // Get current user and fetch all data in parallel
      const [userResponse, groupsResponse, membersResponse, expensesResponse] = await Promise.all([
        fetch("/api/auth/user"),
        fetch("/api/groups"),
        fetch(`/api/groups/members?group_id=${groupId}`, {
          cache: 'no-store',
          credentials: "include",
        }),
        fetch("/api/expenses", {
          cache: 'no-store',
          credentials: "include",
        })
      ])

      if (!userResponse.ok) {
        router.push("/login")
        return
      }
      const userData = await userResponse.json()
      setCurrentUserId(userData.id)

      if (!groupsResponse.ok) throw new Error("Failed to fetch groups")
      const groupsData = await groupsResponse.json()
      const groupData = groupsData.find((g: any) => g.id === groupId)
      
      if (!groupData) {
        throw new Error("Group not found")
      }
      setGroup(groupData)

      if (!membersResponse.ok) throw new Error("Failed to fetch members")
      const membersData = await membersResponse.json()
      setMembers(membersData)

      if (!expensesResponse.ok) throw new Error("Failed to fetch expenses")
      const allExpenses = await expensesResponse.json()
      const expensesData = allExpenses
        .filter((e: any) => e.group_id === groupId)
        // Sort by date (newest first), then by created_at (newest first)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          if (dateB !== dateA) {
            return dateB - dateA // Newer dates first
          }
          // If dates are equal, sort by created_at
          const createdA = new Date(a.created_at || 0).getTime()
          const createdB = new Date(b.created_at || 0).getTime()
          return createdB - createdA // Newer created_at first
        })

      // Get member names for expenses
      const expensesWithNames = expensesData.map((expense: any) => {
        // Try to find member by user_id first
        let member = membersData.find((m: any) => m.user_id === expense.paid_by)
        // If not found, try to get from expense's paid_by_name (from API)
        return {
          ...expense,
          paid_by_name: member?.name || expense.paid_by_name || "Unknown"
        }
      })

      setExpenses(expensesWithNames)

      // Fetch accurate balances (who owes whom) for this group
      const balancesResponse = await fetch(`/api/groups/balances?group_id=${groupId}`, {
        cache: 'no-store',
        credentials: "include",
      })
      if (!balancesResponse.ok) throw new Error("Failed to fetch balances")
      const balancesJson = (await balancesResponse.json()) as GroupBalancesResponse
      setBalancesData(balancesJson)

      // Summary numbers from balances
      setTotalExpenses(Number(balancesJson.total_expenses || 0))

      const currentMemberBalance = balancesJson.members.find(
        (m) => m.member.user_id === userData.id
      )
      setYouPaid(Number(currentMemberBalance?.paid || 0))
      setYourShare(Number(currentMemberBalance?.share || 0))

    } catch (err: any) {
      console.error("Error fetching group details:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to load group details",
        variant: "destructive",
      })
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const handleDeleteGroup = async () => {
    try {
      console.log(`Attempting to delete group: ${groupId}`)
      
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        credentials: "include"
      })

      console.log('Delete response status:', response.status)

      if (!response.ok) {
        const data = await response.json()
        console.error('Delete failed:', data)
        throw new Error(data.error || "Failed to delete group")
      }

      const result = await response.json()
      console.log('Delete result:', result)

      toast({
        title: "Group deleted",
        description: result.message || "The group has been successfully deleted.",
      })
      
      // Redirect to groups page
      router.push("/dashboard/groups")
    } catch (err: any) {
      console.error("Error deleting group:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to delete group",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading group details...</div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Group not found</div>
          <Button className="mt-4" onClick={() => router.push("/dashboard/groups")}>
            Back to Groups
          </Button>
        </div>
      </div>
    )
  }

  const balance = youPaid - yourShare
  const isCreator = group.created_by === currentUserId

  const handleEditMember = (member: Member) => {
    setSelectedMember(member)
    setIsEditMemberOpen(true)
  }

  const handleDeleteMember = (member: Member) => {
    setMemberToDelete(member)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return

    try {
      const response = await fetch(`/api/groups/members/${memberToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete member")
      }

      toast({
        title: "Member removed",
        description: `${memberToDelete.name} has been removed from the group.`,
      })

      setIsDeleteDialogOpen(false)
      setMemberToDelete(null)
      
      // Immediately remove from local state for instant UI update
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id))
      
      // Refresh balances/details in the background to ensure consistency
      void fetchGroupDetails({ silent: true })
    } catch (err: any) {
      console.error("Error deleting member:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to remove member. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLeaveGroup = async () => {
    const currentMember = members.find(m => m.user_id === currentUserId)
    if (!currentMember) return

    try {
      // Check balance first
      const balanceResponse = await fetch(`/api/groups/members/${currentMember.id}`, {
        credentials: "include",
      })
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        if (Math.abs(balanceData.balance) > 0.01) {
          toast({
            title: "Cannot leave group",
            description: `You have an outstanding balance of ₹${Math.abs(balanceData.balance).toFixed(2)}. Please settle all expenses before leaving.`,
            variant: "destructive",
          })
          setIsLeaveDialogOpen(false)
          return
        }
      }

      const response = await fetch(`/api/groups/members/${currentMember.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to leave group")
      }

      toast({
        title: "Left group",
        description: "You have successfully left the group.",
      })

      setIsLeaveDialogOpen(false)
      router.push("/dashboard/groups")
    } catch (err: any) {
      console.error("Error leaving group:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to leave group. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExpenseAdded = (expense?: any) => {
    if (!expense) return

    const normalized = {
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount || 0),
      category: expense.category || "Others",
      paid_by: expense.paid_by || currentUserId,
      date: expense.date || new Date().toISOString().split("T")[0],
      created_at: expense.created_at || new Date().toISOString(),
      paid_by_name: expense.paid_by_name || "You",
    }

    setExpenses((prev) => [normalized, ...prev.filter((item) => item.id !== normalized.id)])
    setTotalExpenses((prev) => prev + normalized.amount)
    setYouPaid((prev) => prev + (normalized.paid_by === currentUserId ? normalized.amount : 0))
    void fetchGroupDetails({ silent: true })
  }

  const handleExpenseUpdated = (expense?: any) => {
    if (!expense) return

    const normalized = {
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount || 0),
      category: expense.category || "Others",
      paid_by: expense.paid_by || currentUserId,
      date: expense.date || new Date().toISOString().split("T")[0],
      created_at: expense.created_at || new Date().toISOString(),
      paid_by_name: expense.paid_by_name || "You",
    }

    setExpenses((prev) => [normalized, ...prev.filter((item) => item.id !== normalized.id)])
    void fetchGroupDetails({ silent: true })
  }

  const handleMembersAdded = (newMembers?: any[]) => {
    if (!newMembers || newMembers.length === 0) return

    const normalizedMembers = newMembers.map((member) => ({
      id: member.id,
      user_id: member.user_id || null,
      name: member.name,
      email: member.email || null,
      phone: member.phone || null,
      is_registered: !!member.user_id,
    }))

    setMembers((prev) => [...normalizedMembers, ...prev.filter((m) => !normalizedMembers.some((next) => next.id === m.id))])
    void fetchGroupDetails({ silent: true })
  }

  const handleMemberUpdated = (updatedMember?: any) => {
    if (!updatedMember) return

    setMembers((prev) =>
      prev.map((member) =>
        member.id === updatedMember.id
          ? {
              ...member,
              name: updatedMember.name,
              email: updatedMember.email,
              phone: updatedMember.phone,
              user_id: updatedMember.user_id,
              is_registered: updatedMember.is_registered,
            }
          : member
      )
    )
    void fetchGroupDetails({ silent: true })
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/groups")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{group.type} • {members.length} members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddExpenseOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
          {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsAddMembersOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Members
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Group Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteGroupDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              ) : (
                `₹${totalExpenses.toLocaleString("en-IN")}`
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? (
                <div className="h-4 w-16 bg-muted rounded animate-pulse mt-1"></div>
              ) : (
                `${expenses.length} expenses`
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              You Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              ) : (
                `₹${youPaid.toLocaleString("en-IN")}`
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? (
                <div className="h-4 w-16 bg-muted rounded animate-pulse mt-1"></div>
              ) : (
                `${expenses.filter(e => e.paid_by === currentUserId).length} expenses`
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Share
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              ) : (
                `₹${yourShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
              )}
            </div>
            <div className="text-xs text-muted-foreground">Equal split</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              ) : (
                <>
                  {balance > 0 ? (
                    <TrendingUp className="h-4 w-4 text-primary" />
                  ) : balance < 0 ? (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  ) : null}
                  <div className={`text-2xl font-bold ${
                    balance > 0 ? "text-primary" : balance < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {balance > 0 ? "+" : ""}₹{Math.abs(balance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? (
                <div className="h-4 w-20 bg-muted rounded animate-pulse mt-1"></div>
              ) : (
                balance > 0 ? "You are owed" : balance < 0 ? "You owe" : "Settled up"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {expenses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No expenses yet</p>
                <Button className="mt-4" onClick={() => setIsAddExpenseOpen(true)}>
                  Add First Expense
                </Button>
              </CardContent>
            </Card>
          ) : (
            expenses.map((expense) => {
              const isPaidByYou = expense.paid_by === currentUserId
              return (
                <Card key={expense.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{expense.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{expense.category}</span>
                          <span>•</span>
                          <span>{expense.paid_by_name} paid</span>
                          <span>•</span>
                          <span>{new Date(expense.date).toLocaleDateString("en-IN")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">₹{Number(expense.amount).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{(Number(expense.amount) / members.length).toLocaleString("en-IN", { maximumFractionDigits: 0 })} per person
                        </p>
                      </div>
                      {isPaidByYou && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedExpense(expense)
                              setIsEditExpenseOpen(true)
                            }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to delete "${expense.description}"? This action cannot be undone.`)) {
                                  return
                                }
                                try {
                                  const response = await fetch(`/api/expenses/${expense.id}`, {
                                    method: "DELETE",
                                    credentials: "include",
                                  })
                                  if (!response.ok) {
                                    const data = await response.json()
                                    throw new Error(data.error || "Failed to delete expense")
                                  }
                                  toast({
                                    title: "Expense deleted",
                                    description: "The expense has been successfully deleted.",
                                  })
                                  setExpenses(prev => prev.filter(item => item.id !== expense.id))
                                  void fetchGroupDetails({ silent: true })
                                } catch (err: any) {
                                  console.error("Error deleting expense:", err)
                                  toast({
                                    title: "Error",
                                    description: err.message || "Failed to delete expense. Please try again.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Group Members</CardTitle>
                  <CardDescription>{members.length} members in this group</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAddMembersOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add members
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => {
                const isCurrentUser = member.user_id === currentUserId
                const isMemberCreator = member.user_id === group.created_by
                const canEdit = isCreator && !isMemberCreator
                const canDelete = isCreator && !isMemberCreator
                const canLeave = isCurrentUser && !isMemberCreator

                return (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        {member.email && member.is_registered && (
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        )}
                        {!member.is_registered && member.phone && (
                          <p className="text-xs text-muted-foreground">{member.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.is_registered ? (
                        <Badge variant="secondary">Member</Badge>
                      ) : (
                        <Badge variant="outline">Guest</Badge>
                      )}
                      {isMemberCreator && (
                        <Badge variant="default">Creator</Badge>
                      )}
                      {(canEdit || canDelete || canLeave) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleEditMember(member)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteMember(member)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            )}
                            {canLeave && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setIsLeaveDialogOpen(true)}
                              >
                                <LogOut className="mr-2 h-4 w-4" />
                                Leave Group
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Balances</CardTitle>
              <CardDescription>Who you owe and who owes you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!balancesData ? (
                <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
                  <p className="text-sm text-muted-foreground">Unable to calculate balances</p>
                </div>
              ) : (() => {
                const transfers = balancesData.transfers || []

                // Compute net per person for current user
                const netPerPerson = new Map<string, number>()
                transfers.forEach((t) => {
                  const fromMember = balancesData.members.find((m) => m.member.id === t.from_member_id)
                  const toMember = balancesData.members.find((m) => m.member.id === t.to_member_id)
                  if (!fromMember || !toMember) return

                  if (fromMember.member.user_id === currentUserId) {
                    netPerPerson.set(t.to_member_id, (netPerPerson.get(t.to_member_id) || 0) + Number(t.amount))
                  }
                  if (toMember.member.user_id === currentUserId) {
                    netPerPerson.set(t.from_member_id, (netPerPerson.get(t.from_member_id) || 0) - Number(t.amount))
                  }
                })

                const netEntries = Array.from(netPerPerson.entries())
                  .map(([memberId, net]) => {
                    const member = balancesData.members.find((m) => m.member.id === memberId)
                    return {
                      member: member?.member,
                      net,
                    }
                  })
                  .filter((e) => e.member && Math.abs(e.net) > 0.01)
                  .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))

                const totalYouPay = netEntries
                  .filter((e) => e.net > 0)
                  .reduce((sum, e) => sum + e.net, 0)
                const totalYouReceive = Math.abs(
                  netEntries
                    .filter((e) => e.net < 0)
                    .reduce((sum, e) => sum + e.net, 0)
                )

                return (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">Total to give</p>
                          <p className="text-lg font-bold text-destructive">
                            ₹{totalYouPay.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">Total to get</p>
                          <p className="text-lg font-bold text-primary">
                            ₹{totalYouReceive.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {netEntries.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Your balances</p>
                        <div className="space-y-2">
                          {netEntries.map(({ member, net }) => {
                            const isPay = net > 0
                            const amount = Math.abs(net)
                            const label = isPay ? `You pay ${member?.name}` : `${member?.name} pays you`
                            return (
                              <div
                                key={member?.id}
                                className={`flex items-center justify-between rounded-lg border p-3 ${
                                  isPay
                                    ? 'border-destructive/20 bg-destructive/5'
                                    : 'border-primary/20 bg-primary/5'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarFallback
                                      className={
                                        isPay ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                                      }
                                    >
                                      {member?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-foreground">{member?.name}</p>
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-lg font-bold ${isPay ? 'text-destructive' : 'text-primary'}`}>
                                    ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
                        <p className="text-lg font-medium text-foreground">All settled up!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          You don't owe anyone and no one owes you.
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

        <AddExpenseDialog 
          open={isAddExpenseOpen} 
          onOpenChange={setIsAddExpenseOpen}
          defaultGroupId={groupId}
          onExpenseUpdated={handleExpenseAdded}
        />
        <AddExpenseDialog 
          open={isEditExpenseOpen} 
          onOpenChange={setIsEditExpenseOpen}
          defaultGroupId={groupId}
          expense={selectedExpense ? {
            id: selectedExpense.id,
            description: selectedExpense.description,
            amount: selectedExpense.amount,
            category: selectedExpense.category,
            date: selectedExpense.date
          } : undefined}
          onExpenseUpdated={(expense) => {
            setIsEditExpenseOpen(false)
            setSelectedExpense(null)
            handleExpenseUpdated(expense)
          }}
        />
        <AddMembersDialog 
          open={isAddMembersOpen} 
          onOpenChange={setIsAddMembersOpen}
          groupId={groupId}
          onMembersAdded={handleMembersAdded}
        />
        {selectedMember && (
          <EditMemberDialog
            open={isEditMemberOpen}
            onOpenChange={setIsEditMemberOpen}
            member={selectedMember}
            onMemberUpdated={(updatedMember) => {
              setIsEditMemberOpen(false)
              setSelectedMember(null)
              handleMemberUpdated(updatedMember)
            }}
          />
        )}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {memberToDelete?.name} from this group? 
                This action cannot be undone and all their expense splits will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeleteGroupDialogOpen} onOpenChange={setIsDeleteGroupDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Group?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this group? This action cannot be undone and will permanently delete:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>All group expenses and their splits</li>
                  <li>All settlement records</li>
                  <li>All reminder history</li>
                  <li>All member data</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteGroup}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Group
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Group?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave this group? You can only leave if you have no outstanding balance.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeaveGroup}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Leave Group
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }
