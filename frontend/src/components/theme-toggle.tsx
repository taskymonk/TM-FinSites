"use client"
import { useTheme } from "next-themes"
import { useEffect, useState, useRef } from "react"
import { Sun, Moon, Monitor } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  if (!mounted) {
    return <button className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Toggle theme" data-testid="theme-toggle"><Monitor className="w-4 h-4" /></button>
  }

  const current = theme || "system"
  const icon = current === "light" ? <Sun className="w-4 h-4" /> : current === "dark" ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />

  const options = [
    { value: "light", label: "Light", icon: <Sun className="w-3.5 h-3.5" /> },
    { value: "dark", label: "Dark", icon: <Moon className="w-3.5 h-3.5" /> },
    { value: "system", label: "System", icon: <Monitor className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-secondary transition-colors" data-testid="theme-toggle" aria-label="Toggle theme">
        {icon}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg z-50" data-testid="theme-dropdown">
          {options.map((opt) => (
            <button key={opt.value} onClick={() => { setTheme(opt.value); setOpen(false) }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs rounded-md transition-colors ${current === opt.value ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}
              data-testid={`theme-${opt.value}`}>
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
