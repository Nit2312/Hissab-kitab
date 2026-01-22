"use client"

import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { BookOpen } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginPageContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 lg:w-1/2 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">HisaabKitab</span>
          </Link>

          <div className="mb-8">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          {error === "unauthorized" && (
            <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              Please sign in to access this page.
            </div>
          )}

          <LoginForm initialError={null} />
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden bg-primary lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-foreground/10">
              <BookOpen className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground">
            Track Every Rupee
          </h2>
          <p className="text-primary-foreground/80">
            Join thousands of Indians who have simplified their expense tracking with HisaabKitab.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
