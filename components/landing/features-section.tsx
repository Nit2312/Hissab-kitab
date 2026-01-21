import { 
  Calculator, 
  Users, 
  Bell, 
  PieChart, 
  Smartphone, 
  Shield,
  BookOpen,
  CreditCard
} from "lucide-react"

const features = [
  {
    icon: Calculator,
    title: "Smart Expense Splitting",
    description: "Split bills equally, by percentage, or custom amounts. Perfect for trips, rent, and group dinners.",
    color: "bg-primary/10 text-primary"
  },
  {
    icon: BookOpen,
    title: "Khata / Ledger System",
    description: "Digital bahi khata for retailers. Track customer credit (udhaar) and payments effortlessly.",
    color: "bg-accent/20 text-accent"
  },
  {
    icon: Users,
    title: "Group Management",
    description: "Create groups for family, friends, office, or trips. See who owes whom at a glance.",
    color: "bg-primary/10 text-primary"
  },
  {
    icon: CreditCard,
    title: "Easy Settlements",
    description: "Record payments via Cash, UPI, or Bank Transfer. Auto-adjust balances instantly.",
    color: "bg-accent/20 text-accent"
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Automatic reminders for pending dues and overdue udhaar. Never forget to collect.",
    color: "bg-primary/10 text-primary"
  },
  {
    icon: PieChart,
    title: "Visual Reports",
    description: "Category-wise charts, monthly summaries, and detailed analytics for better insights.",
    color: "bg-accent/20 text-accent"
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "Designed for phones. Simple WhatsApp-like interface that anyone can use.",
    color: "bg-primary/10 text-primary"
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your financial data stays safe. Bank-grade security for peace of mind.",
    color: "bg-accent/20 text-accent"
  }
]

export function FeaturesSection() {
  return (
    <section id="features" className="bg-muted/50 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
            Everything You Need for Hisaab
          </h2>
          <p className="text-pretty text-lg text-muted-foreground">
            Whether you are splitting dinner bills or managing your shop&apos;s credit, we have got you covered.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl bg-card p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
