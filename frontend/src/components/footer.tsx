import Link from "next/link"
import { Shield } from "lucide-react"

export function Footer() {
  return (
    <footer data-testid="main-footer" className="border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
              <span className="text-lg font-bold">FinSites</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">Compliant, modern websites for India&apos;s financial professionals. SEBI, AMFI &amp; IRDAI regulations built right in.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/audit" className="hover:text-foreground transition-colors">Free Audit</Link></li>
              <li><Link href="/plans" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/plans" className="hover:text-foreground transition-colors">Get Started</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="/#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/admin/login" className="hover:text-foreground transition-colors">Admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span></li>
              <li><span className="cursor-pointer hover:text-foreground transition-colors">Terms of Service</span></li>
              <li><span className="cursor-pointer hover:text-foreground transition-colors">Disclaimer</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} FinSites. Made for India&apos;s Financial Professionals.</p>
          <p className="text-xs text-muted-foreground">SEBI &middot; AMFI &middot; IRDAI Compliance</p>
        </div>
      </div>
    </footer>
  )
}
