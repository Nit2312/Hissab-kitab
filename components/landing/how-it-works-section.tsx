import { UserPlus, Receipt, ArrowLeftRight, CheckCircle } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Account",
    description: "Sign up in 30 seconds with your mobile number or email. No complex forms."
  },
  {
    number: "02",
    icon: Receipt,
    title: "Add Expenses",
    description: "Record who paid and split the cost. Add details like category and notes."
  },
  {
    number: "03",
    icon: ArrowLeftRight,
    title: "Track Balances",
    description: "See exactly who owes whom. Get reminders for pending payments."
  },
  {
    number: "04",
    icon: CheckCircle,
    title: "Settle Up",
    description: "Mark payments as settled. Keep a clean record of all transactions."
  }
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-background py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
            Simple as 1-2-3-4
          </h2>
          <p className="text-pretty text-lg text-muted-foreground">
            Start managing your expenses in minutes. No training needed.
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* Connection Line - Desktop */}
          <div className="absolute left-0 right-0 top-20 hidden h-0.5 bg-border lg:block" />
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Step Number Circle */}
                <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <step.icon className="h-7 w-7" />
                </div>
                
                {/* Step Number Badge */}
                <span className="mb-2 text-sm font-bold text-primary">
                  STEP {step.number}
                </span>
                
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
                
                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="my-4 text-border lg:hidden">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-90">
                      <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
