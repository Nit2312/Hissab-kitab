import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users, Store, IndianRupee } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6">
            Trusted by 10,000+ Indians
          </Badge>
          
          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Split Expenses.{" "}
            <span className="text-primary">Track Udhaar.</span>{" "}
            Settle Easy.
          </h1>
          
          <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
            The simple way to manage shared expenses with friends and family, or track credit for your small business. Made for India, in Hindi and English.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="gap-2 px-8">
              <Link href="/signup">
                Start Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">See How It Works</Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground">Personal</span>
              <span className="text-sm text-muted-foreground">Friends, Family, Roommates</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                <Store className="h-6 w-6 text-accent" />
              </div>
              <span className="text-2xl font-bold text-foreground">Business</span>
              <span className="text-sm text-muted-foreground">Kirana, Vendors, Retailers</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <IndianRupee className="h-6 w-6 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground">INR First</span>
              <span className="text-sm text-muted-foreground">Built for Indian Users</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
