import { NextRequest, NextResponse } from "next/server"
import { categoriesStore } from "@/lib/categories-store"

// PUT /api/categories/[id] - Update a category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let id, requestBody
    try {
      id = (await params).id
    } catch (paramsError) {
      console.error("Failed to extract params:", paramsError)
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
    }

    try {
      requestBody = await request.json()
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    const { name } = requestBody
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // Check for duplicate (excluding current category)
    if (categoriesStore.nameExists(name, id)) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 })
    }

    const updatedCategory = categoriesStore.update(id, name)
    if (!updatedCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error("Error updating category:", error)
    // Return a generic error but don't crash
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

// DELETE /api/categories/[id] - Delete a category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let id
    try {
      id = (await params).id
    } catch (paramsError) {
      console.error("Failed to extract params:", paramsError)
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
    }
    
    const category = categoriesStore.findById(id)
    const deleted = categoriesStore.delete(id)
    
    if (!deleted) {
      // Check if the category exists
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      // Category exists but couldn't be deleted for some reason
      return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    // Return a generic error but don't crash
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
