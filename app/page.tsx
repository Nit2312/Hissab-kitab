"use client"

import { HeroSection } from "@/components/landing/hero-section"
import { Footer } from "@/components/landing/footer"
import { Navbar } from "@/components/landing/navbar"
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Lazy load components that are below the fold
const FeaturesSection = dynamic(() => import("@/components/landing/features-section").then(mod => ({ default: mod.FeaturesSection })), {
  loading: () => <div className="h-96 animate-pulse bg-muted/20" />,
  ssr: false
})

const HowItWorksSection = dynamic(() => import("@/components/landing/how-it-works-section").then(mod => ({ default: mod.HowItWorksSection })), {
  loading: () => <div className="h-96 animate-pulse bg-muted/20" />,
  ssr: false
})

const TestimonialsSection = dynamic(() => import("@/components/landing/testimonials-section").then(mod => ({ default: mod.TestimonialsSection })), {
  loading: () => <div className="h-96 animate-pulse bg-muted/20" />,
  ssr: false
})

const CTASection = dynamic(() => import("@/components/landing/cta-section").then(mod => ({ default: mod.CTASection })), {
  loading: () => <div className="h-64 animate-pulse bg-muted/20" />,
  ssr: false
})

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      
      {/* Add spacing between sections */}
      <section className="scroll-mt-20" id="features">
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
          <FeaturesSection />
        </Suspense>
      </section>
      
      <section className="scroll-mt-20" id="how-it-works">
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
          <HowItWorksSection />
        </Suspense>
      </section>
      
      <section className="scroll-mt-20" id="testimonials">
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
          <TestimonialsSection />
        </Suspense>
      </section>
      
      <section className="scroll-mt-20" id="cta">
        <Suspense fallback={<div className="h-64 animate-pulse bg-muted/20" />}>
          <CTASection />
        </Suspense>
      </section>
      
      <Footer />
    </main>
  )
}
