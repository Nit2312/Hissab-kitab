import { NextRequest, NextResponse } from "next/server"

// Simple in-memory store for categories (for demo purposes)
// In production, this should be stored in a database
let categories: Array<{ id: string; name: string }> = [
  { id: "default-0", name: "Food" },
  { id: "default-1", name: "Travel" },
  { id: "default-2", name: "Bills" },
  { id: "default-3", name: "Groceries" },
  { id: "default-4", name: "Shopping" },
  { id: "default-5", name: "Entertainment" },
  { id: "default-6", name: "Rent" },
  { id: "default-7", name: "Others" }
]

// GET /api/categories - Fetch all categories
export async function GET() {
  try {
    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

// POST /api/categories - Add a new category
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // Check for duplicate
    if (categories.some(cat => cat.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 })
    }

    const newCategory = {
      id: `custom-${Date.now()}`,
      name: name.trim()
    }
    
    categories.push(newCategory)
    return NextResponse.json(newCategory)
  } catch (error) {
    console.error("Error adding category:", error)
    return NextResponse.json(
      { error: "Failed to add category" },
      { status: 500 }
    )
  }
}
