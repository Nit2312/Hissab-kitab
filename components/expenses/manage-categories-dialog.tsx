"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Settings, Plus, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Category {
  id: string
  name: string
}

interface ManageCategoriesDialogProps {
  children: React.ReactNode
  onCategoriesChange?: () => void
}

export function ManageCategoriesDialog({ children, onCategoriesChange }: ManageCategoriesDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchCategories()
    }
  }, [open])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (!response.ok) throw new Error("Failed to fetch categories")
      const data = await response.json()
      setCategories(data)
    } catch (err) {
      console.error("Error fetching categories:", err)
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      })
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add category")
      }

      const newCategory = await response.json()
      setCategories(prev => [...prev, newCategory])
      setNewCategoryName("")
      onCategoriesChange?.()
      toast({
        title: "Category added",
        description: "Category has been successfully added.",
      })
    } catch (err: any) {
      console.error("Error adding category:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to add category",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update category")
      }

      const updatedCategory = await response.json()
      setCategories(prev => prev.map(cat => 
        cat.id === editingCategory.id ? updatedCategory : cat
      ))
      setNewCategoryName("")
      setEditingCategory(null)
      onCategoriesChange?.()
      toast({
        title: "Category updated",
        description: "Category has been successfully updated.",
      })
    } catch (err: any) {
      console.error("Error updating category:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to update category",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/categories/${deleteCategoryId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete category")
      }

      setDeleteCategoryId(null)
      setCategories(prev => prev.filter(cat => cat.id !== deleteCategoryId))
      onCategoriesChange?.()
      toast({
        title: "Category deleted",
        description: "Category has been successfully deleted.",
      })
    } catch (err: any) {
      console.error("Error deleting category:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to delete category",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (category: Category) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setNewCategoryName("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Add, edit, or delete expense categories.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Add/Edit Category */}
          <div className="space-y-2">
            <Label htmlFor="categoryName">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="categoryName"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    editingCategory ? handleUpdateCategory() : handleAddCategory()
                  }
                }}
              />
              <Button
                onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                disabled={isLoading || !newCategoryName.trim()}
              >
                {editingCategory ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
              {editingCategory && (
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-2">
            <Label>Existing Categories</Label>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories found</p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-lg border p-2"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(category)}
                        disabled={isLoading}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteCategoryId(category.id)}
                        disabled={isLoading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the category.
                Existing expenses with this category will remain unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCategory}
                disabled={isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
