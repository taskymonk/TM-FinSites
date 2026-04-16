"use client"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next: Record<string, string> = { light: "dark", dark: "system", system: "light" }
  const icons: Record<string, React.ReactNode> = {
    light: <Sun className="w-4 h-4" />, dark: <Moon className="w-4 h-4" />, system: <Monitor className="w-4 h-4" />
  }
  return (
    <button onClick={() => setTheme(next[theme || "system"])} className="p-2 rounded-lg hover:bg-secondary transition-colors" data-testid="theme-toggle" aria-label="Toggle theme">
      {icons[theme || "system"]}
    </button>
  )
}
