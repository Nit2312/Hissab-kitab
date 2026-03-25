import React from "react"
import { Providers } from "@/components/ssr-provider"
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HisaabKitab',
  description: 'A modern way to split expenses, manage udhaar, and keep group or business balances clear.',
  generator: 'HisaabKitab',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
