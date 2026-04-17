"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Shield, Menu, X, ChevronDown } from "lucide-react"

const SOLUTIONS = [
  { name: "Mutual Fund Distributor", href: "/solutions/mfd" },
  { name: "Insurance Agent / Broker", href: "/solutions/insurance" },
  { name: "Investment Adviser (RIA)", href: "/solutions/ria" },
  { name: "Portfolio Management (PMS)", href: "/solutions/pms" },
  { name: "Stock Broker / AP", href: "/solutions/stock-broker" },
  { name: "Specialised Investment Fund", href: "/solutions/sif" },
  { name: "NPS Distributor", href: "/solutions/nps" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [solOpen, setSolOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === "/"
  const solRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (solRef.current && !solRef.current.contains(e.target as Node)) setSolOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    if (!isHome) { window.location.href = "/#" + id; return }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <nav data-testid="main-navbar" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 shadow-2xl" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group" data-testid="navbar-logo">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">FinSites</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {isHome && ["features", "how-it-works", "pricing", "faq"].map((id) => (
              <button key={id} onClick={() => scrollTo(id)} className="px-3 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors capitalize" data-testid={`nav-${id}`}>
                {id.replace(/-/g, " ")}
              </button>
            ))}

            {/* Solutions Dropdown */}
            <div className="relative" ref={solRef}>
              <button onClick={() => setSolOpen(!solOpen)} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors" data-testid="nav-solutions">
                Solutions <ChevronDown className={`w-3.5 h-3.5 transition-transform ${solOpen ? "rotate-180" : ""}`} />
              </button>
              {solOpen && (
                <div className="absolute left-0 top-full mt-1 w-60 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl z-50" data-testid="solutions-dropdown">
                  {SOLUTIONS.map((s) => (
                    <Link key={s.href} href={s.href} onClick={() => setSolOpen(false)}
                      className="block px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" data-testid={`sol-link-${s.href.split("/").pop()}`}>
                      {s.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/audit"><Button variant="ghost" size="sm" className="hidden sm:inline-flex text-slate-300 hover:text-white hover:bg-white/5" data-testid="nav-free-audit">Free Audit</Button></Link>
            <Link href="/plans"><Button size="sm" className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-500 text-white font-semibold" data-testid="nav-get-started">Get Started</Button></Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-400" data-testid="mobile-menu-toggle">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#030712]/95 backdrop-blur-xl border-t border-white/10" data-testid="mobile-menu">
          <div className="px-4 py-3 space-y-1">
            {isHome && ["features", "how-it-works", "pricing", "faq"].map((id) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white capitalize">{id.replace(/-/g, " ")}</button>
            ))}
            <div className="border-t border-slate-800 my-2 pt-2">
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Solutions</p>
              {SOLUTIONS.map((s) => (
                <Link key={s.href} href={s.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-400 hover:text-white">{s.name}</Link>
              ))}
            </div>
            <div className="border-t border-slate-800 my-2 pt-2">
              <Link href="/audit" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-blue-400">Free Audit</Link>
              <Link href="/plans" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-white">Get Started</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
