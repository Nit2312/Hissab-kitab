"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function TestPage() {
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [groups, setGroups] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [groupForm, setGroupForm] = useState({ name: "", description: "", type: "friends" })
  const [expenseForm, setExpenseForm] = useState({ 
    description: "", 
    amount: "", 
    category: "Food", 
    groupId: "",
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch user
      const userResponse = await fetch("/api/auth/user", { credentials: "include" })
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData)
        console.log("User:", userData)
      }

      // Fetch groups
      const groupsResponse = await fetch("/api/groups", { credentials: "include" })
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        setGroups(groupsData)
        console.log("Groups:", groupsData)
      }

      // Fetch expenses
      const expensesResponse = await fetch("/api/expenses", { credentials: "include" })
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json()
        setExpenses(expensesData)
        console.log("Expenses:", expensesData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const createGroup = async () => {
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...groupForm,
          members: [{ name: "Test Member", email: "test@example.com" }]
        })
      })

      if (response.ok) {
        toast({ title: "Success", description: "Group created successfully" })
        setGroupForm({ name: "", description: "", type: "friends" })
        fetchData()
      } else {
        const error = await response.json()
        toast({ title: "Error", description: error.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create group", variant: "destructive" })
    }
  }

  const createExpense = async () => {
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          group_id: expenseForm.groupId || null,
          split_type: "equal",
          date: expenseForm.date
        })
      })

      if (response.ok) {
        toast({ title: "Success", description: "Expense created successfully" })
        setExpenseForm({ 
          description: "", 
          amount: "", 
          category: "Food", 
          groupId: "",
          date: new Date().toISOString().split('T')[0]
        })
        fetchData()
      } else {
        const error = await response.json()
        toast({ title: "Error", description: error.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create expense", variant: "destructive" })
    }
  }

  const deleteExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
        credentials: "include"
      })

      if (response.ok) {
        toast({ title: "Success", description: "Expense deleted successfully" })
        fetchData()
      } else {
        const error = await response.json()
        toast({ title: "Error", description: error.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" })
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">CRUD Operations Test</h1>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Name:</strong> {user.full_name || 'N/A'}</p>
              <p><strong>User Type:</strong> {user.user_type}</p>
              <p><strong>ID:</strong> {user.id || user.uid}</p>
            </div>
          ) : (
            <p className="text-red-600">Not authenticated. Please <a href="/login" className="underline">login</a> first.</p>
          )}
        </CardContent>
      </Card>

      {user && (
        <>
          {/* Create Group */}
          <Card>
            <CardHeader>
              <CardTitle>Create Group</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <Label htmlFor="groupDesc">Description</Label>
                <Input
                  id="groupDesc"
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <Button onClick={createGroup} disabled={!groupForm.name}>
                Create Group
              </Button>
            </CardContent>
          </Card>

          {/* Create Expense */}
          <Card>
            <CardHeader>
              <CardTitle>Create Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="expenseDesc">Description</Label>
                <Input
                  id="expenseDesc"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <Label htmlFor="expenseAmount">Amount</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="expenseGroup">Group (Optional)</Label>
                <select
                  id="expenseGroup"
                  value={expenseForm.groupId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, groupId: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">No Group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="expenseDate">Date</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
              <Button onClick={createExpense} disabled={!expenseForm.description || !expenseForm.amount}>
                Create Expense
              </Button>
            </CardContent>
          </Card>

          {/* Groups List */}
          <Card>
            <CardHeader>
              <CardTitle>Groups ({groups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p>No groups found</p>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <div key={group.id} className="p-3 border rounded">
                      <h4 className="font-semibold">{group.name}</h4>
                      <p className="text-sm text-gray-600">{group.description}</p>
                      <p className="text-sm">Type: {group.type}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses List */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses ({expenses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p>No expenses found</p>
              ) : (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="p-3 border rounded flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{expense.description}</h4>
                        <p className="text-sm">Amount: ₹{expense.amount}</p>
                        <p className="text-sm">Category: {expense.category}</p>
                        <p className="text-sm">Date: {expense.date}</p>
                        {expense.group_name && <p className="text-sm">Group: {expense.group_name}</p>}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteExpense(expense.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
