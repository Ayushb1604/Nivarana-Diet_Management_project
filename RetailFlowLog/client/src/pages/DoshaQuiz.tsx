import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { doshaQuestions, calculateDoshaPercentages, classifyConstitution } from "@/lib/doshaQuestions";
import { motion, AnimatePresence } from "framer-motion";
import type { QuizResponse } from "@shared/schema";
import { Leaf, ArrowRight, ArrowLeft, Wind, Flame, Mountain, CheckCircle } from "lucide-react";

const answerOptions = [
  { value: 0, label: "Never", description: "This doesn't apply to me at all" },
  { value: 1, label: "Rarely", description: "Happens very occasionally" },
  { value: 2, label: "Sometimes", description: "Happens now and then" },
  { value: 3, label: "Often", description: "Happens frequently" },
  { value: 4, label: "Always", description: "This is very true for me" },
];

const doshaIcons = {
  vata: Wind,
  pitta: Flame,
  kapha: Mountain,
};

const doshaColors = {
  vata: "bg-vata/20 text-vata border-vata/30",
  pitta: "bg-pitta/20 text-pitta border-pitta/30",
  kapha: "bg-kapha/20 text-kapha border-kapha/30",
};

export default function DoshaQuiz() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasGoneBack, setHasGoneBack] = useState(false);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1); // 1 = forward, -1 = back
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  
  const question = doshaQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / doshaQuestions.length) * 100;
  const DoshaIcon = doshaIcons[question.dosha];
  
  const mutation = useMutation({
    mutationFn: async (data: {
      responses: QuizResponse[];
      vataScore: number;
      pittaScore: number;
      kaphaScore: number;
      percentages: { vata: number; pitta: number; kapha: number };
      constitution: { type: string; primary: string; secondary: string | null };
    }) => {
      return apiRequest("POST", "/api/dosha-assessment", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dosha-assessment"] });
      toast({
        title: "Assessment Complete!",
        description: "Your dosha profile has been calculated.",
      });
      setLocation("/results");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your assessment. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleSelectAnswer = (value: number) => {
    // Save the answer at the current index (preserving future answers)
    const newResponses = [...responses];
    newResponses[currentQuestion] = {
      questionId: question.id,
      dosha: question.dosha,
      score: value,
    };
    setResponses(newResponses);
    setSelectedAnswer(value);

    // Clear any pending timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Auto-advance only if NOT revisiting and NOT the last question
    if (!hasGoneBack && currentQuestion < doshaQuestions.length - 1) {
      timeoutRef.current = setTimeout(() => {
        setSlideDirection(1);
        setCurrentQuestion((prev) => prev + 1);
        setSelectedAnswer(null);
      }, 300);
    }
  };


  const handleNext = () => {
    if (selectedAnswer === null) return;

    if (currentQuestion < doshaQuestions.length - 1) {
      const nextQ = currentQuestion + 1;
      setSlideDirection(1);
      setCurrentQuestion(nextQ);
      // Load existing answer if already answered
      const existing = responses[nextQ];
      setSelectedAnswer(existing ? existing.score : null);
      if (!existing) setHasGoneBack(false);
    } else {
      // Submit
      const validResponses = responses.filter(Boolean);
      const vataScore = validResponses.filter(r => r.dosha === 'vata').reduce((sum, r) => sum + r.score, 0);
      const pittaScore = validResponses.filter(r => r.dosha === 'pitta').reduce((sum, r) => sum + r.score, 0);
      const kaphaScore = validResponses.filter(r => r.dosha === 'kapha').reduce((sum, r) => sum + r.score, 0);
      const percentages = calculateDoshaPercentages(validResponses);
      const constitution = classifyConstitution(percentages);

      mutation.mutate({ responses: validResponses, vataScore, pittaScore, kaphaScore, percentages, constitution });
    }
  };


  const handleBack = () => {
    // Cancel any pending auto-advance
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (currentQuestion > 0) {
      const prevQ = currentQuestion - 1;
      setSlideDirection(-1);
      setCurrentQuestion(prevQ);
      const previousResponse = responses[prevQ];
      setSelectedAnswer(previousResponse ? previousResponse.score : null);
      setHasGoneBack(true);
    } else {
      setLocation("/dashboard");
    }
  };

  
  const isLastQuestion = currentQuestion === doshaQuestions.length - 1;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              <span className="font-serif font-semibold hidden sm:inline">Dosha Assessment</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentQuestion + 1} / {doshaQuestions.length}
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="shrink-0 bg-background border-b border-border">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-4">
        <div className="w-full max-w-2xl">
          {/* Animated question card with slide direction */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: slideDirection * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDirection * -40 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
          <Card className="shadow-sm">

            <CardHeader className="text-center pb-3 pt-5">
              {/* Dosha indicator */}
              <div className="flex justify-center mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${doshaColors[question.dosha]}`}>
                  <DoshaIcon className="w-6 h-6" />
                </div>
              </div>

              <CardTitle className="font-serif text-xl sm:text-2xl leading-snug">
                {question.text}
              </CardTitle>

              <CardDescription className="mt-1.5 text-sm">
                Rate how much this applies to you
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pb-5">
              {/* Answer options */}
              <div className="space-y-2">
                {answerOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelectAnswer(option.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all duration-200 hover-elevate ${
                      selectedAnswer === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                    data-testid={`answer-${option.value}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedAnswer === option.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted"
                      }`}>
                        {selectedAnswer === option.value && <CheckCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleBack}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                {(hasGoneBack || isLastQuestion) && (
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleNext}
                    disabled={selectedAnswer === null || mutation.isPending}
                    data-testid="button-next"
                  >
                    {mutation.isPending ? (
                      "Calculating..."
                    ) : isLastQuestion ? (
                      <>Complete <CheckCircle className="w-4 h-4" /></>
                    ) : (
                      <>Next <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
            </motion.div>
          </AnimatePresence>


          {/* Question category indicator */}
          <div className="mt-4 flex justify-center gap-5">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${currentQuestion < 10 ? 'bg-vata' : 'bg-vata/30'}`} />
              <span className={currentQuestion < 10 ? 'text-foreground' : 'text-muted-foreground'}>
                Vata {Math.min(currentQuestion + 1, 10)}/10
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${currentQuestion >= 10 && currentQuestion < 20 ? 'bg-pitta' : 'bg-pitta/30'}`} />
              <span className={currentQuestion >= 10 && currentQuestion < 20 ? 'text-foreground' : 'text-muted-foreground'}>
                Pitta {Math.min(Math.max(currentQuestion - 9, 0), 10)}/10
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${currentQuestion >= 20 ? 'bg-kapha' : 'bg-kapha/30'}`} />
              <span className={currentQuestion >= 20 ? 'text-foreground' : 'text-muted-foreground'}>
                Kapha {Math.min(Math.max(currentQuestion - 19, 0), 10)}/10
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
