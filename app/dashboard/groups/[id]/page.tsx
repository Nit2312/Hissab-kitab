"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
  Settings as SettingsIcon
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { AddMembersDialog } from "@/components/groups/add-members-dialog"
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
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [yourShare, setYourShare] = useState(0)
  const [youPaid, setYouPaid] = useState(0)

  useEffect(() => {
    fetchGroupDetails()
  }, [groupId])

  const fetchGroupDetails = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/login")
        return
      }

      setCurrentUserId(user.id)

      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single()

      if (groupError) throw groupError
      setGroup(groupData)

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)

      if (membersError) throw membersError
      setMembers(membersData || [])

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("group_id", groupId)
        .order("date", { ascending: false })

      if (expensesError) throw expensesError

      // Get member names for expenses
      const expensesWithNames = await Promise.all(
        (expensesData || []).map(async (expense) => {
          const member = membersData?.find(m => m.user_id === expense.paid_by)
          return {
            ...expense,
            paid_by_name: member?.name || "Unknown"
          }
        })
      )

      setExpenses(expensesWithNames)

      // Calculate totals
      const total = expensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
      setTotalExpenses(total)

      const paid = expensesData?.filter(e => e.paid_by === user.id)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0
      setYouPaid(paid)

      // Calculate your share (equal split for now)
      const memberCount = membersData?.length || 1
      setYourShare(total / memberCount)

    } catch (err) {
      console.error("Error fetching group details:", err)
      toast({
        title: "Error",
        description: "Failed to load group details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId)

      if (error) throw error

      toast({
        title: "Group deleted",
        description: "The group has been successfully deleted.",
      })
      router.push("/dashboard/groups")
    } catch (err) {
      console.error("Error deleting group:", err)
      toast({
        title: "Error",
        description: "Failed to delete group",
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
                <DropdownMenuItem className="text-destructive" onClick={handleDeleteGroup}>
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
            <p className="text-2xl font-bold">₹{totalExpenses.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">{expenses.length} expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              You Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">₹{youPaid.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">
              {expenses.filter(e => e.paid_by === currentUserId).length} expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Share
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{yourShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground">Equal split</p>
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
              {balance > 0 ? (
                <TrendingUp className="h-4 w-4 text-primary" />
              ) : balance < 0 ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : null}
              <p className={`text-2xl font-bold ${
                balance > 0 ? "text-primary" : balance < 0 ? "text-destructive" : "text-muted-foreground"
              }`}>
                {balance > 0 ? "+" : ""}₹{Math.abs(balance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {balance > 0 ? "You are owed" : balance < 0 ? "You owe" : "Settled up"}
            </p>
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
            expenses.map((expense) => (
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
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{Number(expense.amount).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{(Number(expense.amount) / members.length).toLocaleString("en-IN", { maximumFractionDigits: 0 })} per person
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Members</CardTitle>
              <CardDescription>{members.length} members in this group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      {member.email && (
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.is_registered ? (
                      <Badge variant="secondary">Member</Badge>
                    ) : (
                      <Badge variant="outline">Guest</Badge>
                    )}
                    {member.user_id === group.created_by && (
                      <Badge variant="default">Creator</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Who Owes What</CardTitle>
              <CardDescription>Simplified balances based on equal split</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => {
                const memberPaid = expenses
                  .filter(e => e.paid_by === member.user_id)
                  .reduce((sum, e) => sum + Number(e.amount), 0)
                const memberShare = totalExpenses / members.length
                const memberBalance = memberPaid - memberShare

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
                        <p className="text-xs text-muted-foreground">
                          Paid ₹{memberPaid.toLocaleString("en-IN")} • 
                          Share ₹{memberShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        memberBalance > 0 ? "text-primary" : memberBalance < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}>
                        {memberBalance > 0 ? "+" : ""}₹{Math.abs(memberBalance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {memberBalance > 0 ? "Gets back" : memberBalance < 0 ? "Owes" : "Settled"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddExpenseDialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen} />
      <AddMembersDialog 
        open={isAddMembersOpen} 
        onOpenChange={setIsAddMembersOpen} 
        groupId={groupId}
        onMembersAdded={fetchGroupDetails}
      />
    </div>
  )
}
