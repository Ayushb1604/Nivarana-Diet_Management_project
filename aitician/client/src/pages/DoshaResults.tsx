import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { doshaDescriptions } from "@/lib/doshaQuestions";
import type { DoshaAssessment } from "@shared/schema";
import { 
  Leaf, 
  Wind, 
  Flame, 
  Mountain, 
  ArrowRight, 
  CheckCircle,
  Sparkles,
  Target,
  Scale
} from "lucide-react";

const doshaIcons = {
  vata: Wind,
  pitta: Flame,
  kapha: Mountain,
};

const doshaGradients = {
  vata: "from-vata/30 to-vata/5",
  pitta: "from-pitta/30 to-pitta/5",
  kapha: "from-kapha/30 to-kapha/5",
};

export default function DoshaResults() {
  const [, setLocation] = useLocation();
  
  const { data: assessment, isLoading } = useQuery<DoshaAssessment>({
    queryKey: ["/api/dosha-assessment"],
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!assessment) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="font-serif">No Assessment Found</CardTitle>
            <CardDescription>
              Please complete the dosha assessment first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/quiz")} className="gap-2" data-testid="button-take-quiz">
              Take Assessment
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const primaryDosha = assessment.primaryDosha as keyof typeof doshaDescriptions;
  const secondaryDosha = assessment.secondaryDosha as keyof typeof doshaDescriptions | null;
  const PrimaryIcon = doshaIcons[primaryDosha];
  const primaryInfo = doshaDescriptions[primaryDosha];
  const secondaryInfo = secondaryDosha ? doshaDescriptions[secondaryDosha] : null;
  
  const constitutionName = assessment.constitutionType === 'single'
    ? primaryInfo.name
    : `${primaryInfo.name}-${secondaryInfo?.name}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-serif text-lg font-semibold">Your Dosha Profile</span>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" data-testid="link-dashboard">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero result card */}
        <Card className={`overflow-hidden bg-gradient-to-br ${doshaGradients[primaryDosha]} animate-fade-in-up`}>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground mb-4">
              <Sparkles className="w-4 h-4" />
              Your Constitution Type
            </div>
            
            {/* Dosha visualization */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className={`w-20 h-20 rounded-full bg-${primaryDosha}/20 flex items-center justify-center border-4 border-${primaryDosha}/40`}>
                <PrimaryIcon className={`w-10 h-10 text-${primaryDosha}`} />
              </div>
              {secondaryDosha && (
                <>
                  <div className="text-2xl text-muted-foreground">+</div>
                  <div className={`w-16 h-16 rounded-full bg-${secondaryDosha}/20 flex items-center justify-center border-4 border-${secondaryDosha}/40`}>
                    {(() => {
                      const SecondaryIcon = doshaIcons[secondaryDosha];
                      return <SecondaryIcon className={`w-8 h-8 text-${secondaryDosha}`} />;
                    })()}
                  </div>
                </>
              )}
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {constitutionName}
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              {assessment.constitutionType === 'single' ? 'Single Dosha Constitution' : 'Dual Dosha Constitution'}
            </p>
            
            {/* Visual representation (no percentages shown as per requirement) */}
            <div className="flex justify-center gap-6 max-w-sm mx-auto">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-vata/30 flex items-center justify-center mb-2">
                  <Wind className="w-6 h-6 text-vata" />
                </div>
                <div className="text-sm font-medium">Vata</div>
                <div className="w-16 h-2 bg-muted rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-vata rounded-full transition-all duration-1000"
                    style={{ width: `${assessment.vataPercent}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-pitta/30 flex items-center justify-center mb-2">
                  <Flame className="w-6 h-6 text-pitta" />
                </div>
                <div className="text-sm font-medium">Pitta</div>
                <div className="w-16 h-2 bg-muted rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-pitta rounded-full transition-all duration-1000"
                    style={{ width: `${assessment.pittaPercent}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-kapha/30 flex items-center justify-center mb-2">
                  <Mountain className="w-6 h-6 text-kapha" />
                </div>
                <div className="text-sm font-medium">Kapha</div>
                <div className="w-16 h-2 bg-muted rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-kapha rounded-full transition-all duration-1000"
                    style={{ width: `${assessment.kaphaPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Primary Dosha Details */}
        <Card className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-${primaryDosha}/20 flex items-center justify-center`}>
                <PrimaryIcon className={`w-6 h-6 text-${primaryDosha}`} />
              </div>
              <div>
                <CardTitle className="font-serif">{primaryInfo.name}</CardTitle>
                <CardDescription>{primaryInfo.element}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{primaryInfo.description}</p>
            
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Key Characteristics
              </h4>
              <ul className="grid sm:grid-cols-2 gap-2">
                {primaryInfo.characteristics.map((char, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    {char}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Balancing Tips
              </h4>
              <ul className="space-y-2">
                {primaryInfo.balancingTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {primaryInfo.qualities.map((quality) => (
                <span 
                  key={quality}
                  className={`px-3 py-1 rounded-full text-sm bg-${primaryDosha}/10 text-${primaryDosha}-foreground`}
                >
                  {quality}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Secondary Dosha Details (if dual) */}
        {secondaryDosha && secondaryInfo && (
          <Card className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-${secondaryDosha}/20 flex items-center justify-center`}>
                  {(() => {
                    const SecIcon = doshaIcons[secondaryDosha];
                    return <SecIcon className={`w-6 h-6 text-${secondaryDosha}`} />;
                  })()}
                </div>
                <div>
                  <CardTitle className="font-serif">{secondaryInfo.name}</CardTitle>
                  <CardDescription>{secondaryInfo.element} (Secondary)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{secondaryInfo.description}</p>
            </CardContent>
          </Card>
        )}
        
        {/* Call to Action */}
        <Card className="bg-primary/5 border-primary/20 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <CardContent className="p-6">
            <h3 className="font-serif text-xl font-semibold mb-2">
              Ready for Your Personalized Food Recommendations?
            </h3>
            <p className="text-muted-foreground mb-6">
              Choose how you'd like to receive your food recommendations
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/foods?mode=balanced" className="flex-1">
                <Button className="w-full gap-2" size="lg" data-testid="button-balanced-diet">
                  <Scale className="w-4 h-4" />
                  Balanced Diet
                </Button>
              </Link>
              <Link href="/health-goals" className="flex-1">
                <Button variant="outline" className="w-full gap-2" size="lg" data-testid="button-health-goals">
                  <Target className="w-4 h-4" />
                  Choose Health Goal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
