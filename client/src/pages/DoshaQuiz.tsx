import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { doshaQuestions, calculateDoshaPercentages, classifyConstitution } from "@/lib/doshaQuestions";
import type { QuizResponse } from "@shared/schema";
import { Leaf, ArrowRight, ArrowLeft, Wind, Flame, Mountain, CheckCircle } from "lucide-react";
import { Celebration } from "@/components/Celebration";

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
  const [showCelebration, setShowCelebration] = useState(false);
  
  const question = doshaQuestions[currentQuestion];
  const progress = ((currentQuestion) / doshaQuestions.length) * 100;
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
      setShowCelebration(true);
      setTimeout(() => {
        setLocation("/results");
      }, 3000);
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
    setSelectedAnswer(value);
  };
  
  const handleNext = () => {
    if (selectedAnswer === null) return;
    
    const newResponse: QuizResponse = {
      questionId: question.id,
      dosha: question.dosha,
      score: selectedAnswer,
    };
    
    const updatedResponses = [...responses, newResponse];
    setResponses(updatedResponses);
    
    if (currentQuestion < doshaQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      // Calculate final results
      const vataScore = updatedResponses.filter(r => r.dosha === 'vata').reduce((sum, r) => sum + r.score, 0);
      const pittaScore = updatedResponses.filter(r => r.dosha === 'pitta').reduce((sum, r) => sum + r.score, 0);
      const kaphaScore = updatedResponses.filter(r => r.dosha === 'kapha').reduce((sum, r) => sum + r.score, 0);
      const percentages = calculateDoshaPercentages(updatedResponses);
      const constitution = classifyConstitution(percentages);
      
      mutation.mutate({
        responses: updatedResponses,
        vataScore,
        pittaScore,
        kaphaScore,
        percentages,
        constitution,
      });
    }
  };
  
  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      const previousResponse = responses[currentQuestion - 1];
      if (previousResponse) {
        setSelectedAnswer(previousResponse.score);
        setResponses(responses.slice(0, -1));
      }
    }
  };
  
  const isLastQuestion = currentQuestion === doshaQuestions.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Celebration 
        show={showCelebration} 
        message="Quiz Complete! 🎉"
        onComplete={() => setShowCelebration(false)}
      />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-serif text-lg font-semibold">Dosha Assessment</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {doshaQuestions.length}
            </div>
          </div>
        </div>
      </header>
      
      {/* Progress bar */}
      <div className="sticky top-[65px] z-40 bg-background border-b border-border">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>
      
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl">
          <Card className="animate-fade-in-up">
            <CardHeader className="text-center pb-4">
              {/* Dosha indicator */}
              <div className="flex justify-center mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${doshaColors[question.dosha]}`}>
                  <DoshaIcon className="w-7 h-7" />
                </div>
              </div>
              
              <CardTitle className="font-serif text-xl sm:text-2xl leading-relaxed">
                {question.text}
              </CardTitle>
              
              <CardDescription className="mt-2">
                Rate how much this applies to you
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Answer options */}
              <div className="space-y-3">
                {answerOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelectAnswer(option.value)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 hover-elevate ${
                      selectedAnswer === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                    data-testid={`answer-${option.value}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedAnswer === option.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted"
                      }`}>
                        {selectedAnswer === option.value && <CheckCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Navigation */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleBack}
                  disabled={currentQuestion === 0}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleNext}
                  disabled={selectedAnswer === null || mutation.isPending}
                  data-testid="button-next"
                >
                  {mutation.isPending ? (
                    "Calculating..."
                  ) : isLastQuestion ? (
                    <>
                      Complete
                      <CheckCircle className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Question category indicator */}
          <div className="mt-6 flex justify-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${currentQuestion < 10 ? 'bg-vata' : 'bg-vata/30'}`} />
              <span className={currentQuestion < 10 ? 'text-foreground' : 'text-muted-foreground'}>
                Vata ({Math.min(currentQuestion + 1, 10)}/10)
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${currentQuestion >= 10 && currentQuestion < 20 ? 'bg-pitta' : 'bg-pitta/30'}`} />
              <span className={currentQuestion >= 10 && currentQuestion < 20 ? 'text-foreground' : 'text-muted-foreground'}>
                Pitta ({Math.min(Math.max(currentQuestion - 9, 0), 10)}/10)
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${currentQuestion >= 20 ? 'bg-kapha' : 'bg-kapha/30'}`} />
              <span className={currentQuestion >= 20 ? 'text-foreground' : 'text-muted-foreground'}>
                Kapha ({Math.min(Math.max(currentQuestion - 19, 0), 10)}/10)
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
