import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { calculateBMI, getBMICategory, calculateMaintenanceCalories, activityLevels } from "@/lib/healthCalculations";
import { Leaf, ArrowRight, ArrowLeft, Scale, Ruler, User, Activity, CheckCircle } from "lucide-react";

interface ProfileData {
  age: number;
  gender: "male" | "female";
  heightCm: number;
  weightKg: number;
  activityLevel: string;
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  
  const [profileData, setProfileData] = useState<ProfileData>({
    age: 0,
    gender: "male",
    heightCm: 0,
    weightKg: 0,
    activityLevel: "moderate",
  });
  
  const bmi = profileData.heightCm > 0 && profileData.weightKg > 0 
    ? calculateBMI(profileData.weightKg, profileData.heightCm)
    : null;
  
  const bmiCategory = bmi ? getBMICategory(bmi) : null;
  
  const calories = profileData.age > 0 && profileData.heightCm > 0 && profileData.weightKg > 0
    ? calculateMaintenanceCalories(
        profileData.weightKg,
        profileData.heightCm,
        profileData.age,
        profileData.gender,
        profileData.activityLevel
      )
    : null;
  
  const mutation = useMutation({
    mutationFn: async (data: ProfileData & { bmi: number; maintenanceCalories: number }) => {
      return apiRequest("POST", "/api/profile", data);
    },
    onSuccess: async () => {
      toast({
        title: "Profile Created!",
        description: "Your health profile has been saved. Let's discover your dosha!",
      });
      await queryClient.refetchQueries({ queryKey: ["/api/profile"] });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const handleSubmit = () => {
    if (bmi && calories) {
      mutation.mutate({
        ...profileData,
        bmi,
        maintenanceCalories: calories,
      });
    }
  };
  
  const isStep1Valid = profileData.age > 0 && profileData.gender;
  const isStep2Valid = profileData.heightCm > 0 && profileData.weightKg > 0;
  const isStep3Valid = profileData.activityLevel;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
      
      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="h-8 w-8 text-primary" />
            <span className="font-serif text-2xl font-semibold">NIVARANA</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
            Let's Create Your Profile
          </h1>
          <p className="text-muted-foreground">
            We need a few details to calculate your health metrics
          </p>
        </div>
        
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-2" />
        </div>
        
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="animate-fade-in-up">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="font-serif">Basic Information</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Enter your age"
                  value={profileData.age || ""}
                  onChange={(e) => setProfileData({ ...profileData, age: parseInt(e.target.value) || 0 })}
                  data-testid="input-age"
                />
              </div>
              
              <div className="space-y-3">
                <Label>Gender</Label>
                <RadioGroup
                  value={profileData.gender}
                  onValueChange={(value: "male" | "female") => setProfileData({ ...profileData, gender: value })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" data-testid="radio-male" />
                    <Label htmlFor="male" className="cursor-pointer">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" data-testid="radio-female" />
                    <Label htmlFor="female" className="cursor-pointer">Female</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Button 
                className="w-full gap-2" 
                onClick={handleNext}
                disabled={!isStep1Valid}
                data-testid="button-next-step"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Step 2: Body Measurements */}
        {step === 2 && (
          <Card className="animate-fade-in-up">
            <CardHeader>
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Ruler className="w-6 h-6 text-primary" />
                </div>
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                  <Scale className="w-6 h-6 text-accent-foreground" />
                </div>
              </div>
              <CardTitle className="font-serif mt-4">Body Measurements</CardTitle>
              <CardDescription>For BMI and calorie calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="e.g., 170"
                  value={profileData.heightCm || ""}
                  onChange={(e) => setProfileData({ ...profileData, heightCm: parseFloat(e.target.value) || 0 })}
                  data-testid="input-height"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="e.g., 65"
                  value={profileData.weightKg || ""}
                  onChange={(e) => setProfileData({ ...profileData, weightKg: parseFloat(e.target.value) || 0 })}
                  data-testid="input-weight"
                />
              </div>
              
              {/* BMI Preview */}
              {bmi && (
                <div className="p-4 bg-muted/50 rounded-lg animate-scale-in">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your BMI</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold">{bmi}</span>
                      <span className={`ml-2 text-sm ${bmiCategory?.color}`}>
                        ({bmiCategory?.category})
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={handleBack}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={handleNext}
                  disabled={!isStep2Valid}
                  data-testid="button-next-step"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Step 3: Activity Level */}
        {step === 3 && (
          <Card className="animate-fade-in-up">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="font-serif">Activity Level</CardTitle>
              <CardDescription>How active are you in your daily life?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Select
                value={profileData.activityLevel}
                onValueChange={(value) => setProfileData({ ...profileData, activityLevel: value })}
              >
                <SelectTrigger data-testid="select-activity">
                  <SelectValue placeholder="Select your activity level" />
                </SelectTrigger>
                <SelectContent>
                  {activityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex flex-col">
                        <span>{level.label}</span>
                        <span className="text-xs text-muted-foreground">{level.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Summary Preview */}
              {calories && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 animate-scale-in">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Your Health Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">BMI</span>
                      <div className="font-semibold">{bmi} <span className={`text-xs ${bmiCategory?.color}`}>({bmiCategory?.category})</span></div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Daily Calories</span>
                      <div className="font-semibold">{calories} kcal</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={handleBack}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={handleSubmit}
                  disabled={!isStep3Valid || mutation.isPending}
                  data-testid="button-complete"
                >
                  {mutation.isPending ? "Saving..." : "Complete Setup"}
                  <CheckCircle className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
