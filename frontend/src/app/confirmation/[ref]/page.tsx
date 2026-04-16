"use client"
import { use } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, ArrowRight, Copy } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

export default function ConfirmationPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params)

  return (
    <div className="min-h-screen" data-testid="confirmation-page">
      <Navbar />
      <div className="pt-20 pb-16 flex items-center justify-center min-h-[80vh]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto px-4 text-center">
          <Card className="glass">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2" data-testid="confirmation-title">Submission Received!</h1>
              <p className="text-muted-foreground text-sm mb-6">Your website request has been submitted. Our team will review your details and get back to you shortly.</p>

              <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 mb-6">
                <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-mono font-bold text-primary" data-testid="ref-number">{ref}</span>
                  <button onClick={() => { navigator.clipboard.writeText(ref); toast.success("Copied!") }} className="p-1 hover:bg-secondary rounded" data-testid="copy-ref">
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="text-left space-y-3 mb-6">
                <h3 className="text-sm font-medium">What happens next?</h3>
                {["Our team reviews your submission (1-2 business days)", "We prepare a design mockup based on your preferences", "You review and approve the design", "We build and deploy your compliant website"].map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/" className="flex-1"><Button variant="outline" className="w-full gap-1.5 text-sm">Back to Home</Button></Link>
                <Link href="/audit" className="flex-1"><Button className="w-full gap-1.5 text-sm">Run Another Audit <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}
