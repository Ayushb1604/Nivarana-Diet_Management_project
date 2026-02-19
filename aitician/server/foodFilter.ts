import type { Food, TieredFoods, HealthGoalKey } from "@shared/schema";
import foodData from "./data/food_dataset.json";

const foods: Food[] = foodData.foods;

export function filterBalancedDietSingleDosha(primaryDosha: 'vata' | 'pitta' | 'kapha'): TieredFoods {
  const tier_1: Food[] = [];
  const tier_2: Food[] = [];
  const tier_3: Food[] = [];
  
  for (const food of foods) {
    const doshaEffect = food.dosha_effects[primaryDosha];
    
    if (doshaEffect === "favourable") {
      tier_1.push(food);
    } else if (doshaEffect === "neutral") {
      tier_2.push(food);
    } else {
      tier_3.push(food);
    }
  }
  
  return { tier_1, tier_2, tier_3 };
}

export function filterBalancedDietDualDosha(
  primaryDosha: 'vata' | 'pitta' | 'kapha',
  secondaryDosha: 'vata' | 'pitta' | 'kapha'
): TieredFoods {
  const tier_1: Food[] = [];
  const tier_2: Food[] = [];
  const tier_3: Food[] = [];
  const tier_4: Food[] = [];
  const tier_5: Food[] = [];
  
  for (const food of foods) {
    const primaryEffect = food.dosha_effects[primaryDosha];
    const secondaryEffect = food.dosha_effects[secondaryDosha];
    
    if (primaryEffect === "unfavourable") {
      tier_5.push(food);
    } else if (primaryEffect === "favourable" && secondaryEffect === "favourable") {
      tier_1.push(food);
    } else if (primaryEffect === "favourable" && secondaryEffect === "neutral") {
      tier_2.push(food);
    } else if (primaryEffect === "neutral" || (primaryEffect === "favourable" && secondaryEffect === "unfavourable")) {
      tier_3.push(food);
    } else {
      tier_4.push(food);
    }
  }
  
  return { tier_1, tier_2, tier_3, tier_4, tier_5 };
}

export function filterFoodsSingleDoshaWithGoal(
  primaryDosha: 'vata' | 'pitta' | 'kapha',
  healthGoal: HealthGoalKey
): TieredFoods {
  const tier_1: Food[] = [];
  const tier_2: Food[] = [];
  const tier_3: Food[] = [];
  const tier_4: Food[] = [];
  const tier_5: Food[] = [];
  
  for (const food of foods) {
    const doshaEffect = food.dosha_effects[primaryDosha];
    const goalEffect = food.health_goal_effects[healthGoal];
    
    if (doshaEffect === "unfavourable") {
      tier_5.push(food);
    } else if (doshaEffect === "favourable" && goalEffect === "favourable") {
      tier_1.push(food);
    } else if (
      (doshaEffect === "favourable" && goalEffect === "neutral") ||
      (doshaEffect === "neutral" && goalEffect === "favourable")
    ) {
      tier_2.push(food);
    } else if (doshaEffect === "neutral" && goalEffect === "neutral") {
      tier_3.push(food);
    } else if (doshaEffect === "favourable" && goalEffect === "unfavourable") {
      tier_4.push(food);
    } else {
      tier_3.push(food);
    }
  }
  
  return { tier_1, tier_2, tier_3, tier_4, tier_5 };
}

export function filterFoodsDualDoshaWithGoal(
  primaryDosha: 'vata' | 'pitta' | 'kapha',
  secondaryDosha: 'vata' | 'pitta' | 'kapha',
  healthGoal: HealthGoalKey
): TieredFoods {
  const tier_1: Food[] = [];
  const tier_2: Food[] = [];
  const tier_3: Food[] = [];
  const tier_4: Food[] = [];
  const tier_5: Food[] = [];
  
  for (const food of foods) {
    const primaryEffect = food.dosha_effects[primaryDosha];
    const secondaryEffect = food.dosha_effects[secondaryDosha];
    const goalEffect = food.health_goal_effects[healthGoal];
    
    if (primaryEffect === "unfavourable") {
      tier_5.push(food);
    } else if (
      primaryEffect === "favourable" &&
      secondaryEffect !== "unfavourable" &&
      goalEffect === "favourable"
    ) {
      tier_1.push(food);
    } else if (
      (primaryEffect === "favourable" && secondaryEffect === "favourable" && goalEffect === "neutral") ||
      (primaryEffect === "favourable" && secondaryEffect === "neutral" && goalEffect === "favourable") ||
      (primaryEffect === "neutral" && secondaryEffect === "favourable" && goalEffect === "favourable")
    ) {
      tier_2.push(food);
    } else if (primaryEffect === "neutral" && secondaryEffect === "neutral" && goalEffect === "neutral") {
      tier_3.push(food);
    } else if (
      (primaryEffect === "favourable" && secondaryEffect === "unfavourable") ||
      (primaryEffect === "favourable" && goalEffect === "unfavourable")
    ) {
      tier_4.push(food);
    } else {
      tier_3.push(food);
    }
  }
  
  return { tier_1, tier_2, tier_3, tier_4, tier_5 };
}

export function getFilteredFoods(
  constitutionType: 'single' | 'dual',
  primaryDosha: 'vata' | 'pitta' | 'kapha',
  secondaryDosha: 'vata' | 'pitta' | 'kapha' | null,
  healthGoal: HealthGoalKey | null
): TieredFoods {
  if (healthGoal) {
    if (constitutionType === 'single' || !secondaryDosha) {
      return filterFoodsSingleDoshaWithGoal(primaryDosha, healthGoal);
    } else {
      return filterFoodsDualDoshaWithGoal(primaryDosha, secondaryDosha, healthGoal);
    }
  } else {
    if (constitutionType === 'single' || !secondaryDosha) {
      return filterBalancedDietSingleDosha(primaryDosha);
    } else {
      return filterBalancedDietDualDosha(primaryDosha, secondaryDosha);
    }
  }
}
