import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string | null;
  onboardingComplete: number | null;
  healthGoal: string | null;
  doshaType: string | null;
};

export default function SuperAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [q, setQ] = useState("");
  const [onboarding, setOnboarding] = useState("");
  const [hasAssessment, setHasAssessment] = useState("");
  const [goalType, setGoalType] = useState("");
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [foodForm, setFoodForm] = useState({
    name: "",
    category: "",
    vata: "neutral",
    pitta: "neutral",
    kapha: "neutral",
    temperature: "warm",
    weight: "light",
    tags: "",
    seasonalRules: "",
  });
  const [ruleForm, setRuleForm] = useState({
    name: "",
    conditions: "{}",
    recommendations: "{}",
    priority: "1",
    weight: "1",
  });
  const [datasetType, setDatasetType] = useState("food");
  const [datasetName, setDatasetName] = useState("");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [overridePayload, setOverridePayload] = useState("{}");
  const [notificationForm, setNotificationForm] = useState({ userId: "", title: "", message: "", type: "info" });

  const { data: me, refetch: refetchMe } = useQuery({
    queryKey: ["/api/superadmin/me"],
    retry: false,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/me");
      if (!r.ok) throw new Error("Unauthorized");
      return r.json();
    },
  });

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (onboarding) p.set("onboardingComplete", onboarding);
    if (hasAssessment) p.set("hasAssessment", hasAssessment);
    if (goalType) p.set("goalType", goalType);
    return p.toString();
  }, [q, onboarding, hasAssessment, goalType]);

  const { data: stats } = useQuery({
    queryKey: ["/api/superadmin/stats", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/stats");
      if (!r.ok) throw new Error("Failed to load stats");
      return r.json();
    },
  });

  const { data: users = [], refetch: refetchUsers, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/superadmin/users", filterParams, me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch(`/api/superadmin/users${filterParams ? `?${filterParams}` : ""}`);
      if (!r.ok) throw new Error("Failed to load users");
      return r.json();
    },
  });
  const { data: feedbackAnalytics } = useQuery({
    queryKey: ["/api/superadmin/feedback-analytics", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/feedback-analytics");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: feedbackItems = [] } = useQuery<any[]>({
    queryKey: ["/api/superadmin/feedback", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/feedback");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: dietPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/superadmin/diet-plans", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/diet-plans");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: foods = [], refetch: refetchFoods } = useQuery<any[]>({
    queryKey: ["/api/superadmin/foods", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/foods");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: rules = [], refetch: refetchRules } = useQuery<any[]>({
    queryKey: ["/api/superadmin/rules", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/rules");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: datasets = [], refetch: refetchDatasets } = useQuery<any[]>({
    queryKey: ["/api/superadmin/datasets", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/datasets");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: nlpQueries = [], refetch: refetchNlpQueries } = useQuery<any[]>({
    queryKey: ["/api/superadmin/nlp-queries", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/nlp-queries");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: apiUsage } = useQuery({
    queryKey: ["/api/superadmin/api-usage", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/api-usage");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: systemControls, refetch: refetchSystemControls } = useQuery<any>({
    queryKey: ["/api/superadmin/system-controls", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/system-controls");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: configItems = [], refetch: refetchConfigItems } = useQuery<any[]>({
    queryKey: ["/api/superadmin/config", me?.username],
    enabled: !!me?.username,
    queryFn: async () => {
      const r = await fetch("/api/superadmin/config");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  async function loginSuperAdmin() {
    const r = await fetch("/api/superadmin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) {
      toast({ title: "Login failed", description: "Invalid credentials", variant: "destructive" });
      return;
    }
    await refetchMe();
    toast({ title: "Logged in", description: "Welcome to superadmin dashboard." });
  }

  async function logoutSuperAdmin() {
    await fetch("/api/superadmin/logout", { method: "POST" });
    queryClient.removeQueries({ queryKey: ["/api/superadmin/me"] });
    window.location.reload();
  }

  async function createUser() {
    const r = await fetch("/api/superadmin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (!r.ok) {
      toast({ title: "Create failed", description: "Please verify fields", variant: "destructive" });
      return;
    }
    setNewUser({ firstName: "", lastName: "", email: "", password: "" });
    await refetchUsers();
    toast({ title: "User created" });
  }

  async function deleteUser(id: string) {
    const ok = window.confirm("Delete this user and related records?");
    if (!ok) return;
    const r = await fetch(`/api/superadmin/users/${id}`, { method: "DELETE" });
    if (!r.ok) {
      toast({ title: "Delete failed", variant: "destructive" });
      return;
    }
    await refetchUsers();
    toast({ title: "User deleted" });
  }

  async function editUser(u: AdminUser) {
    const firstName = window.prompt("First name", u.firstName || "") ?? "";
    const lastName = window.prompt("Last name", u.lastName || "") ?? "";
    const email = window.prompt("Email", u.email || "") ?? "";
    const password = window.prompt("New password (leave blank to keep unchanged)", "") ?? "";

    const payload: any = { firstName, lastName, email };
    if (password.trim()) payload.password = password;

    const r = await fetch(`/api/superadmin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      toast({ title: "Update failed", variant: "destructive" });
      return;
    }
    await refetchUsers();
    toast({ title: "User updated" });
  }

  async function toggleUserActive(userId: string, active: boolean) {
    const r = await fetch(`/api/superadmin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!r.ok) return toast({ title: "Status update failed", variant: "destructive" });
    await refetchUsers();
  }

  async function createFood() {
    let seasonalRules: any = {};
    try {
      seasonalRules = foodForm.seasonalRules ? JSON.parse(foodForm.seasonalRules) : {};
    } catch {
      return toast({ title: "Invalid seasonal rules JSON", variant: "destructive" });
    }
    const payload = {
      name: foodForm.name,
      category: foodForm.category,
      doshaEffect: { vata: foodForm.vata, pitta: foodForm.pitta, kapha: foodForm.kapha },
      properties: { temperature: foodForm.temperature, weight: foodForm.weight },
      tags: foodForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
      seasonalRules,
    };
    const r = await fetch("/api/superadmin/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return toast({ title: "Failed to add food", variant: "destructive" });
    setFoodForm({ name: "", category: "", vata: "neutral", pitta: "neutral", kapha: "neutral", temperature: "warm", weight: "light", tags: "", seasonalRules: "" });
    await refetchFoods();
  }

  async function deleteFood(id: string) {
    const r = await fetch(`/api/superadmin/foods/${id}`, { method: "DELETE" });
    if (!r.ok) return toast({ title: "Failed to delete food", variant: "destructive" });
    await refetchFoods();
  }

  async function createRule() {
    let conditions: any;
    let recommendations: any;
    try {
      conditions = JSON.parse(ruleForm.conditions);
      recommendations = JSON.parse(ruleForm.recommendations);
    } catch {
      return toast({ title: "Invalid rule JSON", variant: "destructive" });
    }
    const r = await fetch("/api/superadmin/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: ruleForm.name,
        conditions,
        recommendations,
        priority: Number(ruleForm.priority),
        weight: Number(ruleForm.weight),
        enabled: true,
      }),
    });
    if (!r.ok) return toast({ title: "Rule creation failed", variant: "destructive" });
    setRuleForm({ name: "", conditions: "{}", recommendations: "{}", priority: "1", weight: "1" });
    await refetchRules();
  }

  async function toggleRule(ruleId: string, enabled: boolean) {
    const r = await fetch(`/api/superadmin/rules/${ruleId}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!r.ok) return toast({ title: "Rule update failed", variant: "destructive" });
    await refetchRules();
  }

  async function uploadDataset() {
    if (!datasetFile) return toast({ title: "Choose file first", variant: "destructive" });
    const fd = new FormData();
    fd.append("name", datasetName || "dataset");
    fd.append("type", datasetType);
    fd.append("file", datasetFile);
    const r = await fetch("/api/superadmin/datasets/upload", {
      method: "POST",
      body: fd,
    });
    if (!r.ok) return toast({ title: "Upload failed", variant: "destructive" });
    setDatasetFile(null);
    await refetchDatasets();
  }

  async function overridePlan(id: string) {
    let payload: any;
    try {
      payload = JSON.parse(overridePayload);
    } catch {
      return toast({ title: "Invalid override JSON", variant: "destructive" });
    }
    const r = await fetch(`/api/superadmin/diet-plans/${id}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (!r.ok) return toast({ title: "Override failed", variant: "destructive" });
    await queryClient.invalidateQueries({ queryKey: ["/api/superadmin/diet-plans"] });
  }

  async function markRetrain(id: string) {
    const r = await fetch(`/api/superadmin/nlp-queries/${id}/retrain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "needs_retrain" }),
    });
    if (!r.ok) return toast({ title: "Failed to mark", variant: "destructive" });
    await refetchNlpQueries();
  }

  async function updateSystemControls(next: any) {
    const r = await fetch("/api/superadmin/system-controls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!r.ok) return toast({ title: "Failed to update controls", variant: "destructive" });
    await refetchSystemControls();
  }

  async function sendNotification() {
    const r = await fetch("/api/superadmin/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationForm),
    });
    if (!r.ok) return toast({ title: "Notification failed", variant: "destructive" });
    toast({ title: "Notification queued" });
  }

  async function saveConfig(key: string, valueText: string) {
    let value: any;
    try {
      value = JSON.parse(valueText);
    } catch {
      value = valueText;
    }
    const r = await fetch(`/api/superadmin/config/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!r.ok) return toast({ title: "Config update failed", variant: "destructive" });
    await refetchConfigItems();
  }

  function downloadReport(format: "csv" | "json") {
    window.open(`/api/superadmin/reports/generate?format=${format}`, "_blank");
  }

  if (!me?.username) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Superadmin Login</CardTitle>
            <CardDescription>Authorized access only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" onClick={loginSuperAdmin}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Superadmin Dashboard</h1>
        <Button variant="outline" onClick={logoutSuperAdmin}>Logout</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Users</div><div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Active Users</div><div className="text-2xl font-bold">{stats?.activeUsers ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Onboarded</div><div className="text-2xl font-bold">{stats?.onboardedUsers ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">With Assessment</div><div className="text-2xl font-bold">{stats?.usersWithAssessment ?? 0}</div></CardContent></Card>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Feedback Count</div><div className="text-2xl font-bold">{feedbackAnalytics?.total ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Average Rating</div><div className="text-2xl font-bold">{Number(feedbackAnalytics?.avgRating ?? 0).toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Suspicious Flags</div><div className="text-2xl font-bold text-red-600">{feedbackAnalytics?.suspicious ?? 0}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="foods">Knowledge Base</TabsTrigger>
          <TabsTrigger value="rules">Rule Engine</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="plans">Diet Plans</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="nlp">NLP Monitor</TabsTrigger>
          <TabsTrigger value="system">System Control</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>User Filters</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-3">
              <Input placeholder="Search name/email" value={q} onChange={(e) => setQ(e.target.value)} />
              <Input placeholder="Goal type" value={goalType} onChange={(e) => setGoalType(e.target.value)} />
              <Input placeholder="Onboarding true/false" value={onboarding} onChange={(e) => setOnboarding(e.target.value)} />
              <Input placeholder="Has assessment true/false" value={hasAssessment} onChange={(e) => setHasAssessment(e.target.value)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Create User</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-3">
              <Input placeholder="First name" value={newUser.firstName} onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))} />
              <Input placeholder="Last name" value={newUser.lastName} onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))} />
              <Input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
              <Input placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
              <Button className="md:col-span-4" onClick={createUser}>Create User</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Users</CardTitle><CardDescription>{usersLoading ? "Loading..." : `${users.length} users found`}</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="p-3 border rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{u.firstName} {u.lastName}</div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">Onboarding: {u.onboardingComplete ? "Yes" : "No"}</Badge>
                      <Badge variant="outline">Goal: {u.healthGoal || "N/A"}</Badge>
                      <Badge variant="outline">Dosha: {u.doshaType || "N/A"}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => toggleUserActive(u.id, !u.onboardingComplete)}>{u.onboardingComplete ? "Deactivate" : "Activate"}</Button>
                    <Button variant="outline" onClick={() => editUser(u)}>Edit</Button>
                    <Button variant="destructive" onClick={() => deleteUser(u.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="foods" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Food</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <Input placeholder="Name" value={foodForm.name} onChange={(e) => setFoodForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Category" value={foodForm.category} onChange={(e) => setFoodForm((p) => ({ ...p, category: e.target.value }))} />
              <Input placeholder="Tags (comma separated)" value={foodForm.tags} onChange={(e) => setFoodForm((p) => ({ ...p, tags: e.target.value }))} />
              <Input placeholder="Vata effect" value={foodForm.vata} onChange={(e) => setFoodForm((p) => ({ ...p, vata: e.target.value }))} />
              <Input placeholder="Pitta effect" value={foodForm.pitta} onChange={(e) => setFoodForm((p) => ({ ...p, pitta: e.target.value }))} />
              <Input placeholder="Kapha effect" value={foodForm.kapha} onChange={(e) => setFoodForm((p) => ({ ...p, kapha: e.target.value }))} />
              <Input placeholder="Temperature property" value={foodForm.temperature} onChange={(e) => setFoodForm((p) => ({ ...p, temperature: e.target.value }))} />
              <Input placeholder="Weight property" value={foodForm.weight} onChange={(e) => setFoodForm((p) => ({ ...p, weight: e.target.value }))} />
              <Input placeholder='Seasonal rules JSON e.g. {"winter":"favour"}' value={foodForm.seasonalRules} onChange={(e) => setFoodForm((p) => ({ ...p, seasonalRules: e.target.value }))} />
              <Button className="md:col-span-3" onClick={createFood}>Add Food</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Food List</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {foods.map((f) => (
                <div key={f.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>{f.name} <span className="text-muted-foreground text-sm">({f.category})</span></div>
                  <Button variant="destructive" onClick={() => deleteFood(f.id)}>Delete</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Dynamic Rule</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              <Input placeholder="Rule Name" value={ruleForm.name} onChange={(e) => setRuleForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Priority" value={ruleForm.priority} onChange={(e) => setRuleForm((p) => ({ ...p, priority: e.target.value }))} />
              <Textarea placeholder='Conditions JSON e.g. {"dosha":"vata"}' value={ruleForm.conditions} onChange={(e) => setRuleForm((p) => ({ ...p, conditions: e.target.value }))} />
              <Textarea placeholder='Recommendations JSON e.g. {"foods":["ghee"]}' value={ruleForm.recommendations} onChange={(e) => setRuleForm((p) => ({ ...p, recommendations: e.target.value }))} />
              <Input placeholder="Weight" value={ruleForm.weight} onChange={(e) => setRuleForm((p) => ({ ...p, weight: e.target.value }))} />
              <Button onClick={createRule}>Create Rule</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Rules</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="p-2 border rounded flex items-center justify-between">
                  <div className="text-sm">{r.name} | priority {r.priority} | weight {r.weight}</div>
                  <Button variant="outline" onClick={() => toggleRule(r.id, !r.enabled)}>
                    {r.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              ))}
              {rules.length === 0 && <div className="text-sm text-muted-foreground">No rules yet.</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datasets" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Upload Dataset</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-3">
              <Input placeholder="Dataset name" value={datasetName} onChange={(e) => setDatasetName(e.target.value)} />
              <Input placeholder="Type food/dosha" value={datasetType} onChange={(e) => setDatasetType(e.target.value)} />
              <Input type="file" accept=".csv,.json" onChange={(e) => setDatasetFile(e.target.files?.[0] || null)} />
              <Button onClick={uploadDataset}>Upload</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Dataset Versions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {datasets.map((d) => (
                <div key={d.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>{d.name} v{d.version} ({d.type})</div>
                  <Badge variant="outline">{d.schemaValid ? "valid" : "invalid"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Suspicious Plans Alert Queue</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {dietPlans.filter((d) => d.isFlagged).map((d) => (
                <div key={d.id} className="p-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20">
                  <div className="text-sm font-medium">Flagged Plan: {d.id}</div>
                  <div className="text-xs text-muted-foreground">User: {d.userId}</div>
                </div>
              ))}
              {dietPlans.filter((d) => d.isFlagged).length === 0 && <div className="text-sm text-muted-foreground">No flagged plans.</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Override Diet Plan</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={overridePayload} onChange={(e) => setOverridePayload(e.target.value)} />
              <div className="space-y-2">
                {dietPlans.slice(0, 20).map((d) => (
                  <div key={d.id} className="p-2 border rounded flex items-center justify-between">
                    <div className="text-sm">{d.id} ({d.source})</div>
                    <Button variant="outline" onClick={() => overridePlan(d.id)}>Override</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardHeader><CardTitle>Feedback Stream</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {feedbackItems.map((f) => (
                <div key={f.id} className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">Plan: {f.dietPlanId || "N/A"} | Rating: {f.rating}/5</div>
                  <div className="text-sm">{f.comments || "No comments"}</div>
                  <div className="text-xs text-muted-foreground">{f.isSuspicious ? "Suspicious flagged" : "Normal feedback"}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nlp">
          <Card>
            <CardHeader><CardTitle>NLP / Chat Monitoring</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {nlpQueries.map((qItem) => (
                <div key={qItem.id} className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">{qItem.query}</div>
                  <div className="text-xs text-muted-foreground mb-2">{qItem.response?.slice(0, 120)}...</div>
                  <Button variant="outline" onClick={() => markRetrain(qItem.id)}>Mark Retrain</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader><CardTitle>API & System Control</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>API Query Count: <strong>{apiUsage?.queriesCount ?? 0}</strong></div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => updateSystemControls({ ruleEngineEnabled: !systemControls?.ruleEngineEnabled })}>
                  Rule Engine: {systemControls?.ruleEngineEnabled ? "On" : "Off"}
                </Button>
                <Button variant="outline" onClick={() => updateSystemControls({ mlModelEnabled: !systemControls?.mlModelEnabled })}>
                  ML Model: {systemControls?.mlModelEnabled ? "On" : "Off"}
                </Button>
                <Button variant="outline" onClick={() => updateSystemControls({ chatModuleEnabled: !systemControls?.chatModuleEnabled })}>
                  Chat: {systemControls?.chatModuleEnabled ? "On" : "Off"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Send Notification</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-3">
              <Input placeholder="User ID" value={notificationForm.userId} onChange={(e) => setNotificationForm((p) => ({ ...p, userId: e.target.value }))} />
              <Input placeholder="Title" value={notificationForm.title} onChange={(e) => setNotificationForm((p) => ({ ...p, title: e.target.value }))} />
              <Input placeholder="Type" value={notificationForm.type} onChange={(e) => setNotificationForm((p) => ({ ...p, type: e.target.value }))} />
              <Input placeholder="Message" value={notificationForm.message} onChange={(e) => setNotificationForm((p) => ({ ...p, message: e.target.value }))} />
              <Button className="md:col-span-4" onClick={sendNotification}>Send</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader><CardTitle>Reports & Export</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => downloadReport("json")}>Generate JSON Report</Button>
              <Button variant="outline" onClick={() => downloadReport("csv")}>Download CSV Report</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle>Configuration Panel</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {configItems.map((c) => (
                <ConfigRow key={c.id} item={c} onSave={saveConfig} />
              ))}
              {configItems.length === 0 && <div className="text-sm text-muted-foreground">No config keys yet. Create one via API first.</div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigRow({ item, onSave }: { item: any; onSave: (key: string, valueText: string) => void }) {
  const [valueText, setValueText] = useState(JSON.stringify(item.value));
  return (
    <div className="p-3 border rounded-lg flex items-center gap-2">
      <div className="w-52 text-sm font-medium">{item.key}</div>
      <Input value={valueText} onChange={(e) => setValueText(e.target.value)} />
      <Button variant="outline" onClick={() => onSave(item.key, valueText)}>Save</Button>
    </div>
  );
}
