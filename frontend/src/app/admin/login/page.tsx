"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Loader2, AlertTriangle } from "lucide-react"
import { adminLogin } from "@/lib/admin-actions"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const result = await adminLogin(email, password)
    setLoading(false)
    if ("error" in result) {
      setError(result.error || "Login failed")
    } else {
      router.push("/admin/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4" data-testid="admin-login-page">
      <Card className="glass w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Admin Login</CardTitle>
          <p className="text-xs text-slate-400">FinSites Administration Panel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-center gap-2" data-testid="login-error">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="admin@finsites.in" className="bg-slate-900" required data-testid="admin-email" />
            </div>
            <div>
              <Label className="text-xs">Password</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Enter password" className="bg-slate-900" required data-testid="admin-password" />
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={loading} data-testid="admin-login-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
