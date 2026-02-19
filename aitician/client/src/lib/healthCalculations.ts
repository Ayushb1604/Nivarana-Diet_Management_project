export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

export function getBMICategory(bmi: number): { category: string; color: string } {
  if (bmi < 18.5) {
    return { category: "Underweight", color: "text-blue-500" };
  } else if (bmi < 25) {
    return { category: "Normal", color: "text-green-500" };
  } else if (bmi < 30) {
    return { category: "Overweight", color: "text-yellow-500" };
  } else {
    return { category: "Obese", color: "text-red-500" };
  }
}

export function calculateMaintenanceCalories(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: "male" | "female",
  activityLevel: string
): number {
  // Mifflin-St Jeor Equation
  let bmr: number;
  
  if (gender === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  
  // Activity multipliers
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  
  const multiplier = multipliers[activityLevel] || 1.55;
  
  return Math.round(bmr * multiplier);
}

export const activityLevels = [
  { value: "sedentary", label: "Sedentary", description: "Little or no exercise" },
  { value: "light", label: "Lightly Active", description: "Light exercise 1-3 days/week" },
  { value: "moderate", label: "Moderately Active", description: "Moderate exercise 3-5 days/week" },
  { value: "active", label: "Active", description: "Hard exercise 6-7 days/week" },
  { value: "very_active", label: "Very Active", description: "Very hard exercise, physical job" },
];
