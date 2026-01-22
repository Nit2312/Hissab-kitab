import { NextRequest, NextResponse } from "next/server"
import { categoriesStore } from "@/lib/categories-store"

// GET /api/categories - Fetch all categories
export async function GET() {
  try {
    const categories = categoriesStore.getAll()
    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    // Return empty array instead of error to prevent UI crashes
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/categories - Add a new category
export async function POST(request: NextRequest) {
  try {
    let requestBody
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

    // Check for duplicate
    if (categoriesStore.nameExists(name)) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 })
    }

    const newCategory = categoriesStore.add(name)
    return NextResponse.json(newCategory)
  } catch (error) {
    console.error("Error adding category:", error)
    // Return a generic error but don't crash
    return NextResponse.json({ error: "Failed to add category" }, { status: 500 })
  }
}
