import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Palette, Smartphone, Monitor, Sparkles, Minus, Plus } from "lucide-react";

const STYLES = [
  { id: "modern_minimal", name: "Modern Minimal", desc: "Clean, lots of whitespace, elegant typography", color: "from-slate-400 to-gray-300" },
  { id: "professional_corporate", name: "Professional Corporate", desc: "Trust-inspiring, structured, navy/dark tones", color: "from-blue-700 to-indigo-600" },
  { id: "warm_approachable", name: "Warm & Approachable", desc: "Friendly, rounded elements, inviting colors", color: "from-amber-400 to-orange-400" },
  { id: "bold_dynamic", name: "Bold & Dynamic", desc: "Strong typography, vibrant accents, energetic", color: "from-red-500 to-pink-500" },
  { id: "luxury_premium", name: "Luxury Premium", desc: "Dark backgrounds, gold/copper accents, refined", color: "from-yellow-600 to-amber-700" },
];

const ANIMATIONS = [
  { id: "subtle", name: "Subtle", desc: "Gentle fade-ins, clean transitions", icon: Minus },
  { id: "moderate", name: "Moderate", desc: "Scroll reveals, hover effects, smooth transitions", icon: Sparkles },
  { id: "rich", name: "Rich", desc: "Parallax, counters, animated backgrounds, micro-interactions", icon: Plus },
];

export default function Step4Design({ data, onChange }) {
  const update = (field, value) => onChange({ [field]: value });

  return (
    <div data-testid="wizard-step-4" className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2 font-[var(--font-heading)]">Design Preferences</h2>
        <p className="text-sm text-muted-foreground">Choose the look and feel of your website.</p>
      </div>

      {/* Design Style */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2 font-[var(--font-heading)]"><Palette className="w-4 h-4 text-[hsl(var(--primary))]" /> Design Style</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {STYLES.map(s => (
            <button key={s.id} onClick={() => update("design_style", s.id)} data-testid={`style-${s.id}`}
              className={`text-left p-4 rounded-xl border-2 transition-all ${data.design_style === s.id ? "border-[hsl(var(--primary))] glow-primary" : "border-border hover:border-[hsl(var(--primary)/0.3)]"}`}>
              <div className={`w-full h-2 rounded-full bg-gradient-to-r ${s.color} mb-3`} />
              <p className="font-semibold text-sm font-[var(--font-heading)]">{s.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Color Preference */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Color Preference</h3>
        <div className="flex gap-3 mb-4">
          <button onClick={() => update("has_brand_colors", true)} className={`px-4 py-2 rounded-lg text-sm border transition-all ${data.has_brand_colors ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]" : "border-border"}`} data-testid="color-custom">I have brand colors</button>
          <button onClick={() => update("has_brand_colors", false)} className={`px-4 py-2 rounded-lg text-sm border transition-all ${data.has_brand_colors === false ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]" : "border-border"}`} data-testid="color-suggest">Suggest for me</button>
        </div>
        {data.has_brand_colors && (
          <div className="grid grid-cols-3 gap-4">
            <div><Label className="text-xs mb-1.5 block">Primary Color</Label><div className="flex gap-2"><input type="color" value={data.color_primary || "#0055FF"} onChange={e => update("color_primary", e.target.value)} className="w-10 h-10 rounded cursor-pointer" /><Input value={data.color_primary || "#0055FF"} onChange={e => update("color_primary", e.target.value)} className="flex-1 font-mono text-xs" data-testid="color-primary-input" /></div></div>
            <div><Label className="text-xs mb-1.5 block">Secondary Color</Label><div className="flex gap-2"><input type="color" value={data.color_secondary || "#1E293B"} onChange={e => update("color_secondary", e.target.value)} className="w-10 h-10 rounded cursor-pointer" /><Input value={data.color_secondary || "#1E293B"} onChange={e => update("color_secondary", e.target.value)} className="flex-1 font-mono text-xs" data-testid="color-secondary-input" /></div></div>
            <div><Label className="text-xs mb-1.5 block">Accent Color</Label><div className="flex gap-2"><input type="color" value={data.color_accent || "#00E676"} onChange={e => update("color_accent", e.target.value)} className="w-10 h-10 rounded cursor-pointer" /><Input value={data.color_accent || "#00E676"} onChange={e => update("color_accent", e.target.value)} className="flex-1 font-mono text-xs" data-testid="color-accent-input" /></div></div>
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Design Priority</h3>
        <div className="flex gap-3">
          <button onClick={() => update("priority", "mobile")} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${data.priority === "mobile" ? "border-[hsl(var(--primary))] glow-primary" : "border-border"}`} data-testid="priority-mobile">
            <Smartphone className="w-5 h-5" /><div className="text-left"><p className="font-semibold text-sm">Mobile-First</p><p className="text-xs text-muted-foreground">Most visitors on phone</p></div>
          </button>
          <button onClick={() => update("priority", "desktop")} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${data.priority === "desktop" ? "border-[hsl(var(--primary))] glow-primary" : "border-border"}`} data-testid="priority-desktop">
            <Monitor className="w-5 h-5" /><div className="text-left"><p className="font-semibold text-sm">Desktop-First</p><p className="text-xs text-muted-foreground">Most visitors on laptop</p></div>
          </button>
        </div>
      </div>

      {/* Animation Level */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Animation Level</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {ANIMATIONS.map(a => (
            <button key={a.id} onClick={() => update("animation_level", a.id)} data-testid={`animation-${a.id}`}
              className={`p-4 rounded-xl border-2 text-center transition-all ${data.animation_level === a.id ? "border-[hsl(var(--primary))] glow-primary" : "border-border"}`}>
              <a.icon className="w-5 h-5 mx-auto mb-2 text-[hsl(var(--primary))]" />
              <p className="font-semibold text-sm">{a.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
