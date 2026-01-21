"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AddMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  onMembersAdded?: () => void
}

export function AddMembersDialog({ 
  open, 
  onOpenChange, 
  groupId,
  onMembersAdded 
}: AddMembersDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!members.trim()) {
      toast({
        title: "Error",
        description: "Please enter at least one member",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("Not authenticated")

      // Parse member entries
      const memberEntries = members
        .split(",")
        .map(m => m.trim())
        .filter(m => m.length > 0)

      if (memberEntries.length === 0) {
        throw new Error("No valid members provided")
      }

      // Process each member entry
      const membersToAdd = await Promise.all(
        memberEntries.map(async (entry) => {
          // Check if it's an email or phone
          const isEmail = entry.includes("@")
          const isPhone = /^[\d\s\+\-\(\)]+$/.test(entry) // Check if it looks like a phone number
          
          let foundUser = null
          
          // If it's a phone number, search for existing user
          if (isPhone) {
            const cleanPhone = entry.replace(/[\s\-\(\)]/g, "") // Clean phone number
            
            // Search in profiles table
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name, phone")
              .ilike("phone", `%${cleanPhone}%`)
              .limit(1)
            
            if (profiles && profiles.length > 0) {
              foundUser = profiles[0]
              console.log("Found existing user by phone:", foundUser)
            }
          }
          
          // If user found, add as registered member
          if (foundUser) {
            return {
              group_id: groupId,
              user_id: foundUser.id,
              name: foundUser.full_name || entry,
              phone: foundUser.phone,
              is_registered: true,
            }
          }
          
          // Otherwise, add as guest
          return {
            group_id: groupId,
            name: entry,
            email: isEmail ? entry : null,
            phone: isPhone ? entry : null,
            is_registered: false,
          }
        })
      )

      console.log("Adding members to group:", { groupId, members: membersToAdd })

      const { error } = await supabase
        .from("group_members")
        .insert(membersToAdd)

      if (error) {
        console.error("Error adding members:", error)
        throw new Error(`Failed to add members: ${error.message}`)
      }

      const registeredCount = membersToAdd.filter(m => m.is_registered).length
      const guestCount = membersToAdd.filter(m => !m.is_registered).length

      toast({
        title: "Members added",
        description: registeredCount > 0 
          ? `Added ${registeredCount} registered user${registeredCount > 1 ? 's' : ''} and ${guestCount} guest${guestCount !== 1 ? 's' : ''}`
          : `Successfully added ${memberEntries.length} member${memberEntries.length > 1 ? 's' : ''}`,
      })

      setMembers("")
      onOpenChange(false)
      
      // Callback to refresh the group details
      if (onMembersAdded) {
        onMembersAdded()
      }
    } catch (err: any) {
      console.error("Error adding members:", err)
      toast({
        title: "Error",
        description: err?.message || "Failed to add members. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
            <DialogDescription>
              Add people to this group. Enter phone numbers to find registered users, or add names/emails as guests.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="members">Members</Label>
              <Input
                id="members"
                placeholder="+91 98765 43210, 9876543210, John Doe"
                value={members}
                onChange={(e) => setMembers(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                💡 Enter phone numbers to auto-find registered users. Separate multiple entries with commas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Members
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
