// This file ensures consistent id generation for SSR/CSR hydration
'use client'
import { SSRProvider } from '@react-aria/ssr';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SSRProvider>{children}</SSRProvider>;
}
