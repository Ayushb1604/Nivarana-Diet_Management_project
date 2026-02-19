import type { DoshaQuestion } from "@shared/schema";

export const doshaQuestions: DoshaQuestion[] = [
  // Vata Questions (0-9)
  { id: 0, text: "Do you experience weak digestion, gas or constipation?", dosha: "vata" },
  { id: 1, text: "Do you feel you have low stamina or intolerance for physical activity?", dosha: "vata" },
  { id: 2, text: "Do you usually have dry skin?", dosha: "vata" },
  { id: 3, text: "Do you feel anxious or worried when things go wrong?", dosha: "vata" },
  { id: 4, text: "Are you sensitive to cold weather?", dosha: "vata" },
  { id: 5, text: "Do you find it hard to gain weight and have a thin build?", dosha: "vata" },
  { id: 6, text: "Do you have difficulty falling asleep or experience light sleep?", dosha: "vata" },
  { id: 7, text: "Are you impatient about doing things or try to get things done quickly?", dosha: "vata" },
  { id: 8, text: "Your energy levels tend to come in bursts rather than being steady throughout the day.", dosha: "vata" },
  { id: 9, text: "Do you usually prefer warm environments?", dosha: "vata" },
  
  // Pitta Questions (10-19)
  { id: 10, text: "Do you feel irritable or get angry easily?", dosha: "pitta" },
  { id: 11, text: "Is your skin prone to redness, rashes or acne?", dosha: "pitta" },
  { id: 12, text: "Do you sweat noticeably, even with minimal physical activity?", dosha: "pitta" },
  { id: 13, text: "Do you frequently experience acidity or heartburn?", dosha: "pitta" },
  { id: 14, text: "Do you tend to pass soft and loose stools?", dosha: "pitta" },
  { id: 15, text: "Do you have a strong appetite and can handle large meals easily?", dosha: "pitta" },
  { id: 16, text: "Can you recall details and information easily and have a sharp memory?", dosha: "pitta" },
  { id: 17, text: "Are your eyes sensitive and prone to redness?", dosha: "pitta" },
  { id: 18, text: "Do you prefer cold foods and drinks?", dosha: "pitta" },
  { id: 19, text: "Do you often get mouth ulcers or sores?", dosha: "pitta" },
  
  // Kapha Questions (20-29)
  { id: 20, text: "Do you feel sluggish or lethargic during the day especially after waking up?", dosha: "kapha" },
  { id: 21, text: "Do you often experience puffiness or swelling of face?", dosha: "kapha" },
  { id: 22, text: "Are your movements slow and not very agile?", dosha: "kapha" },
  { id: 23, text: "Do you often experience stiffness or heaviness in your joints?", dosha: "kapha" },
  { id: 24, text: "Is there usually a mucus build up in your throat or chest?", dosha: "kapha" },
  { id: 25, text: "Do you tend to gain weight easily and find it hard to lose it?", dosha: "kapha" },
  { id: 26, text: "Do your hands and feet often feel cold?", dosha: "kapha" },
  { id: 27, text: "Do you experience swelling of legs due to long hours of standing or sitting?", dosha: "kapha" },
  { id: 28, text: "Do you become lazy or experience heaviness after meals?", dosha: "kapha" },
  { id: 29, text: "Do you naturally have a large and well built frame?", dosha: "kapha" },
];

export const doshaDescriptions = {
  vata: {
    name: "Vata",
    element: "Air & Space",
    qualities: ["Light", "Dry", "Cold", "Mobile", "Quick", "Creative"],
    description: "Vata governs movement and communication. Those with Vata dominance tend to be creative, quick-thinking, and energetic. They may experience variable energy and benefit from warming, grounding foods.",
    characteristics: [
      "Light, thin build with prominent joints",
      "Quick mind, learns fast but may forget",
      "Variable appetite and digestion",
      "Tendency toward anxiety when imbalanced",
      "Creative and enthusiastic nature"
    ],
    balancingTips: [
      "Favor warm, cooked, and slightly oily foods",
      "Maintain regular routines for meals and sleep",
      "Practice calming activities like meditation",
      "Stay warm and avoid cold, dry environments"
    ]
  },
  pitta: {
    name: "Pitta",
    element: "Fire & Water",
    qualities: ["Hot", "Sharp", "Light", "Intense", "Determined", "Intelligent"],
    description: "Pitta governs metabolism and transformation. Those with Pitta dominance tend to be sharp-minded, ambitious, and passionate. They benefit from cooling, calming foods.",
    characteristics: [
      "Medium, muscular build",
      "Strong appetite and digestion",
      "Sharp intellect and good memory",
      "Natural leaders with determination",
      "May become irritable when imbalanced"
    ],
    balancingTips: [
      "Favor cooling, less spicy foods",
      "Avoid excessive heat and sun exposure",
      "Practice moderation in work and exercise",
      "Take time for relaxation and leisure"
    ]
  },
  kapha: {
    name: "Kapha",
    element: "Earth & Water",
    qualities: ["Heavy", "Slow", "Steady", "Solid", "Calm", "Nurturing"],
    description: "Kapha governs structure and stability. Those with Kapha dominance tend to be calm, steady, and nurturing. They benefit from light, warming, and stimulating foods.",
    characteristics: [
      "Strong, solid build with good stamina",
      "Slow, methodical, and steady nature",
      "Excellent long-term memory",
      "Calm, patient, and compassionate",
      "May become sluggish when imbalanced"
    ],
    balancingTips: [
      "Favor light, warm, and spicy foods",
      "Engage in regular physical activity",
      "Seek variety and new experiences",
      "Avoid excessive sleep and sedentary habits"
    ]
  }
};

export function calculateDoshaPercentages(responses: { dosha: string; score: number }[]) {
  const vataTotal = responses.filter(r => r.dosha === 'vata').reduce((sum, r) => sum + r.score, 0);
  const pittaTotal = responses.filter(r => r.dosha === 'pitta').reduce((sum, r) => sum + r.score, 0);
  const kaphaTotal = responses.filter(r => r.dosha === 'kapha').reduce((sum, r) => sum + r.score, 0);
  
  const totalScore = vataTotal + pittaTotal + kaphaTotal;
  
  if (totalScore === 0) {
    return { vata: 33, pitta: 33, kapha: 34 };
  }
  
  const vataPercent = Math.round((vataTotal / totalScore) * 100);
  const pittaPercent = Math.round((pittaTotal / totalScore) * 100);
  const kaphaPercent = 100 - vataPercent - pittaPercent;
  
  return {
    vata: vataPercent,
    pitta: pittaPercent,
    kapha: kaphaPercent
  };
}

export function classifyConstitution(percentages: { vata: number; pitta: number; kapha: number }) {
  const { vata, pitta, kapha } = percentages;
  
  if (vata >= 45) {
    return { type: "single" as const, primary: "vata" as const, secondary: null };
  } else if (pitta >= 45) {
    return { type: "single" as const, primary: "pitta" as const, secondary: null };
  } else if (kapha >= 45) {
    return { type: "single" as const, primary: "kapha" as const, secondary: null };
  } else {
    const doshas: [string, number][] = [
      ["vata", vata],
      ["pitta", pitta],
      ["kapha", kapha]
    ];
    
    doshas.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    
    return {
      type: "dual" as const,
      primary: doshas[0][0] as "vata" | "pitta" | "kapha",
      secondary: doshas[1][0] as "vata" | "pitta" | "kapha"
    };
  }
}
