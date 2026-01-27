"use client"

import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
  loadTime: number | null // Page load time
}

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    loadTime: null
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const measurePerformance = () => {
      // First Contentful Paint
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry
      const fcp = fcpEntry ? fcpEntry.startTime : null

      // Time to First Byte
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const ttfb = navigation ? navigation.responseStart - navigation.requestStart : null

      // Page load time
      const loadTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : null

      // Largest Contentful Paint
      let lcp = null
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            lcp = lastEntry.startTime
          })
          observer.observe({ entryTypes: ['largest-contentful-paint'] })
        } catch (e) {
          console.warn('LCP measurement not supported')
        }
      }

      // First Input Delay
      let fid = null
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry: any) => {
              if (entry.name === 'first-input') {
                fid = entry.processingStart - entry.startTime
              }
            })
          })
          observer.observe({ entryTypes: ['first-input'] })
        } catch (e) {
          console.warn('FID measurement not supported')
        }
      }

      // Cumulative Layout Shift
      let cls = 0
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                cls += entry.value
              }
            })
          })
          observer.observe({ entryTypes: ['layout-shift'] })
        } catch (e) {
          console.warn('CLS measurement not supported')
        }
      }

      setMetrics({
        fcp,
        lcp,
        fid,
        cls,
        ttfb,
        loadTime
      })
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      setTimeout(measurePerformance, 0)
    } else {
      window.addEventListener('load', () => {
        setTimeout(measurePerformance, 0)
      })
    }
  }, [])

  const getPerformanceGrade = () => {
    const scores = []
    
    if (metrics.fcp) scores.push(metrics.fcp < 1800 ? 1 : 0)
    if (metrics.lcp) scores.push(metrics.lcp < 2500 ? 1 : 0)
    if (metrics.fid) scores.push(metrics.fid < 100 ? 1 : 0)
    if (metrics.cls) scores.push(metrics.cls < 0.1 ? 1 : 0)
    if (metrics.ttfb) scores.push(metrics.ttfb < 800 ? 1 : 0)
    
    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    
    if (average >= 0.8) return 'A'
    if (average >= 0.6) return 'B'
    if (average >= 0.4) return 'C'
    return 'D'
  }

  return {
    metrics,
    grade: getPerformanceGrade(),
    isGood: getPerformanceGrade() === 'A' || getPerformanceGrade() === 'B'
  }
}
