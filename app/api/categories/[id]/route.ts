import { NextRequest, NextResponse } from "next/server"

// Import the same categories array from the main route
// In production, this should be replaced with a proper database
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

// PUT /api/categories/[id] - Update a category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name } = await request.json()
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // Check for duplicate (excluding current category)
    if (categories.some(cat => cat.id !== params.id && cat.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 })
    }

    const categoryIndex = categories.findIndex(cat => cat.id === params.id)
    if (categoryIndex === -1) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    categories[categoryIndex] = { id: params.id, name: name.trim() }
    return NextResponse.json({ id: params.id, name: name.trim() })
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Delete a category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryIndex = categories.findIndex(cat => cat.id === params.id)
    if (categoryIndex === -1) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Don't allow deleting default categories
    if (params.id.startsWith("default-")) {
      return NextResponse.json({ error: "Cannot delete default categories" }, { status: 400 })
    }

    categories.splice(categoryIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
}
