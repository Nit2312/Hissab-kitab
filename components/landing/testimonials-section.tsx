import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Roommate Group Admin",
    location: "Mumbai",
    content: "Finally, no more awkward conversations about who owes what! Our flat expenses are sorted every month with HisaabKitab.",
    initials: "PS"
  },
  {
    name: "Rajesh Kumar",
    role: "Kirana Store Owner",
    location: "Delhi",
    content: "Mere purane register ki jagah ab yeh app hai. Customer ka hisaab bilkul clear rehta hai. Bahut aasan hai use karna.",
    initials: "RK"
  },
  {
    name: "Anita Patel",
    role: "Travel Group Organizer",
    location: "Bangalore",
    content: "Our Goa trip expenses were split perfectly. Everyone knew exactly how much to pay. Highly recommend for group trips!",
    initials: "AP"
  },
  {
    name: "Mohammed Asif",
    role: "Chai Tapri Owner",
    location: "Hyderabad",
    content: "Office walon ka monthly udhaar track karna ab bohot easy ho gaya. Reminder bhi automatically chala jata hai.",
    initials: "MA"
  }
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-muted/50 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
            Loved by Indians Everywhere
          </h2>
          <p className="text-pretty text-lg text-muted-foreground">
            From roommates to retailers, see how HisaabKitab is making life easier.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="bg-card">
              <CardContent className="p-6">
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="mb-6 text-sm text-muted-foreground">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role} - {testimonial.location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
