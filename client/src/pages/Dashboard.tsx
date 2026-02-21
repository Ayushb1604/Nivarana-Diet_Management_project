import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { doshaDescriptions } from "@/lib/doshaQuestions";
import { getBMICategory } from "@/lib/healthCalculations";
import type { UserProfile, DoshaAssessment } from "@shared/schema";
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
  Heart
} from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

const doshaIcons = {
  vata: Wind,
  pitta: Flame,
  kapha: Mountain,
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { favorites } = useFavorites();
  
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });
  
  const { data: assessment, isLoading: assessmentLoading } = useQuery<DoshaAssessment>({
    queryKey: ["/api/dosha-assessment"],
  });
  
  const isLoading = authLoading || profileLoading || assessmentLoading;
  
  const needsOnboarding = !profile?.onboardingComplete;
  const needsAssessment = !assessment;
  
  const bmiCategory = profile?.bmi ? getBMICategory(profile.bmi) : null;
  
  const primaryDosha = assessment?.primaryDosha as keyof typeof doshaDescriptions | undefined;
  const PrimaryIcon = primaryDosha ? doshaIcons[primaryDosha] : null;
  
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      window.location.href = "/";
    }
  };

  useEffect(() => {
    if (needsOnboarding && !profileLoading) {
      setLocation("/onboarding");
    }
  }, [needsOnboarding, profileLoading, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-7 w-7 text-primary" />
              <span className="font-serif text-xl font-semibold">NIVARANA</span>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {user && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                    <AvatarFallback>
                      {user.firstName?.[0] || user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    data-testid="button-logout"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              `Welcome${user?.firstName ? `, ${user.firstName}` : ""}!`
            )}
          </h1>
          <p className="text-muted-foreground">
            Your personalized Ayurvedic wellness dashboard
          </p>
        </div>
        
        {/* Quick Stats */}
        {!isLoading && profile && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">BMI</div>
                  <div className="text-xl font-bold">
                    {profile.bmi?.toFixed(1)}
                    <span className={`text-sm ml-1 ${bmiCategory?.color}`}>
                      ({bmiCategory?.category})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Daily Calories</div>
                  <div className="text-xl font-bold">{profile.maintenanceCalories} kcal</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Height / Weight</div>
                  <div className="text-xl font-bold">{profile.heightCm}cm / {profile.weightKg}kg</div>
                </div>
              </CardContent>
            </Card>
            
            {assessment && PrimaryIcon && (
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-${primaryDosha}/20 flex items-center justify-center`}>
                    <PrimaryIcon className={`w-6 h-6 text-${primaryDosha}`} />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Dosha Type</div>
                    <div className="text-xl font-bold capitalize">
                      {assessment.constitutionType === 'single' 
                        ? assessment.primaryDosha 
                        : `${assessment.primaryDosha}-${assessment.secondaryDosha}`
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Dosha Assessment Card */}
          <Card className={`${needsAssessment ? 'border-primary/50 bg-primary/5' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                {!needsAssessment && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </div>
              <CardTitle className="font-serif">Dosha Assessment</CardTitle>
              <CardDescription>
                {needsAssessment
                  ? "Take the 30-question quiz to discover your unique Ayurvedic constitution"
                  : "Your dosha profile has been assessed"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assessment ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {PrimaryIcon && (
                      <div className={`w-16 h-16 rounded-full bg-${primaryDosha}/20 flex items-center justify-center`}>
                        <PrimaryIcon className={`w-8 h-8 text-${primaryDosha}`} />
                      </div>
                    )}
                    <div>
                      <div className="font-serif text-xl font-semibold capitalize">
                        {assessment.constitutionType === 'single' 
                          ? assessment.primaryDosha 
                          : `${assessment.primaryDosha}-${assessment.secondaryDosha}`
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {assessment.constitutionType === 'single' ? 'Single Dosha' : 'Dual Dosha'} Constitution
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/results">
                      <Button variant="outline" className="gap-2" data-testid="button-view-results">
                        View Full Profile
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href="/quiz">
                      <Button variant="ghost" size="sm" data-testid="button-retake-quiz">
                        Retake Quiz
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <Link href="/quiz">
                  <Button className="w-full gap-2" data-testid="button-take-quiz">
                    <Sparkles className="w-4 h-4" />
                    Take Dosha Assessment
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
          
          {/* Food Recommendations Card */}
          <Card className={!assessment ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4">
                <Utensils className="w-6 h-6 text-accent-foreground" />
              </div>
              <CardTitle className="font-serif">Food Recommendations</CardTitle>
              <CardDescription>
                Browse foods tailored to your dosha and health goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assessment ? (
                <div className="flex flex-col gap-3">
                  <Link href="/foods?mode=balanced">
                    <Button className="w-full gap-2" data-testid="button-balanced-diet">
                      <Scale className="w-4 h-4" />
                      Balanced Diet Foods
                    </Button>
                  </Link>
                  <Link href="/health-goals">
                    <Button variant="outline" className="w-full gap-2" data-testid="button-health-goals">
                      <Target className="w-4 h-4" />
                      Choose Health Goal
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Complete your dosha assessment first to unlock personalized food recommendations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Favorites Quick Access */}
        {favorites.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-semibold">Your Favorite Foods</h2>
              <Link href="/foods">
                <Button variant="outline" size="sm" className="gap-2">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {favorites.slice(0, 10).map((fav, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                      {fav.name}
                    </Badge>
                  ))}
                  {favorites.length > 10 && (
                    <Badge variant="outline" className="gap-1">
                      +{favorites.length - 10} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Dosha Info Cards (if assessed) */}
        {assessment && primaryDosha && (
          <div className="mt-8">
            <h2 className="font-serif text-xl font-semibold mb-4">About Your Constitution</h2>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {PrimaryIcon && (
                    <div className={`w-14 h-14 rounded-xl bg-${primaryDosha}/20 flex items-center justify-center flex-shrink-0`}>
                      <PrimaryIcon className={`w-7 h-7 text-${primaryDosha}`} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-serif text-lg font-semibold mb-2">
                      {doshaDescriptions[primaryDosha].name} Dominance
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {doshaDescriptions[primaryDosha].description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {doshaDescriptions[primaryDosha].qualities.slice(0, 4).map((quality) => (
                        <span 
                          key={quality}
                          className={`px-3 py-1 rounded-full text-sm bg-${primaryDosha}/10`}
                        >
                          {quality}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
