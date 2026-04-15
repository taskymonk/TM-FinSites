import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Menu, X, Shield } from "lucide-react";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    if (!isLanding) { navigate("/#" + id); return; }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };
  const nextTheme = { light: "dark", dark: "system", system: "light" };
  const ThemeIcon = themeIcons[theme];

  return (
    <nav data-testid="main-navbar" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass-strong shadow-lg" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group" data-testid="navbar-logo">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold font-[var(--font-heading)] tracking-tight">FinSites</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {isLanding && ["features", "how-it-works", "pricing", "faq"].map((id) => (
              <button key={id} onClick={() => scrollTo(id)} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors capitalize" data-testid={`nav-${id}`}>
                {id.replace(/-/g, " ")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(nextTheme[theme])} className="p-2 rounded-lg hover:bg-secondary transition-colors" data-testid="theme-toggle" aria-label="Toggle theme">
              <ThemeIcon className="w-4 h-4" />
            </button>
            <Link to="/audit">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" data-testid="nav-free-audit">Free Audit</Button>
            </Link>
            <Link to="/plans">
              <Button size="sm" className="hidden sm:inline-flex font-semibold" data-testid="nav-get-started">Get Started</Button>
            </Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2" data-testid="mobile-menu-toggle">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden glass-strong border-t border-border" data-testid="mobile-menu">
          <div className="px-4 py-3 space-y-1">
            {isLanding && ["features", "how-it-works", "pricing", "faq"].map((id) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground capitalize">{id.replace(/-/g, " ")}</button>
            ))}
            <Link to="/audit" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-primary">Free Audit</Link>
            <Link to="/plans" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
