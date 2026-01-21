import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"

const benefits = [
  "Free to use - No hidden charges",
  "Works offline - Sync when online",
  "Hindi & English support",
  "Bank-grade security"
]

export function CTASection() {
  return (
    <section className="bg-primary py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold text-primary-foreground md:text-4xl">
            Ready to Simplify Your Hisaab?
          </h2>
          <p className="mb-8 text-pretty text-lg text-primary-foreground/80">
            Join thousands of Indians who have made expense tracking stress-free.
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-primary-foreground/90">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary" asChild className="gap-2 px-8">
              <Link href="/signup">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent">
              <Link href="/login">I Already Have an Account</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
