"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Eye, EyeOff, Loader2, Users, Store } from "lucide-react"
interface LoginFormProps {
  initialError?: string | null
}

export function LoginForm({ initialError }: LoginFormProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [success, setSuccess] = useState(false)
  const [userType, setUserType] = useState<"personal" | "business">("personal")
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Use Firebase Client SDK to authenticate
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { getAuth } = await import('firebase/auth')
      const { initializeApp, getApps } = await import('firebase/app')

      // Initialize Firebase if not already initialized
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      }

      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
      const auth = getAuth(app)

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // Get ID token to send to backend
      const idToken = await user.getIdToken()

      // Send token to backend to create session
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          idToken,
          userType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || "Failed to sign in"
        setError(errorMessage)
        setIsLoading(false)
        return
      }

      if (data.user) {
        setSuccess(true)

        // Small delay to ensure cookie is set, then redirect with full page reload
        setTimeout(() => {
          const redirectPath = userType === "business" ? "/dashboard/khata" : "/dashboard"
          window.location.href = redirectPath
        }, 1000)
      } else {
        setError("Sign in successful but user data not returned. Please try again.")
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error("Login error:", err)
      // Handle Firebase auth errors
      let errorMessage = "An unexpected error occurred. Please try again."
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = "Invalid email or password"
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed login attempts. Please try again later."
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your connection."
      }
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isLoading}>
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Login successful! Redirecting to dashboard...</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <Label>Login as</Label>
        <RadioGroup
          value={userType}
          onValueChange={(value) => setUserType(value as "personal" | "business")}
          className="grid grid-cols-2 gap-4"
        >
          <Label
            htmlFor="login-personal"
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${userType === "personal"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
              }`}
          >
            <RadioGroupItem value="personal" id="login-personal" className="sr-only" />
            <Users className={`h-6 w-6 ${userType === "personal" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${userType === "personal" ? "text-primary" : "text-foreground"}`}>
              Personal
            </span>
            <span className="text-xs text-muted-foreground text-center">
              Split bills with friends
            </span>
          </Label>
          <Label
            htmlFor="login-business"
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${userType === "business"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
              }`}
          >
            <RadioGroupItem value="business" id="login-business" className="sr-only" />
            <Store className={`h-6 w-6 ${userType === "business" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${userType === "business" ? "text-primary" : "text-foreground"}`}>
              Business
            </span>
            <span className="text-xs text-muted-foreground text-center">
              Manage customer khata
            </span>
          </Label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value })
            if (error) setError(null)
          }}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value })
              if (error) setError(null)
            }}
            required
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">
              {showPassword ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          `Sign in as ${userType === "personal" ? "Personal" : "Business"} User`
        )}
      </Button>

      <div className="text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </form>
  )
}
