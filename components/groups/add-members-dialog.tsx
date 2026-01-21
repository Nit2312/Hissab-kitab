"use client"

import { useState } from "react"
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
          const isPhone = /^[\d\s\+\-\(\)]+$/.test(entry)
          
          let foundUser = null
          
          // If it's a phone number or email, search for existing user
          if (isPhone || isEmail) {
            const cleanPhone = isPhone ? entry.replace(/[\s\-\(\)\+]/g, "") : null
            
            // Search for user by phone or email via API
            try {
              const searchUrl = isPhone 
                ? `/api/users/search?phone=${encodeURIComponent(cleanPhone!)}`
                : `/api/users/search?email=${encodeURIComponent(entry)}`
              
              const searchResponse = await fetch(searchUrl)
              if (searchResponse.ok) {
                const userData = await searchResponse.json()
                if (userData && userData.id) {
                  foundUser = userData
                }
              }
            } catch (err) {
              // Ignore search errors
              console.error('Error searching for user:', err)
            }
          }
          
          // If user found, add as registered member
          if (foundUser) {
            // Always use the user's name, email, or phone (in that order)
            const displayName = foundUser.full_name || foundUser.email?.split('@')[0] || foundUser.phone || entry;
            return {
              name: displayName,
              email: foundUser.email,
              phone: foundUser.phone,
              user_id: foundUser.id,
            }
          }
          
          // Otherwise, add as guest
          // For guests, use a more friendly name format
          let guestName = entry;
          if (isPhone) {
            // Format phone number nicely
            guestName = entry.replace(/(\d{2})(\d{5})(\d{5})/, '+$1 $2 $3');
          }
          
          return {
            name: guestName,
            email: isEmail ? entry : undefined,
            phone: isPhone ? entry : undefined,
          }
        })
      )

      const response = await fetch("/api/groups/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: groupId,
          members: membersToAdd,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add members")
      }

      const result = await response.json()
      const registeredCount = result.members.filter((m: any) => m.user_id).length
      const guestCount = result.members.length - registeredCount

      toast({
        title: "Members added",
        description: `${result.members.length} member${result.members.length > 1 ? 's' : ''} added successfully`,
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
                💡 Enter phone numbers or emails to auto-find registered users. Separate multiple entries with commas.
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
