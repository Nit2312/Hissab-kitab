// Simple in-memory store for categories (for demo purposes)
// In production, this should be replaced with a proper database

export interface Category {
  id: string
  name: string
}

// Initial default categories
const defaultCategories: Category[] = [
  { id: "default-0", name: "Food" },
  { id: "default-1", name: "Travel" },
  { id: "default-2", name: "Bills" },
  { id: "default-3", name: "Groceries" },
  { id: "default-4", name: "Shopping" },
  { id: "default-5", name: "Entertainment" },
  { id: "default-6", name: "Rent" },
  { id: "default-7", name: "Others" }
]

// In-memory store
let categories: Category[] = [...defaultCategories]

// Add initialization logging
console.log("Categories store initialized")

export const categoriesStore = {
  // Get all categories
  getAll(): Category[] {
    return [...categories]
  },

  // Add a new category
  add(name: string): Category {
    try {
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        throw new Error("Category name is required")
      }

      const newCategory: Category = {
        id: `custom-${Date.now()}`,
        name: name.trim()
      }
      
      categories.push(newCategory)
      return newCategory
    } catch (error) {
      console.error("Error adding category to store:", error)
      throw error
    }
  },

  // Update a category
  update(id: string, name: string): Category | null {
    try {
      if (!id || typeof id !== "string" || id.trim().length === 0) {
        throw new Error("Category ID is required")
      }
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        throw new Error("Category name is required")
      }

      const index = categories.findIndex(cat => cat.id === id)
      if (index === -1) {
        console.warn("Category not found for update:", id)
        return null
      }
      
      categories[index] = { id, name: name.trim() }
      return categories[index]
    } catch (error) {
      console.error("Error updating category in store:", error)
      return null
    }
  },

  // Delete a category
  delete(id: string): boolean {
    try {
      if (!id || typeof id !== "string" || id.trim().length === 0) {
        console.error("Invalid category ID provided for deletion")
        return false
      }
      
      const index = categories.findIndex(cat => cat.id === id)
      if (index === -1) {
        console.warn("Category not found for deletion:", id)
        return false
      }
      
      categories.splice(index, 1)
      return true
    } catch (error) {
      console.error("Error deleting category from store:", error)
      return false
    }
  },

  // Find category by ID
  findById(id: string): Category | null {
    try {
      if (!id || typeof id !== "string") {
        console.warn("Invalid ID provided to findById")
        return null
      }
      return categories.find(cat => cat.id === id) || null
    } catch (error) {
      console.error("Error finding category by ID:", error)
      return null
    }
  },

  // Find category by name
  findByName(name: string): Category | null {
    try {
      if (!name || typeof name !== "string") {
        console.warn("Invalid name provided to findByName")
        return null
      }
      return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase()) || null
    } catch (error) {
      console.error("Error finding category by name:", error)
      return null
    }
  },

  // Check if category name exists (excluding a specific ID)
  nameExists(name: string, excludeId?: string): boolean {
    try {
      if (!name || typeof name !== "string") {
        return false
      }
      return categories.some(cat => 
        cat.id !== excludeId && cat.name.toLowerCase() === name.toLowerCase()
      )
    } catch (error) {
      console.error("Error checking if name exists:", error)
      return false
    }
  },

  // Reset to defaults (for testing)
  reset(): void {
    categories = [...defaultCategories]
  }
}
