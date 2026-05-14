import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, MessageSquare, Leaf, BarChart3,
  ChevronDown, ChevronUp, Trash2, Plus,
  ArrowLeft, Search, ShieldAlert, CheckCircle, XCircle,
  Download, Star, Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { healthGoals } from "@shared/schema";

type Tab = "stats" | "users" | "feedback" | "conversations" | "foods";


// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: any; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Stats tab ──────────────────────────────────────────────────────────────
function StatsTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/admin/stats"] });
  if (isLoading) return <Spinner />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard label="Total Users" value={data?.totalUsers ?? 0} icon={Users} color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
      <StatCard label="Quiz Completions" value={data?.quizCompleted ?? 0} icon={BarChart3} color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400" />
      <StatCard label="Wellness Check-ins" value={data?.wellnessCheckins ?? 0} icon={Leaf} color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" />
      <StatCard label="AI Conversations" value={data?.totalConversations ?? 0} icon={MessageSquare} color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" />
    </div>
  );
}

// ── Users tab ──────────────────────────────────────────────────────────────
function UsersTab() {
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const { data: users = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });

  const filtered = users.filter(u =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  // Use fetch so session cookie is included — window.open doesn't send credentials
  const exportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/users/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nivarana-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email…" className="flex-1" />
        <Button
          size="sm" variant="outline" onClick={exportCSV} disabled={exporting}
          className="gap-2 shrink-0 border-emerald-400/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
          data-testid="button-export-csv"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Dosha</th>
                <th className="px-4 py-3 text-left font-medium">Health Goal</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3 text-left font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {u.firstName || u.lastName
                      ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                      : <span className="text-muted-foreground italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.primaryDosha
                      ? <DoshaBadge dosha={u.primaryDosha} />
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.healthGoal
                      ? healthGoals[u.healthGoal as keyof typeof healthGoals] ?? u.healthGoal
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(u.lastActive)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          {filtered.length} of {users.length} users
        </div>
      </Card>
    </div>
  );
}

// ── Feedback tab (Wellness check-ins across all users) ─────────────────────
const MARKERS = ["energy", "digestion", "sleep", "mood", "mentalClarity", "skinHealth", "immunity", "calmness"] as const;
const MARKER_LABELS: Record<string, string> = {
  energy: "Energy", digestion: "Digestion", sleep: "Sleep", mood: "Mood",
  mentalClarity: "Mental Clarity", skinHealth: "Skin Health", immunity: "Immunity", calmness: "Calmness",
};

function ScoreDot({ val }: { val: number }) {
  const color = val >= 4 ? "bg-emerald-500" : val === 3 ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ${color}`}>{val}</span>;
}

function FeedbackTab() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  // Filter to show only entries with notes first (most actionable for admin)
  const [notesOnly, setNotesOnly] = useState(false);

  const { data: checkins = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/feedback"],
    retry: false,
  });

  const filtered = checkins.filter(c => {
    const matchSearch =
      !search ||
      c.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      c.userName?.toLowerCase().includes(search.toLowerCase()) ||
      c.notes?.toLowerCase().includes(search.toLowerCase());
    const matchNotes = !notesOnly || !!c.notes;
    return matchSearch && matchNotes;
  });

  const withNotes = checkins.filter(c => !!c.notes).length;

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email or note content…" className="flex-1" />
        {/* Quick filter — only show entries with notes/observations */}
        <button
          onClick={() => setNotesOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${notesOnly
              ? "bg-amber-500/10 border-amber-400/40 text-amber-700 dark:text-amber-400"
              : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
        >
          📝 With notes ({withNotes})
        </button>
      </div>

      {filtered.length === 0 && <EmptyState text="No wellness check-ins found" />}

      <div className="space-y-2">
        {filtered.map((c) => (
          <Card key={c.id} className={`overflow-hidden ${c.notes ? "ring-1 ring-amber-400/30" : ""
            }`}>
            <button
              className="w-full px-5 py-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{c.userName || c.userEmail}</p>
                  {c.userName && <p className="text-xs text-muted-foreground">{c.userEmail}</p>}
                  <Badge variant="outline" className="text-[10px]">Check-in #{c.checkinNumber}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${c.overallScore >= 32 ? "border-emerald-400 text-emerald-600" :
                      c.overallScore >= 24 ? "border-amber-400 text-amber-600" :
                        "border-red-400 text-red-500"
                    }`}>
                    Score {c.overallScore}/40
                  </Badge>
                  {/* 📝 badge — visible without expanding so admin sees it immediately */}
                  {c.notes && (
                    <Badge className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-400/30">
                      📝 Note
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(c.createdAt)}</p>
                {/* Show note preview even when collapsed */}
                {c.notes && expanded !== c.id && (
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1.5 italic line-clamp-1">
                    “{c.notes}”
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Activity className="w-4 h-4 text-muted-foreground" />
                {expanded === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {expanded === c.id && (
              <div className="border-t px-5 py-4 space-y-4">
                {/* Wellness marker scores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MARKERS.map(m => (
                    <div key={m} className="flex items-center gap-2">
                      <ScoreDot val={c[m]} />
                      <span className="text-xs text-muted-foreground">{MARKER_LABELS[m]}</span>
                    </div>
                  ))}
                </div>

                {/* User's observation / note — prominent box */}
                {c.notes ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                      📝 User Observation
                    </p>
                    <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                      {c.notes}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No additional notes from user.</p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}


// ── Conversations tab ──────────────────────────────────────────────────────
function ConversationsTab() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: convs = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/conversations"] });

  const filtered = convs.filter(c =>
    !search ||
    c.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search by email or topic…" />
      {filtered.length === 0 && <EmptyState text="No conversations found" />}
      <div className="space-y-2">
        {filtered.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <button
              className="w-full px-5 py-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.userName ? `${c.userName} · ` : ""}{c.userEmail} · {c.messages?.length ?? 0} messages · {fmtDate(c.createdAt)}
                </p>
              </div>
              {expanded === c.id
                ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
            </button>
            {expanded === c.id && (
              <ScrollArea className="max-h-72 border-t">
                <div className="p-4 space-y-3">
                  {c.messages?.map((m: any) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                        <p className="text-[10px] opacity-60 mb-1 font-medium uppercase tracking-wide">{m.role}</p>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Food Manager tab ───────────────────────────────────────────────────────
const DOSHA_EFFECTS = ["favourable", "neutral", "unfavourable"] as const;
const HEALTH_GOALS_KEYS = [
  "heart_health", "gut_health", "inflammation", "liver_function",
  "immunity", "diabetes", "skin_hair", "weight_management", "sleep", "energy",
];

function FoodsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "",
    vata: "neutral" as typeof DOSHA_EFFECTS[number],
    pitta: "neutral" as typeof DOSHA_EFFECTS[number],
    kapha: "neutral" as typeof DOSHA_EFFECTS[number],
    // Health goal effects (default neutral, editable)
    heart_health: "neutral" as typeof DOSHA_EFFECTS[number],
    gut_health: "neutral" as typeof DOSHA_EFFECTS[number],
    inflammation: "neutral" as typeof DOSHA_EFFECTS[number],
    liver_function: "neutral" as typeof DOSHA_EFFECTS[number],
    immunity: "neutral" as typeof DOSHA_EFFECTS[number],
    diabetes: "neutral" as typeof DOSHA_EFFECTS[number],
    skin_hair: "neutral" as typeof DOSHA_EFFECTS[number],
    weight_management: "neutral" as typeof DOSHA_EFFECTS[number],
    sleep: "neutral" as typeof DOSHA_EFFECTS[number],
    energy: "neutral" as typeof DOSHA_EFFECTS[number],
  });
  const [formError, setFormError] = useState("");

  const { data: foods = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/foods"] });

  const addFood = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        category: form.category.trim().toLowerCase(),
        dosha_effects: { vata: form.vata, pitta: form.pitta, kapha: form.kapha },
        health_goal_effects: {
          heart_health: form.heart_health,
          gut_health: form.gut_health,
          inflammation: form.inflammation,
          liver_function: form.liver_function,
          immunity: form.immunity,
          diabetes: form.diabetes,
          skin_hair: form.skin_hair,
          weight_management: form.weight_management,
          sleep: form.sleep,
          energy: form.energy,
        },
      };

      const res = await fetch("/api/admin/foods", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/foods"] });
      setForm({
        name: "", category: "", vata: "neutral", pitta: "neutral", kapha: "neutral",
        heart_health: "neutral", gut_health: "neutral", inflammation: "neutral",
        liver_function: "neutral", immunity: "neutral", diabetes: "neutral",
        skin_hair: "neutral", weight_management: "neutral", sleep: "neutral", energy: "neutral",
      });
      setShowForm(false); setFormError("");
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const deleteFood = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/admin/foods/${encodeURIComponent(name)}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/foods"] });
      setConfirmDelete(null);
    },
  });

  const categories = Array.from(new Set(foods.map((f: any) => f.category as string))).sort();
  const filtered = foods.filter((f: any) =>
    !search ||
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search foods or category…" className="flex-1" />
        <Button size="sm" onClick={() => { setShowForm(!showForm); setFormError(""); }} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />{showForm ? "Cancel" : "Add Food"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Food</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Food Name *</label>
                <Input placeholder="e.g. Ashwagandha" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Category *</label>
                <Input placeholder="e.g. herbs" list="cat-list" value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
                <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(["vata", "pitta", "kapha"] as const).map(d => (
                <div key={d} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground capitalize">{d} Effect</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form[d]}
                    onChange={e => setForm(p => ({ ...p, [d]: e.target.value as any }))}
                  >
                    {DOSHA_EFFECTS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Health Goal Effects */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Health Goal Effects</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HEALTH_GOALS_KEYS.map(k => (
                  <div key={k} className="space-y-0.5">
                    <label className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, " ")}</label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={(form as any)[k]}
                      onChange={e => setForm(p => ({ ...p, [k]: e.target.value as any }))}
                    >
                      {DOSHA_EFFECTS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addFood.mutate()}
                disabled={!form.name.trim() || !form.category.trim() || addFood.isPending}>
                {addFood.isPending ? "Adding…" : "Add Food"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setFormError(""); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Food</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Vata</th>
                <th className="px-4 py-3 text-left font-medium">Pitta</th>
                <th className="px-4 py-3 text-left font-medium">Kapha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((f: any) => (
                <tr key={f.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{f.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground capitalize">{f.category}</td>
                  {(["vata", "pitta", "kapha"] as const).map(d => (
                    <td key={d} className="px-4 py-2.5">
                      <EffectBadge effect={f.dosha_effects?.[d]} />
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right">
                    {confirmDelete === f.name ? (
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-muted-foreground mr-1">Delete?</span>
                        <Button size="icon" variant="destructive" className="h-6 w-6"
                          onClick={() => deleteFood.mutate(f.name)}>
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={() => setConfirmDelete(null)}>
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDelete(f.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6}><EmptyState text="No foods found" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          {filtered.length} of {foods.length} foods
        </div>
      </Card>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder: string; className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input className="pl-9" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function DoshaBadge({ dosha }: { dosha: string }) {
  const colors: Record<string, string> = {
    vata: "border-sky-400 text-sky-600 dark:text-sky-400",
    pitta: "border-orange-400 text-orange-600 dark:text-orange-400",
    kapha: "border-emerald-400 text-emerald-600 dark:text-emerald-400",
  };
  return <Badge variant="outline" className={`capitalize ${colors[dosha] ?? ""}`}>{dosha}</Badge>;
}

function EffectBadge({ effect }: { effect: string }) {
  const cls =
    effect === "favourable" ? "border-green-400 text-green-600 dark:text-green-400" :
      effect === "unfavourable" ? "border-red-400 text-red-500 dark:text-red-400" : "";
  return <Badge variant="outline" className={`capitalize text-xs ${cls}`}>{effect ?? "—"}</Badge>;
}

function Spinner() {
  return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ── Main Admin page ────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "stats", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "feedback", label: "Feedback", icon: Activity },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "foods", label: "Food Manager", icon: Leaf },
];


export default function Admin() {
  const [tab, setTab] = useState<Tab>("stats");
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  if (!(user as any)?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="p-8 text-center max-w-sm w-full">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You don't have admin access. Set <code className="bg-muted px-1 rounded text-xs">ADMIN_EMAIL</code> in your environment to your email address.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="w-px h-5 bg-border" />
          <span className="font-semibold">Admin Panel</span>
          <Badge variant="outline" className="ml-auto text-xs">{user?.email}</Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab bar */}
        <div className="flex gap-1 bg-background border rounded-xl p-1 w-fit shadow-sm">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "stats" && <StatsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "feedback" && <FeedbackTab />}
        {tab === "conversations" && <ConversationsTab />}
        {tab === "foods" && <FoodsTab />}

      </div>
    </div>
  );
}
