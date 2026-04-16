"use client"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const next: Record<string, string> = { light: "dark", dark: "system", system: "light" }

  if (!mounted) {
    return <button className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Toggle theme" data-testid="theme-toggle"><Monitor className="w-4 h-4" /></button>
  }

  const current = theme || "system"
  const icon = current === "light" ? <Sun className="w-4 h-4" /> : current === "dark" ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />

  return (
    <button onClick={() => setTheme(next[current])} className="p-2 rounded-lg hover:bg-secondary transition-colors" data-testid="theme-toggle" aria-label="Toggle theme">
      {icon}
    </button>
  )
}
