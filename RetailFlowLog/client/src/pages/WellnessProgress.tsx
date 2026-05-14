import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  wellnessMarkers,
  type WellnessMarkerKey,
  type WellnessCheckin,
} from "@shared/schema";
import {
  Leaf,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  HeartPulse,
  Sparkles,
  RotateCw,
  Calendar,
  Brain,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

const markerKeys = Object.keys(wellnessMarkers) as WellnessMarkerKey[];

function ImprovementBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-bold">
        <TrendingUp className="w-3 h-3" />+{delta}
      </div>
    );
  }
  if (delta < 0) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-bold">
        <TrendingDown className="w-3 h-3" />
        {delta}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
      <Minus className="w-3 h-3" />0
    </div>
  );
}

export default function WellnessProgress() {
  const { data: checkins = [], isLoading } = useQuery<WellnessCheckin[]>({
    queryKey: ["/api/wellness-checkins"],
  });

  const baseline = checkins[0];
  const latest = checkins[checkins.length - 1];
  const hasComparison = checkins.length >= 2;

  // Build chart data: marker-by-marker comparison
  const comparisonData = markerKeys.map((k) => ({
    marker: wellnessMarkers[k].split(" & ")[0].split(" ")[0], // short label
    fullName: wellnessMarkers[k],
    Baseline: baseline?.[k] ?? 0,
    Latest: latest?.[k] ?? 0,
  }));

  // Trend chart: overall score over time
  const trendData = checkins.map((c, i) => ({
    name: i === 0 ? "Baseline" : `Check-in ${i + 1}`,
    score: c.overallScore,
    date: c.createdAt ? format(new Date(c.createdAt), "MMM d") : "",
  }));

  const overallDelta = hasComparison ? latest.overallScore - baseline.overallScore : 0;
  const overallPercent = hasComparison && baseline.overallScore > 0
    ? Math.round((overallDelta / baseline.overallScore) * 100)
    : 0;

  // AI Wellness Insights state
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(false);

  const fetchInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(false);
    try {
      const resp = await fetch("/api/ai/wellness-insights", { method: "POST" });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setAiInsights(data.insights);
    } catch {
      setInsightsError(true);
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="font-serif text-lg font-semibold">NIVARANA</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
            <HeartPulse className="w-3.5 h-3.5" />
            Wellness Progress
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3">
            Your Wellness Journey
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            See how your health markers have shifted since you started following your personalized plan.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-80" />
          </div>
        ) : checkins.length === 0 ? (
          <Card className="bg-card/60 border-dashed text-center p-10">
            <CardContent className="space-y-4 pt-6">
              <Sparkles className="w-12 h-12 text-primary mx-auto" />
              <h2 className="font-serif text-2xl font-bold">No check-ins yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Take your first wellness check-in to record your baseline. After following your plan
                for 2-4 weeks, take another to see how you've improved.
              </p>
              <Link href="/wellness-checkin">
                <Button size="lg" className="gap-2" data-testid="button-take-baseline">
                  <HeartPulse className="w-5 h-5" />
                  Take Baseline Check-in
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : !hasComparison ? (
          <Card className="bg-primary/5 border-primary/20 text-center p-10">
            <CardContent className="space-y-4 pt-6">
              <CardTitle className="font-serif text-2xl">Baseline saved</CardTitle>
              <p className="text-muted-foreground max-w-md mx-auto">
                You've recorded your starting point. Follow your personalized food plan for at least
                2-4 weeks, then come back and take another check-in to see how things have changed.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link href="/foods">
                  <Button size="lg" className="gap-2" data-testid="button-go-foods">
                    Explore Your Food Plan
                  </Button>
                </Link>
                <Link href="/wellness-checkin">
                  <Button variant="outline" size="lg" className="gap-2" data-testid="button-take-followup">
                    <RotateCw className="w-4 h-4" />
                    Re-evaluate Now
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground pt-4">
                Baseline taken on {baseline.createdAt ? format(new Date(baseline.createdAt), "MMM d, yyyy") : "—"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overall summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className={`overflow-hidden ${overallDelta > 0 ? "bg-green-500/5 border-green-500/30" : overallDelta < 0 ? "bg-destructive/5 border-destructive/30" : "bg-card/60"}`}>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                    <div className="text-center md:text-left">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Overall Wellness
                      </div>
                      <div className="font-serif text-4xl sm:text-5xl font-bold">
                        {latest.overallScore} <span className="text-2xl text-muted-foreground font-normal">/ 40</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Baseline was {baseline.overallScore} / 40
                      </div>
                    </div>

                    <div className="text-center">
                      {overallDelta > 0 ? (
                        <TrendingUp className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      ) : overallDelta < 0 ? (
                        <TrendingDown className="w-12 h-12 text-destructive mx-auto mb-2" />
                      ) : (
                        <Minus className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      )}
                      <div className={`text-3xl font-bold ${overallDelta > 0 ? "text-green-600 dark:text-green-400" : overallDelta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {overallDelta > 0 ? "+" : ""}{overallDelta} pts
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {overallPercent > 0 ? "+" : ""}{overallPercent}% change
                      </div>
                    </div>

                    <div className="text-center md:text-right">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        {checkins.length} Check-ins
                      </div>
                      <div className="text-sm">
                        Latest: {latest.createdAt ? format(new Date(latest.createdAt), "MMM d, yyyy") : "—"}
                      </div>
                      <Link href="/wellness-checkin">
                        <Button size="sm" className="gap-2 mt-3" data-testid="button-take-new-checkin">
                          <RotateCw className="w-4 h-4" />
                          Take New Check-in
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Wellness Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-8"
            >
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-lg">AI Wellness Insights</CardTitle>
                        <CardDescription className="text-xs">Personalised Ayurvedic analysis of your progress</CardDescription>
                      </div>
                    </div>
                    {aiInsights && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        AI Generated
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {aiInsights ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
                    >
                      {aiInsights}
                    </motion.div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Get AI-powered insights on your wellness journey — what's improving, what needs attention, and personalised Ayurvedic tips.
                      </p>
                      <Button
                        onClick={fetchInsights}
                        disabled={insightsLoading}
                        className="gap-2 shadow-md shadow-primary/20"
                        data-testid="button-ai-insights"
                      >
                        {insightsLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate Wellness Insights
                          </>
                        )}
                      </Button>
                      {insightsError && (
                        <p className="text-xs text-destructive mt-3">Could not generate insights. Please try again.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Marker comparison chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <Card className="bg-card/60">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl">Baseline vs Latest</CardTitle>
                  <CardDescription>How each wellness marker has shifted</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis dataKey="marker" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.5rem",
                          }}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                        />
                        <Legend />
                        <Bar dataKey="Baseline" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Latest" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Per-marker breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid sm:grid-cols-2 gap-3 mb-8"
            >
              {markerKeys.map((k) => {
                const b = baseline[k];
                const l = latest[k];
                const delta = l - b;
                return (
                  <Card key={k} className="bg-card/60" data-testid={`marker-card-${k}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{wellnessMarkers[k]}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b}/5 → <span className="font-semibold text-foreground">{l}/5</span>
                        </div>
                      </div>
                      <ImprovementBadge delta={delta} />
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>

            {/* Trend chart (only if 3+ check-ins) */}
            {checkins.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <Card className="bg-card/60">
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl">Wellness Over Time</CardTitle>
                    <CardDescription>Your overall score across all check-ins</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "0.5rem",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={{ r: 5, fill: "hsl(var(--primary))" }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}


          </>
        )}
      </main>
    </div>
  );
}
