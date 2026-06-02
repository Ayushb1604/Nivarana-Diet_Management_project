import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { doshaDescriptions } from "@/lib/doshaQuestions";
import { getBMICategory } from "@/lib/healthCalculations";
import type { UserProfile, DoshaAssessment, WellnessCheckin } from "@shared/schema";
import {
  Leaf,
  Wind,
  Flame,
  Mountain,
  Scale,
  Target,
  Utensils,
  ArrowRight,
  LogOut,
  Activity,
  User,
  Sparkles,
  CheckCircle,
  TrendingUp,
  HeartPulse,
  RotateCw,
  ShieldAlert,
  Bell,
  BellDot,
  X,
  CheckCheck,
  Salad,
  MessageCircle,
  Lightbulb,
  Heart as HeartIcon,
  Trash2,
  Star,
} from "lucide-react";

const doshaIcons = {
  vata: Wind,
  pitta: Flame,
  kapha: Mountain,
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification types & helpers
// ─────────────────────────────────────────────────────────────────────────────

type NotifType = "wellness" | "meal" | "admin" | "tip" | "milestone";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  time: string;        // ISO or relative
  isRead: boolean;
  link?: string;
  dbId?: string;
}

const TYPE_META: Record<NotifType, { color: string; bg: string; icon: React.ElementType }> = {
  wellness:  { color: "text-emerald-600",  bg: "bg-emerald-500/10 border-emerald-400/30",   icon: HeartPulse },
  meal:      { color: "text-amber-600",    bg: "bg-amber-500/10 border-amber-400/30",       icon: Salad },
  admin:     { color: "text-blue-600",     bg: "bg-blue-500/10 border-blue-400/30",         icon: MessageCircle },
  tip:       { color: "text-violet-600",   bg: "bg-violet-500/10 border-violet-400/30",     icon: Lightbulb },
  milestone: { color: "text-rose-600",     bg: "bg-rose-500/10 border-rose-400/30",         icon: TrendingUp },
};

const DAILY_TIPS = [
  "Eat your largest meal at noon when your digestive fire (Agni) is strongest.",
  "Sip warm water throughout the day to support digestion and detox.",
  "Avoid cold drinks with meals — they dampen Agni and slow digestion.",
  "Oil pulling for 5 minutes in the morning helps remove oral toxins (Ama).",
  "Try Abhyanga (self-massage with warm oil) before your morning shower.",
  "Eat in a calm environment — stress disrupts nutrient absorption.",
  "Include all 6 tastes (sweet, sour, salty, pungent, bitter, astringent) daily.",
  "Triphala taken at bedtime gently detoxes and balances all three doshas.",
  "Walk for 10–15 minutes after dinner to stimulate digestion.",
  "Go to bed before 10 PM — Kapha time promotes deep, restorative sleep.",
];

function getTodayTip(): string {
  const day = new Date().getDay(); // 0–6
  return DAILY_TIPS[day % DAILY_TIPS.length];
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationBell
// ─────────────────────────────────────────────────────────────────────────────
function NotificationBell({
  checkins,
  hasMealPlan,
}: {
  checkins: WellnessCheckin[];
  hasMealPlan: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // ── Persist read IDs in localStorage, capped to 50 recent entries ──
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("niv_notif_read") || "[]") as string[];
      // Only keep the 50 most-recent stored IDs to prevent unbounded growth
      return new Set(stored.slice(-50));
    } catch { return new Set(); }
  });

  const dropRef = useRef<HTMLDivElement>(null);

  // ── Fetch unread database notifications ──
  const { data: dbNotifs = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 15000,
  });

  // ── Mutation to mark database notifications read ──
  const markReadMutation = useMutation({
    mutationFn: async (dbId: string) => {
      const resp = await fetch(`/api/notifications/${dbId}/read`, {
        method: "PATCH",
      });
      if (!resp.ok) throw new Error("Failed to mark read");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wellness-checkins"] });
    },
  });

  // ── Map DB notifications to Notif format ──
  const mappedDbNotifs = useMemo<Notif[]>(() => {
    return dbNotifs.map((n: any) => ({
      id: `admin-reply-${n.id}`,
      dbId: n.id,
      type: "admin",
      title: n.title || "Coach Feedback",
      message: n.message,
      time: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "Just now",
      isRead: false,
      link: "/wellness-progress",
    }));
  }, [dbNotifs]);

  // ── Build smart local notifications based on app state ──
  const smartNotifs = useMemo<Notif[]>(() => {
    const list: Notif[] = [];

    // 1. Daily Ayurvedic tip — id is date-scoped so yesterday's read state doesn't carry over
    const todayKey = new Date().toDateString();
    list.push({
      id: `tip-${todayKey}`,
      type: "tip",
      title: "Today's Ayurvedic Tip",
      message: getTodayTip(),
      time: "Today",
      isRead: false,
      link: "/foods",
    });

    // 2. Wellness check-in reminder
    if (checkins.length === 0) {
      list.push({
        id: "wellness-first",
        type: "wellness",
        title: "Take Your Baseline Check-in",
        message: "Record your wellness baseline to start tracking your Ayurvedic journey.",
        time: "Action needed",
        isRead: false,
        link: "/wellness-checkin",
      });
    } else {
      const last = checkins[checkins.length - 1];
      const lastDate = last.createdAt ? String(last.createdAt) : "";
      const days = lastDate ? daysSince(lastDate) : 0;
      if (lastDate && days >= 7) {
        list.push({
          id: `wellness-reminder-${lastDate.slice(0, 10)}`,
          type: "wellness",
          title: "Time for a Wellness Re-evaluation",
          message: `It's been ${days} days since your last check-in. See how your body has responded to your plan.`,
          time: `${days}d ago`,
          isRead: false,
          link: "/wellness-checkin",
        });
      }
    }

    // 3. Milestone — 2+ check-ins with improvement
    if (checkins.length >= 2) {
      const first = checkins[0];
      const latest = checkins[checkins.length - 1];
      const delta = (latest.overallScore ?? 0) - (first.overallScore ?? 0);
      if (delta > 0) {
        list.push({
          id: `milestone-${checkins.length}`,
          type: "milestone",
          title: `+${delta} Points Improvement! 🎉`,
          message: `Your wellness score rose from ${first.overallScore} to ${latest.overallScore}/40 across ${checkins.length} check-ins. Keep going!`,
          time: "Milestone",
          isRead: false,
          link: "/wellness-progress",
        });
      }
    }

    // 4. Meal plan prompt (only when no plan exists)
    if (!hasMealPlan) {
      list.push({
        id: "meal-plan-prompt",
        type: "meal",
        title: "Generate Your Personalised Meal Plan",
        message: "Your dosha-specific 7-day Ayurvedic meal plan is ready to be created.",
        time: "Recommended",
        isRead: false,
        link: "/meal-plan",
      });
    }

    return list;
  }, [checkins, hasMealPlan]);

  // Apply persisted read state and merge with DB notifications
  const allNotifs = useMemo<Notif[]>(() => {
    const localMapped = smartNotifs.map(n => ({ ...n, isRead: readIds.has(n.id) }));
    const dbMapped = mappedDbNotifs.map(n => ({ ...n, isRead: readIds.has(n.id) }));
    return [...dbMapped, ...localMapped];
  }, [smartNotifs, mappedDbNotifs, readIds]);

  const unread = allNotifs.filter(n => !n.isRead).length;

  // ── Persist read IDs, trimmed to 50 entries ──
  const persistRead = useCallback((next: Set<string>) => {
    try {
      const arr = [...next].slice(-50);
      localStorage.setItem("niv_notif_read", JSON.stringify(arr));
    } catch { }
  }, []);

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      persistRead(next);
      return next;
    });
  }, [persistRead]);

  const markAll = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      smartNotifs.forEach(n => next.add(n.id));
      mappedDbNotifs.forEach(n => next.add(n.id));
      persistRead(next);
      return next;
    });
    // Mark database notifications read as well
    mappedDbNotifs.forEach(n => {
      if (n.dbId) {
        markReadMutation.mutate(n.dbId);
      }
    });
  }, [smartNotifs, mappedDbNotifs, persistRead, markReadMutation]);

  // ── Navigate within SPA using wouter (no full-page reload) ──
  const handleClick = useCallback((n: Notif) => {
    if (n.dbId) {
      markRead(n.id); // Add to local readIds optimistically
      markReadMutation.mutate(n.dbId);
    } else {
      markRead(n.id);
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  }, [markRead, navigate, markReadMutation]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={dropRef}>
      {/* Accessible live region — announces unread count to screen readers */}
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : ""}
      </span>

      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-all duration-200"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {unread > 0
          ? <BellDot className="w-5 h-5 text-primary" />
          : <Bell className="w-5 h-5 text-muted-foreground" />}
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-sm"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications panel"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-12 w-[340px] bg-background border border-border rounded-2xl shadow-2xl shadow-black/15 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Notifications</span>
                {unread > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAll}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Notifications list with staggered entrance */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border/40">
              {allNotifs.length === 0 && (
                <div className="py-12 text-center">
                  <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">You're all caught up!</p>
                </div>
              )}
              {allNotifs.map((n, i) => {
                const meta = TYPE_META[n.type];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    onClick={() => handleClick(n)}
                    className={`flex gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors ${
                      !n.isRead ? "bg-primary/[0.025]" : ""
                    }`}
                  >
                    {/* Coloured icon badge */}
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-tight ${
                          !n.isRead ? "text-foreground" : "text-muted-foreground"
                        }`}>{n.title}</p>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{n.time}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-muted-foreground">Live · personalised to your journey</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [promptShown, setPromptShown] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("niv_wellness_prompt_shown") === "true";
    }
    return false;
  });

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: assessment, isLoading: assessmentLoading } = useQuery<DoshaAssessment>({
    queryKey: ["/api/dosha-assessment"],
  });

  const { data: wellnessCheckins = [] } = useQuery<WellnessCheckin[]>({
    queryKey: ["/api/wellness-checkins"],
  });

  // ── Real meal-plan check: query the saved plan for "balanced" goal ──
  const { data: savedMealPlan } = useQuery<any>({
    queryKey: ["/api/mealplan/saved"],
    retry: false,
  });
  const hasMealPlan = !!savedMealPlan;

  const queryClient = useQueryClient();
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackRole, setFeedbackRole] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackName, setFeedbackName] = useState("");

  // Initialize feedback name when user is loaded
  useEffect(() => {
    if (user && !feedbackName) {
      setFeedbackName(`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "");
    }
  }, [user, feedbackName]);

  const { data: feedbacks = [] } = useQuery<any[]>({
    queryKey: ["/api/feedbacks"],
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: { rating: number; userName: string; userRole: string; text: string }) => {
      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
      toast({
        title: "Feedback submitted!",
        description: "Thank you for sharing your story.",
      });
      setShowFeedbackDialog(false);
      setFeedbackRating(5);
      setFeedbackText("");
      setFeedbackRole("");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to submit feedback",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/feedbacks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete feedback");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
      toast({
        title: "Feedback deleted",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to delete feedback",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = authLoading || profileLoading || assessmentLoading;
  const hasBaseline = wellnessCheckins.length > 0;
  const baselineCheckin = wellnessCheckins.length > 0 ? wellnessCheckins[0] : undefined;
  const latestCheckin = wellnessCheckins.length > 0 ? wellnessCheckins[wellnessCheckins.length - 1] : undefined;
  const overallDelta =
    wellnessCheckins.length >= 2 && latestCheckin && baselineCheckin
      ? latestCheckin.overallScore - baselineCheckin.overallScore
      : 0;

  const needsOnboarding = !profile?.onboardingComplete;
  const needsAssessment = !assessment;

  const bmiCategory = profile?.bmi ? getBMICategory(profile.bmi) : null;

  const primaryDosha = assessment?.primaryDosha as keyof typeof doshaDescriptions | undefined;
  const PrimaryIcon = primaryDosha ? doshaIcons[primaryDosha] : null;

  const getProgress = () => {
    let steps = 0;
    if (profile?.onboardingComplete) steps++;
    if (assessment) steps++;
    return (steps / 2) * 100;
  };

  const progress = getProgress();

  useEffect(() => {
    if (needsOnboarding && !profileLoading) {
      setLocation("/onboarding");
    }
  }, [needsOnboarding, profileLoading, setLocation]);

  useEffect(() => {
    if (isLoading || needsOnboarding || promptShown) {
      return;
    }

    const lastCheckin = wellnessCheckins.length > 0 ? wellnessCheckins[wellnessCheckins.length - 1] : undefined;
    const lastDate = lastCheckin?.createdAt ? String(lastCheckin.createdAt) : "";
    const days = lastDate ? daysSince(lastDate) : 0;
    const noCheckinsOrOver14Days = wellnessCheckins.length === 0 || days > 14;

    if (needsAssessment || noCheckinsOrOver14Days) {
      const redirectLink = needsAssessment ? "/quiz" : "/wellness-checkin";
      toast({
        title: "Wellness Re-check Recommended",
        description: "Your body constitution changes with seasons. Time for a wellness re-check!",
        action: (
          <ToastAction
            altText="Check-in"
            onClick={() => setLocation(redirectLink)}
          >
            Check-in
          </ToastAction>
        ),
      });

      sessionStorage.setItem("niv_wellness_prompt_shown", "true");
      setPromptShown(true);
    }
  }, [
    isLoading,
    needsOnboarding,
    promptShown,
    needsAssessment,
    wellnessCheckins,
    toast,
    setLocation,
  ]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] bg-primary/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-60 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-[400px] h-[400px] bg-accent/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard">
              <div className="flex items-center gap-2.5 cursor-pointer group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:scale-105 transition-all duration-300">
                  <Leaf className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-xl font-semibold tracking-tight">NIVARANA</span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell
                checkins={wellnessCheckins}
                hasMealPlan={hasMealPlan}
              />
              {user && (
                <div className="flex items-center gap-2 pl-2 ml-1 border-l border-border/40">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {user.firstName?.[0] || user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {(user as any)?.isAdmin && (
                    <a href="/admin">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                        data-testid="button-admin"
                        title="Admin Panel"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span className="hidden sm:inline">Admin</span>
                      </Button>
                    </a>
                  )}
                  <a href="/api/logout">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">Logout</span>
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative"
      >
        {/* Welcome Section */}
        <motion.div
          variants={itemVariants}
          className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Your Wellness Hub
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
              {isLoading ? (
                <Skeleton className="h-12 w-72" />
              ) : (
                <>
                  Namaste
                  {user?.firstName && (
                    <>
                      ,{" "}
                      <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {user.firstName}
                      </span>
                    </>
                  )}
                </>
              )}
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
              Your path to Ayurvedic balance and harmony.
            </p>
          </div>

          {!isLoading && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 bg-background/60 backdrop-blur-sm"
            >
              {progress === 100 ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : (
                <div className="relative w-4 h-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={150.8} strokeDashoffset={150.8 - (150.8 * progress) / 100} strokeLinecap="round" className="text-primary transition-all duration-1000 ease-out" />
                  </svg>
                </div>
              )}
              <span className="text-[13px] font-medium text-foreground">
                {progress === 100 ? "All set up" : `${Math.round(progress)}% Setup`}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Quick Stats */}
        {!isLoading && profile && (
          <motion.div
            variants={itemVariants}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
          >
            {/* BMI */}
            <Card className="bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/15 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <Scale className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    BMI Index
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold tabular-nums">{profile.bmi?.toFixed(1)}</span>
                    {bmiCategory && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">
                        {bmiCategory.category}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Goal */}
            <Card className="bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/15 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <Activity className="w-5.5 h-5.5 text-amber-600 dark:text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Daily Goal
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold tabular-nums">{profile.maintenanceCalories}</span>
                    <span className="text-xs font-medium text-muted-foreground">kcal</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics */}
            <Card className="bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 group-hover:bg-sky-500/15 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <User className="w-5.5 h-5.5 text-sky-600 dark:text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Body Metrics
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold tabular-nums">{profile.heightCm}</span>
                    <span className="text-xs font-medium text-muted-foreground">cm</span>
                    <span className="text-muted-foreground/40 mx-1 text-lg">/</span>
                    <span className="text-2xl font-bold tabular-nums">{profile.weightKg}</span>
                    <span className="text-xs font-medium text-muted-foreground">kg</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dosha */}
            {assessment && PrimaryIcon && (
              <Card className="bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300 group overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <PrimaryIcon className="w-5.5 h-5.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-primary/70 uppercase tracking-wider">
                      Dominant Dosha
                    </div>
                    <div className="text-xl font-bold capitalize text-foreground mt-1 truncate">
                      {assessment.constitutionType === "single"
                        ? assessment.primaryDosha
                        : `${assessment.primaryDosha}-${assessment.secondaryDosha}`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Main Actions */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-5 mb-8">
          {/* Dosha Assessment Card */}
          <Card
            className="overflow-hidden relative group transition-all duration-300 bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg"
          >
            {/* Accent gradient at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400/40 via-violet-500 to-violet-400/40 opacity-80" />

            {/* Subtle corner decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <CardHeader className="relative pt-7 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-violet-500/15 to-violet-500/5 flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
                  <Target className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                {!needsAssessment && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Completed
                  </div>
                )}
              </div>
              <CardTitle className="font-serif text-2xl tracking-tight">Dosha Assessment</CardTitle>
              <CardDescription className="text-sm leading-relaxed mt-1.5">
                {needsAssessment
                  ? "Take the 30-question quiz to discover your unique Ayurvedic constitution."
                  : "Your unique body constitution has been identified."}
              </CardDescription>
            </CardHeader>

            <CardContent className="relative pb-6">
              {assessment ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-gray-700">
                    {PrimaryIcon && (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <PrimaryIcon className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-lg font-semibold capitalize flex items-center gap-2 truncate">
                        {assessment.constitutionType === "single"
                          ? assessment.primaryDosha
                          : `${assessment.primaryDosha}-${assessment.secondaryDosha}`}
                        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                      </div>
                      <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                        {assessment.constitutionType === "single" ? "Single" : "Dual"} Dosha Profile
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Link href="/results">
                      <Button
                        className="gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
                        data-testid="button-view-results"
                      >
                        Explore Full Profile
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href="/quiz">
                      <Button
                        variant="outline"
                        className="bg-transparent border-gray-300 dark:border-gray-600 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                        data-testid="button-retake-quiz"
                      >
                        Retake
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <Link href="/quiz">
                  <Button
                    className="w-full gap-2 py-6 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 transition-all duration-300"
                    data-testid="button-take-quiz"
                  >
                    <Sparkles className="w-5 h-5" />
                    Start Assessment
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Food Recommendations Card */}
          <Card
            className={`overflow-hidden relative group transition-all duration-300 bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg ${!assessment ? "opacity-60" : ""
              }`}
          >
            {/* Accent gradient at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400/40 via-amber-500 to-amber-400/40 opacity-80" />

            {/* Subtle corner decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <CardHeader className="relative pt-7 pb-4">
              <div className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300">
                <Utensils className="w-5.5 h-5.5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="font-serif text-2xl tracking-tight pr-14">Food Wisdom</CardTitle>
              <CardDescription className="text-sm leading-relaxed mt-1.5 pr-14">
                Discover nutritional choices perfectly aligned with your body.
              </CardDescription>
            </CardHeader>

            <CardContent className="relative pb-6">
              {assessment ? (
                <div className="flex flex-col gap-3">
                  <Link href="/foods?mode=balanced">
                    <Button
                      variant="secondary"
                      className="w-full gap-3 py-5 text-sm font-semibold bg-white/60 dark:bg-white/5 hover:bg-primary/5 border border-gray-200 dark:border-gray-700 hover:border-primary/30 transition-all duration-300 justify-start group/btn"
                      data-testid="button-balanced-diet"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Scale className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <span className="flex-1 text-left">Explore Balanced Foods</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 -translate-x-2 transition-all duration-300" />
                    </Button>
                  </Link>
                  <Link href="/health-goals">
                    <Button
                      variant="secondary"
                      className="w-full gap-3 py-5 text-sm font-semibold bg-white/60 dark:bg-white/5 hover:bg-primary/5 border border-gray-200 dark:border-gray-700 hover:border-primary/30 transition-all duration-300 justify-start group/btn"
                      data-testid="button-health-goals"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <span className="flex-1 text-left">Set Health Goals</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 -translate-x-2 transition-all duration-300" />
                    </Button>
                  </Link>
                  <Link href="/meal-plan">
                    <Button
                      variant="secondary"
                      className="w-full gap-3 py-5 text-sm font-semibold bg-white/60 dark:bg-white/5 hover:bg-amber-500/5 border border-gray-200 dark:border-gray-700 hover:border-amber-500/30 transition-all duration-300 justify-start group/btn"
                      data-testid="button-meal-plan"
                    >
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Utensils className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="flex-1 text-left">7-Day Meal Plan</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 -translate-x-2 transition-all duration-300 text-amber-600" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-white/30 dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                  <Utensils className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Complete your dosha assessment first to unlock personalized food recommendations.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Wellness Re-evaluation Card */}
        {assessment && (
          <motion.div variants={itemVariants} className="mb-10">
            <Card className="overflow-hidden relative group bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300">
              {/* Accent gradient at top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400/40 via-rose-500 to-rose-400/40 opacity-80" />

              {/* Subtle corner decoration */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <CardContent className="relative p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-5 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/15 to-rose-500/5 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-all duration-300">
                      <HeartPulse className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <CardTitle className="font-serif text-xl sm:text-2xl tracking-tight">Wellness Re-evaluation</CardTitle>
                        {wellnessCheckins.length > 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {wellnessCheckins.length} check-{wellnessCheckins.length === 1 ? "in" : "ins"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {!hasBaseline
                          ? "Track how your health improves after following your plan."
                          : wellnessCheckins.length === 1
                            ? "Baseline saved — re-evaluate after 2-4 weeks of following your plan."
                            : "Keep tracking your progress to see what's working."}
                      </p>
                    </div>
                  </div>

                  {hasBaseline && wellnessCheckins.length >= 2 && (
                    <div
                      className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${overallDelta > 0
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : overallDelta < 0
                            ? "bg-destructive/10 border-destructive/20 text-destructive"
                            : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-muted-foreground"
                        }`}
                    >
                      <TrendingUp className="w-5 h-5" />
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          Overall
                        </div>
                        <div className="text-base font-bold tabular-nums leading-none mt-1">
                          {overallDelta > 0 ? "+" : ""}
                          {overallDelta} pts
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5 mt-6">
                  <Link href="/wellness-checkin">
                    <Button
                      className="gap-2 shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all duration-300"
                      style={{ backgroundColor: "hsl(var(--primary))" }}
                      data-testid="button-wellness-checkin"
                    >
                      {!hasBaseline ? (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Take Baseline
                        </>
                      ) : (
                        <>
                          <RotateCw className="w-4 h-4" />
                          New Check-in
                        </>
                      )}
                    </Button>
                  </Link>
                  {hasBaseline && (
                    <Link href="/wellness-progress">
                      <Button
                        variant="outline"
                        className="gap-2 bg-transparent border-gray-300 dark:border-gray-600 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                        data-testid="button-wellness-progress"
                      >
                        View Progress
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Dosha Info Section */}
        {assessment && primaryDosha && (
          <motion.div variants={itemVariants} className="mt-12">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">Your Constitution</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-primary/30 via-border/50 to-transparent" />
            </div>

            <Card className="bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 p-8 sm:p-10 flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
                    {PrimaryIcon && (
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5 shadow-inner ring-1 ring-primary/15">
                        <PrimaryIcon className="w-12 h-12 text-primary" />
                      </div>
                    )}
                    <h3 className="font-serif text-2xl font-bold capitalize text-foreground">
                      {doshaDescriptions[primaryDosha].name}
                    </h3>
                    <div className="text-[11px] font-bold text-primary/70 uppercase tracking-widest mt-1.5">
                      Dominant Energy
                    </div>
                  </div>

                  <div className="md:w-2/3 p-8 sm:p-10">
                    <p className="text-base sm:text-lg text-foreground/85 leading-relaxed mb-7 italic font-serif">
                      "{doshaDescriptions[primaryDosha].description}"
                    </p>
                    <div className="space-y-3.5">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Core Qualities
                      </h4>
                      <div className="flex flex-wrap gap-2.5">
                        {doshaDescriptions[primaryDosha].qualities.map((quality) => (
                          <div
                            key={quality}
                            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-primary/5 border border-primary/15 text-foreground/80 transition-all duration-300 hover:bg-primary/10 hover:border-primary/30 hover:text-primary hover:-translate-y-0.5 cursor-default"
                          >
                            {quality}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* User Stories / Platform Feedback Section */}
        <motion.div variants={itemVariants} className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">User Stories & Feedback</h2>
              <div className="h-px w-24 sm:w-48 bg-gradient-to-r from-primary/30 via-border/50 to-transparent" />
            </div>
            <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-md shadow-primary/20">
                  <HeartIcon className="w-4 h-4" /> Share Your Story
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md p-6 rounded-3xl border-0" style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl font-bold">Share Your Story</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!feedbackText.trim() || !feedbackName.trim() || !feedbackRole.trim()) return;
                    submitFeedbackMutation.mutate({
                      rating: feedbackRating,
                      userName: feedbackName.trim(),
                      userRole: feedbackRole.trim(),
                      text: feedbackText.trim(),
                    });
                  }}
                  className="space-y-4 mt-2"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Your Name</label>
                    <Input
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      placeholder="e.g. Priyal Sharma"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Occupation / Role</label>
                    <Input
                      value={feedbackRole}
                      onChange={(e) => setFeedbackRole(e.target.value)}
                      placeholder="e.g. Yoga Instructor, Doctor"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium block">Rating</label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-7 h-7 ${
                              star <= feedbackRating ? "fill-accent text-accent" : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Your Story / Feedback</label>
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us about your wellness journey with Nivarana..."
                      rows={4}
                      maxLength={1000}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full gap-2 font-semibold shadow-lg shadow-primary/20"
                    disabled={submitFeedbackMutation.isPending}
                  >
                    {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {feedbacks.length === 0 ? (
            <Card className="bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 text-center p-8">
              <CardContent className="space-y-3 pt-6">
                <HeartIcon className="w-10 h-10 text-primary/40 mx-auto" />
                <p className="text-muted-foreground text-sm">No feedback shared yet. Be the first to share your story!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {feedbacks.map((f: any) => {
                const canDelete = user && (user.id === f.userId || (user as any).isAdmin);
                return (
                  <Card key={f.id} className="bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-4 relative group hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                    {canDelete && (
                      <button
                        onClick={() => deleteFeedbackMutation.mutate(f.id)}
                        disabled={deleteFeedbackMutation.isPending}
                        className="absolute top-4 right-4 p-1.5 rounded-lg bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
                        title="Delete feedback"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className="flex gap-0.5">
                      {Array.from({ length: f.rating }).map((_, idx) => (
                        <span key={idx} className="text-accent text-sm">★</span>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed flex-1 italic">"{f.text}"</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {(f.userName || "An").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{f.userName}</div>
                        <div className="text-[10px] text-muted-foreground">{f.userRole}</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
}
