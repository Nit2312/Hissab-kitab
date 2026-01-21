"use client"

import React from "react"

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Users, Plane, Home, Briefcase, Heart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const groupTypes = [
  { value: "trip", label: "Trip", icon: Plane },
  { value: "home", label: "Home", icon: Home },
  { value: "work", label: "Work", icon: Briefcase },
  { value: "family", label: "Family", icon: Heart },
  { value: "friends", label: "Friends", icon: Users },
]

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "friends",
    members: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // Parse members if provided
      let members: any[] = []
      if (formData.members.trim()) {
        const memberEntries = formData.members
          .split(",")
          .map(m => m.trim())
          .filter(m => m.length > 0)

        members = memberEntries.map(entry => {
          const isEmail = entry.includes("@")
          return {
            name: entry,
            email: isEmail ? entry : undefined,
            phone: !isEmail ? entry : undefined,
          }
        })
      }

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          members,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create group")
      }

      toast({
        title: "Group created",
        description: "Your group has been successfully created.",
      })
      onOpenChange(false)
      setFormData({ name: "", type: "friends", members: "" })
      // Refresh the page to show new group
      window.location.reload()
    } catch (err: any) {
      console.error("Error creating group:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to create group. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Add a new expense group with your friends, family, or colleagues.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="e.g., Goa Trip 2024"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Group Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                className="grid grid-cols-5 gap-2"
              >
                {groupTypes.map((type) => (
                  <Label
                    key={type.value}
                    htmlFor={type.value}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors ${
                      formData.type === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={type.value} id={type.value} className="sr-only" />
                    <type.icon className={`h-5 w-5 ${
                      formData.type === type.value ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <span className={`text-xs ${
                      formData.type === type.value ? "text-primary font-medium" : "text-muted-foreground"
                    }`}>
                      {type.label}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="members">Add Members</Label>
              <Input
                id="members"
                placeholder="Enter phone numbers or emails (comma separated)"
                value={formData.members}
                onChange={(e) => setFormData({ ...formData, members: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                You can also add members later
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
