import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { BookOpen } from "lucide-react"

export default function SignupPage() {
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
            <h1 className="mb-2 text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-muted-foreground">
              Start tracking your expenses in minutes
            </p>
          </div>

          <SignupForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
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
            Simple. Trusted. Indian.
          </h2>
          <p className="text-primary-foreground/80">
            Whether you are splitting bills with friends or managing your shop&apos;s udhaar, we&apos;ve got you covered.
          </p>
        </div>
      </div>
    </div>
  )
}
