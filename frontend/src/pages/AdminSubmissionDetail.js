import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Clock, Loader2, Send, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || '';
const STATUS_LABELS = { submitted: "Submitted", under_review: "Under Review", payment_pending: "Payment Pending", payment_received: "Payment Received", in_production: "In Production", delivered: "Delivered", live: "Live", rejected: "Rejected", abandoned: "Abandoned" };
const ALL_STATUSES = Object.keys(STATUS_LABELS);
const STATUS_COLORS = { submitted: "bg-blue-500", under_review: "bg-yellow-500", payment_pending: "bg-orange-500", payment_received: "bg-green-500", in_production: "bg-purple-500", delivered: "bg-cyan-500", live: "bg-emerald-500", rejected: "bg-red-500", abandoned: "bg-gray-500" };

function DataField({ label, value }) {
  if (!value) return null;
  return <div className="py-1.5"><span className="text-xs text-muted-foreground">{label}</span><p className="text-sm font-medium">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</p></div>;
}

function DataGroup({ title, data }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="glass rounded-xl p-5 mb-4">
      <h4 className="font-semibold text-sm mb-3 font-[var(--font-heading)]">{title}</h4>
      <div className="grid sm:grid-cols-2 gap-x-6">{Object.entries(data).map(([k, v]) => <DataField key={k} label={k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} value={typeof v === "object" ? JSON.stringify(v) : v} />)}</div>
    </div>
  );
}

export default function AdminSubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payNote, setPayNote] = useState("");

  useEffect(() => {
    axios.get(`${API}/api/admin/submissions/${id}`, { withCredentials: true })
      .then(r => { setSub(r.data); setNewStatus(r.data.status); setLoading(false); })
      .catch(() => { toast.error("Not found"); navigate("/admin"); });
  }, [id, navigate]);

  const updateStatus = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/submissions/${id}/status`, { status: newStatus, note: note || null }, { withCredentials: true });
      toast.success("Status updated");
      const { data } = await axios.get(`${API}/api/admin/submissions/${id}`, { withCredentials: true });
      setSub(data);
      setNote("");
    } catch { toast.error("Failed to update"); } finally { setSaving(false); }
  };

  const updatePayment = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/submissions/${id}/payment`, { status: "received", amount: parseFloat(payAmount) || null, method: payMethod, note: payNote || null }, { withCredentials: true });
      toast.success("Payment recorded");
      const { data } = await axios.get(`${API}/api/admin/submissions/${id}`, { withCredentials: true });
      setSub(data);
    } catch { toast.error("Failed to update"); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!sub) return null;

  const s2 = sub.data?.step_2 || {};
  const s3 = sub.data?.step_3 || {};
  const s4 = sub.data?.step_4 || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="glass-strong border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} data-testid="back-to-admin"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <div className="flex-1" />
          <Badge className={`${STATUS_COLORS[sub.status]} text-white`} data-testid="detail-status">{STATUS_LABELS[sub.status]}</Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold font-[var(--font-heading)]" data-testid="detail-client-name">{sub.client_name || "Unnamed"}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="font-mono text-sm text-muted-foreground">{sub.reference_number}</span>
            <Badge variant="secondary">{sub.plan?.tier} plan</Badge>
            {(sub.business_types || []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" data-testid="detail-tabs">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="registration">Registration</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="glass rounded-xl p-5 mb-4">
                  <h4 className="font-semibold text-sm mb-3 font-[var(--font-heading)]">Contact Information</h4>
                  <div className="grid sm:grid-cols-2 gap-x-6">
                    <DataField label="Name" value={sub.client_name} />
                    <DataField label="Email" value={sub.client_email} />
                    <DataField label="Phone" value={sub.client_phone} />
                    <DataField label="Submitted" value={sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : "—"} />
                  </div>
                </div>
                <DataGroup title="General Info" data={s2.group_a} />
              </TabsContent>

              <TabsContent value="registration">
                {s2.group_b && <DataGroup title="MFD Details" data={s2.group_b} />}
                {s2.group_c && <DataGroup title="Insurance Details" data={s2.group_c} />}
                {s2.group_d && <DataGroup title="PMS Details" data={s2.group_d} />}
                {s2.group_e && <DataGroup title="AIF Details" data={s2.group_e} />}
                {s2.group_f && <DataGroup title="SIF Details" data={s2.group_f} />}
                {s2.group_g && <DataGroup title="RIA Details" data={s2.group_g} />}
                {!s2.group_b && !s2.group_c && !s2.group_d && !s2.group_e && !s2.group_f && !s2.group_g && <p className="text-sm text-muted-foreground">No registration details provided</p>}
              </TabsContent>

              <TabsContent value="services">
                <DataGroup title="Services & Content" data={s3} />
              </TabsContent>

              <TabsContent value="design">
                <DataGroup title="Design Preferences" data={s4} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status Update */}
            <div className="glass rounded-xl p-5" data-testid="status-update-panel">
              <h4 className="font-semibold text-sm mb-3 font-[var(--font-heading)]">Update Status</h4>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mb-2" data-testid="status-select"><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)" rows={2} className="mb-2" data-testid="status-note" />
              <Button onClick={updateStatus} disabled={saving} className="w-full gap-2 font-semibold" size="sm" data-testid="update-status-btn">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Update Status
              </Button>
            </div>

            {/* Payment */}
            <div className="glass rounded-xl p-5" data-testid="payment-panel">
              <h4 className="font-semibold text-sm mb-3 font-[var(--font-heading)]">Payment</h4>
              <div className="text-sm mb-3">
                <span className="text-muted-foreground">Status: </span>
                <Badge variant={sub.payment?.status === "received" ? "default" : "secondary"}>{sub.payment?.status || "pending"}</Badge>
                {sub.payment?.amount && <span className="ml-2 font-mono">INR {sub.payment.amount.toLocaleString()}</span>}
              </div>
              {sub.payment?.status !== "received" && (
                <div className="space-y-2">
                  <Input value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount (INR)" type="number" data-testid="pay-amount" />
                  <Input value={payMethod} onChange={e => setPayMethod(e.target.value)} placeholder="Method (UPI, Bank Transfer...)" data-testid="pay-method" />
                  <Input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note" data-testid="pay-note" />
                  <Button onClick={updatePayment} disabled={saving} className="w-full gap-2" size="sm" variant="outline" data-testid="record-payment-btn">
                    <CheckCircle2 className="w-3 h-3" /> Record Payment
                  </Button>
                </div>
              )}
            </div>

            {/* Status History */}
            {sub.status_history?.length > 0 && (
              <div className="glass rounded-xl p-5" data-testid="detail-history">
                <h4 className="font-semibold text-sm mb-3 font-[var(--font-heading)]">History</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {[...sub.status_history].reverse().map((h, i) => (
                    <div key={i} className="text-xs border-b border-border/30 pb-2 last:border-0">
                      <Badge className={`${STATUS_COLORS[h.status] || "bg-gray-500"} text-white text-[10px] mb-1`}>{STATUS_LABELS[h.status] || h.status}</Badge>
                      {h.note && <p className="text-muted-foreground">{h.note}</p>}
                      <p className="text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{new Date(h.at).toLocaleString()} &middot; {h.by}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
