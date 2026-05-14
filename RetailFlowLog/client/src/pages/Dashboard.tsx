import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";

const doshaIcons = {
  vata: Wind,
  pitta: Flame,
  kapha: Mountain,
};

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

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: assessment, isLoading: assessmentLoading } = useQuery<DoshaAssessment>({
    queryKey: ["/api/dosha-assessment"],
  });

  const { data: wellnessCheckins = [] } = useQuery<WellnessCheckin[]>({
    queryKey: ["/api/wellness-checkins"],
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
      </motion.main>
    </div>
  );
}
