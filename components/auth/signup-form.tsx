"use client"

import React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Eye, EyeOff, Loader2, Users, Store, CheckCircle } from "lucide-react"
export function SignupForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    mode: "personal",
    businessName: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          phone: formData.phone.trim() || undefined,
          user_type: formData.mode,
          business_name: formData.mode === "business" ? formData.businessName : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || "Failed to create account"
        setError(errorMessage)
        setIsLoading(false)
        return
      }

      if (data.user) {
        setSuccess(true)
        setTimeout(() => {
          window.location.href = "/login"
        }, 2000)
      } else {
        setError("Account created but user data not returned. Please try signing in.")
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err?.message || "An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center py-8">
        <div className="rounded-full bg-primary/10 p-3">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Account created successfully!</h2>
        <p className="text-muted-foreground">
          Welcome to HisaabKitab! Your account has been created and you can now sign in.
        </p>
        <p className="text-sm text-muted-foreground">
          Redirecting to login page...
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <Label>How will you use HisaabKitab?</Label>
        <RadioGroup
          value={formData.mode}
          onValueChange={(value) => setFormData({ ...formData, mode: value })}
          className="grid grid-cols-2 gap-4"
        >
          <Label
            htmlFor="personal"
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${formData.mode === "personal"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
              }`}
          >
            <RadioGroupItem value="personal" id="personal" className="sr-only" />
            <Users className={`h-6 w-6 ${formData.mode === "personal" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${formData.mode === "personal" ? "text-primary" : "text-foreground"}`}>
              Personal
            </span>
            <span className="text-xs text-muted-foreground text-center">
              Friends & Family
            </span>
          </Label>
          <Label
            htmlFor="business"
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${formData.mode === "business"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
              }`}
          >
            <RadioGroupItem value="business" id="business" className="sr-only" />
            <Store className={`h-6 w-6 ${formData.mode === "business" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${formData.mode === "business" ? "text-primary" : "text-foreground"}`}>
              Business
            </span>
            <span className="text-xs text-muted-foreground text-center">
              Shop & Retail
            </span>
          </Label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter your name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          disabled={isLoading}
        />
      </div>

      {formData.mode === "business" && (
        <div className="space-y-2">
          <Label htmlFor="businessName">Business/Shop Name</Label>
          <Input
            id="businessName"
            type="text"
            placeholder="e.g., Sharma General Store"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>
      )}

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
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+91 98765 43210"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password (min 6 characters)"
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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          `Create ${formData.mode === "personal" ? "Personal" : "Business"} Account`
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By signing up, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
      </p>

      <div className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  )
}
