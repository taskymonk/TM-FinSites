import type { Metadata } from "next"
import { Outfit, Manrope, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading", display: "swap" })
const manrope = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })

export const metadata: Metadata = {
  title: "FinSites - Compliant Websites for Financial Professionals",
  description: "Build SEBI, AMFI & IRDAI compliant websites for Indian financial professionals. MFD, Insurance, RIA, PMS, SIF, Stock Broker, NPS Distributor.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${outfit.variable} ${manrope.variable} ${jetbrainsMono.variable} font-[family-name:var(--font-body)] antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
