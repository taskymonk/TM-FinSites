import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer data-testid="main-footer" className="border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold font-[var(--font-heading)]">FinSites</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">Compliant, modern websites for India's financial professionals. SEBI, AMFI & IRDAI regulations built right in.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 font-[var(--font-heading)]">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/audit" className="hover:text-foreground transition-colors">Free Audit</Link></li>
              <li><Link to="/plans" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link to="/plans" className="hover:text-foreground transition-colors">Get Started</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 font-[var(--font-heading)]">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              <li><Link to="/admin/login" className="hover:text-foreground transition-colors">Admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 font-[var(--font-heading)]">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Disclaimer</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} FinSites. Made for India's Financial Professionals.</p>
          <p className="text-xs text-muted-foreground">Regulatory compliance for SEBI &middot; AMFI &middot; IRDAI</p>
        </div>
      </div>
    </footer>
  );
}
