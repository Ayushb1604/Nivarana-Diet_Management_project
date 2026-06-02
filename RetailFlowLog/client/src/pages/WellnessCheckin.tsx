import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  wellnessMarkers,
  type WellnessMarkerKey,
  type WellnessCheckin as WellnessCheckinType,
} from "@shared/schema";
import {
  Leaf,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  HeartPulse,
  Frown,
  Meh,
  Smile,
  SmilePlus,
  Laugh,
  Loader2,
} from "lucide-react";

// Question prompts for each marker (1=very poor, 5=excellent)
const markerPrompts: Record<WellnessMarkerKey, { question: string; lowLabel: string; highLabel: string }> = {
  energy: {
    question: "How are your energy levels through the day?",
    lowLabel: "Very tired / drained",
    highLabel: "Vibrant & energetic",
  },
  digestion: {
    question: "How well is your digestion working lately?",
    lowLabel: "Bloating / discomfort",
    highLabel: "Smooth & comfortable",
  },
  sleep: {
    question: "How is your sleep quality?",
    lowLabel: "Restless / poor",
    highLabel: "Deep & restful",
  },
  mood: {
    question: "How balanced is your mood overall?",
    lowLabel: "Irritable / low",
    highLabel: "Calm & cheerful",
  },
  mentalClarity: {
    question: "How is your mental focus & clarity?",
    lowLabel: "Foggy / scattered",
    highLabel: "Sharp & clear",
  },
  skinHealth: {
    question: "How is the condition of your skin & hair?",
    lowLabel: "Dull / breakouts",
    highLabel: "Glowing & healthy",
  },
  immunity: {
    question: "How resistant do you feel to colds & illness?",
    lowLabel: "Often falling sick",
    highLabel: "Strong & resilient",
  },
  calmness: {
    question: "How well are you handling stress?",
    lowLabel: "Overwhelmed",
    highLabel: "Calm & in control",
  },
};

// Rating configurations mapping rating to Nivarana's custom tier colors & Lucide icons
const ratingTierMap: Record<number, {
  tier: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  selectedClass: string;
  hoverClass: string;
}> = {
  1: {
    tier: "tier-5",
    icon: Frown,
    label: "Very Poor",
    selectedClass: "border-tier-5 bg-tier-5 text-white shadow-lg shadow-tier-5/30 scale-105",
    hoverClass: "border-border/60 bg-background/40 hover:border-tier-5/60 hover:bg-tier-5/10 hover:text-tier-5",
  },
  2: {
    tier: "tier-4",
    icon: Meh,
    label: "Poor",
    selectedClass: "border-tier-4 bg-tier-4 text-white shadow-lg shadow-tier-4/30 scale-105",
    hoverClass: "border-border/60 bg-background/40 hover:border-tier-4/60 hover:bg-tier-4/10 hover:text-tier-4",
  },
  3: {
    tier: "tier-3",
    icon: Smile,
    label: "Average",
    selectedClass: "border-tier-3 bg-tier-3 text-amber-950 dark:text-amber-50 shadow-lg shadow-tier-3/30 scale-105",
    hoverClass: "border-border/60 bg-background/40 hover:border-tier-3/60 hover:bg-tier-3/10 hover:text-tier-3",
  },
  4: {
    tier: "tier-2",
    icon: SmilePlus,
    label: "Good",
    selectedClass: "border-tier-2 bg-tier-2 text-white shadow-lg shadow-tier-2/30 scale-105",
    hoverClass: "border-border/60 bg-background/40 hover:border-tier-2/60 hover:bg-tier-2/10 hover:text-tier-2",
  },
  5: {
    tier: "tier-1",
    icon: Laugh,
    label: "Excellent",
    selectedClass: "border-tier-1 bg-tier-1 text-white shadow-lg shadow-tier-1/30 scale-105",
    hoverClass: "border-border/60 bg-background/40 hover:border-tier-1/60 hover:bg-tier-1/10 hover:text-tier-1",
  },
};

export default function WellnessCheckin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existing = [], isLoading } = useQuery<WellnessCheckinType[]>({
    queryKey: ["/api/wellness-checkins"],
  });

  const isBaseline = existing.length === 0;
  const checkinNumber = existing.length + 1;

  const markerKeys = Object.keys(wellnessMarkers) as WellnessMarkerKey[];
  const [responses, setResponses] = useState<Record<WellnessMarkerKey, number | null>>(
    () =>
      markerKeys.reduce((acc, k) => {
        acc[k] = null;
        return acc;
      }, {} as Record<WellnessMarkerKey, number | null>)
  );
  const [notes, setNotes] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const answeredCount = markerKeys.filter((k) => responses[k] !== null).length;
  const progress = (answeredCount / markerKeys.length) * 100;
  const currentKey = markerKeys[currentIdx];
  const isLastQuestion = currentIdx === markerKeys.length - 1;
  const allAnswered = answeredCount === markerKeys.length;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, number | string | null> = {
        notes: notes.trim() || null,
      };
      for (const k of markerKeys) {
        payload[k] = responses[k]!;
      }
      return await apiRequest("POST", "/api/wellness-checkin", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wellness-checkins"] });
      toast({
        title: isBaseline ? "Baseline saved!" : "Check-in saved!",
        description: isBaseline
          ? "We'll use this as your starting point. Take another check-in after a few weeks to see your progress."
          : "Your wellness has been re-evaluated. View your progress now.",
      });
      setLocation("/wellness-progress");
    },
    onError: (error: any) => {
      toast({
        title: "Could not save check-in",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelect = (value: number) => {
    setResponses((prev) => ({ ...prev, [currentKey]: value }));
    // Auto-advance after a brief moment, except on the last question
    if (!isLastQuestion) {
      setDirection('next');
      setTimeout(() => setCurrentIdx((i) => Math.min(i + 1, markerKeys.length - 1)), 250);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="shrink-0 bg-background/60 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-serif font-semibold hidden sm:inline">NIVARANA</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-5">
          {isLoading ? (
            <div className="space-y-6 animate-fade-in">
              {/* Title Skeleton */}
              <div className="flex flex-col items-center space-y-3 text-center">
                <Skeleton className="h-6 w-36 rounded-full" />
                <Skeleton className="h-8 w-72 rounded-lg" />
                <Skeleton className="h-4 w-96 max-w-full rounded-md" />
              </div>

              {/* Progress Skeleton */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-3.5 w-20 rounded" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>

              {/* Pills Skeleton */}
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>

              {/* Card Skeleton */}
              <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-lg">
                <CardHeader className="pb-3 pt-4 space-y-2">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-7 w-3/4 rounded-md" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square sm:aspect-auto sm:h-20 rounded-2xl" />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    <Skeleton className="h-3.5 w-32 rounded" />
                    <Skeleton className="h-3.5 w-32 rounded" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-5"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2 animate-pulse-gentle">
                  <HeartPulse className="w-3 h-3" />
                  {isBaseline ? "Baseline Check-in" : `Re-evaluation #${checkinNumber - 1}`}
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2">
                  {isBaseline ? "Wellness Baseline" : "How are you feeling now?"}
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                  {isBaseline
                    ? "Rate where you are today across 8 wellness markers."
                    : "Rate where you are today to compare against your baseline."}
                </p>
              </motion.div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                  <span>Question {currentIdx + 1} of {markerKeys.length}</span>
                  <span>{Math.round(progress)}% answered</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>

              {/* Marker pills (clickable to jump) */}
              <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
                {markerKeys.map((k, i) => (
                  <button
                    key={k}
                    onClick={() => {
                      setDirection(i > currentIdx ? 'next' : 'prev');
                      setCurrentIdx(i);
                    }}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all ${i === currentIdx
                        ? "bg-primary text-primary-foreground shadow-md"
                        : responses[k] !== null
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                    data-testid={`pill-marker-${k}`}
                  >
                    {responses[k] !== null && <CheckCircle2 className="w-3 h-3 inline mr-1 animate-scale-in" />}
                    {wellnessMarkers[k]}
                  </button>
                ))}
              </div>

              {/* Current question card */}
              <motion.div
                key={currentKey}
                initial={{ opacity: 0, x: direction === 'next' ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-lg">
                  <CardHeader className="pb-3 pt-4">
                    <CardDescription className="text-xs font-bold uppercase tracking-wider text-primary">
                      {wellnessMarkers[currentKey]}
                    </CardDescription>
                    <CardTitle className="font-serif text-xl sm:text-2xl leading-tight">
                      {markerPrompts[currentKey].question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Rating buttons */}
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((value) => {
                        const isSelected = responses[currentKey] === value;
                        const config = ratingTierMap[value];
                        const IconComponent = config.icon;
                        return (
                          <button
                            key={value}
                            onClick={() => handleSelect(value)}
                            className={`relative aspect-square sm:aspect-auto sm:py-3.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${isSelected ? config.selectedClass : config.hoverClass}`}
                            data-testid={`rating-${currentKey}-${value}`}
                          >
                            <IconComponent className={`w-5 h-5 ${isSelected ? "text-current" : "text-muted-foreground group-hover:text-current"}`} />
                            <span className="text-lg sm:text-xl font-bold">{value}</span>
                            <span className={`text-[10px] font-medium hidden sm:block ${isSelected ? "text-current opacity-90" : "text-muted-foreground"}`}>
                              {config.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Scale labels */}
                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                      <span>← {markerPrompts[currentKey].lowLabel}</span>
                      <span>{markerPrompts[currentKey].highLabel} →</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDirection('prev');
                    setCurrentIdx((i) => Math.max(0, i - 1));
                  }}
                  disabled={currentIdx === 0}
                  className="gap-2"
                  data-testid="button-prev-question"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>

                {!isLastQuestion ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setDirection('next');
                      setCurrentIdx((i) => Math.min(i + 1, markerKeys.length - 1));
                    }}
                    disabled={responses[currentKey] === null}
                    className="gap-2"
                    data-testid="button-next-question"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <div />
                )}
              </div>

              {/* Notes + Submit (shown once all answered) */}
              {allAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5"
                >
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-serif text-lg flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Anything else to note? (optional)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Specific symptoms, observations, or changes you'd like to remember.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g., Sleeping much better since cutting cold drinks. Skin clearer."
                        rows={3}
                        maxLength={2000}
                        data-testid="input-notes"
                      />
                      <Button
                        onClick={() => submitMutation.mutate()}
                        disabled={submitMutation.isPending}
                        className="w-full gap-2 shadow-lg shadow-primary/20"
                        data-testid="button-submit-checkin"
                      >
                        {submitMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            {isBaseline ? "Save My Baseline" : "Save Check-in & See Progress"}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

