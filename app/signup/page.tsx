import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function SignupPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-lg">
            <div className="mb-6 flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur">
                <BookOpen className="h-4 w-4 text-primary" />
                HisaabKitab
              </Link>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back home
                </Link>
              </Button>
            </div>

            <Card className="glass-card border-border/60 shadow-xl">
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Get started in minutes
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">Create your account</h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Set up your personal or business workspace and start tracking money with a cleaner flow.
                    </p>
                  </div>
                </div>

                <SignupForm />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div className="rounded-[2rem] border border-border/60 bg-card/80 p-8 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Built for personal and business use
            </div>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-foreground">
              Simple onboarding, polished experience.
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
              We keep signup straightforward so users can get to the dashboard quickly without confusion.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-sm font-medium text-foreground">Personal mode</p>
                <p className="mt-1 text-sm text-muted-foreground">Great for friends, roommates, and families.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-sm font-medium text-foreground">Business mode</p>
                <p className="mt-1 text-sm text-muted-foreground">Track credit, collections, and outstanding balances.</p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Clean interface. Clear balances. Less friction for your users.
          </p>
        </div>
      </div>
    </div>
  )
}
