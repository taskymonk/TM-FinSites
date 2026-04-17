import Link from "next/link"
import { Shield } from "lucide-react"

export function Footer() {
  return (
    <footer data-testid="main-footer" className="border-t border-slate-800 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
              <span className="text-lg font-bold text-white">FinSites</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">Compliant, modern websites for India&apos;s financial professionals.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white mb-4">Solutions</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/solutions/mfd" className="hover:text-white transition-colors">Mutual Fund Distributor</Link></li>
              <li><Link href="/solutions/insurance" className="hover:text-white transition-colors">Insurance</Link></li>
              <li><Link href="/solutions/ria" className="hover:text-white transition-colors">Investment Adviser</Link></li>
              <li><Link href="/solutions/pms" className="hover:text-white transition-colors">Portfolio Management</Link></li>
              <li><Link href="/solutions/stock-broker" className="hover:text-white transition-colors">Stock Broker</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/audit" className="hover:text-white transition-colors">Free Audit</Link></li>
              <li><Link href="/plans" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/onboarding" className="hover:text-white transition-colors">Get Started</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/setup" className="hover:text-white transition-colors">Setup</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span></li>
              <li><span className="cursor-pointer hover:text-white transition-colors">Terms of Service</span></li>
              <li><span className="cursor-pointer hover:text-white transition-colors">Disclaimer</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} FinSites. Made for India&apos;s Financial Professionals.</p>
          <p className="text-xs text-slate-500">SEBI &middot; AMFI &middot; IRDAI &middot; PFRDA Compliance</p>
        </div>
      </div>
    </footer>
  )
}
