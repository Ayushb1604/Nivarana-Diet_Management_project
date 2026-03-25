import { jsPDF } from "jspdf";

export function downloadMealPlanStyledPdf(mealPlanPayload: any, title = "Nivarna Weekly Meal Plan") {
  const days = mealPlanPayload?.days || [];
  if (!Array.isArray(days) || days.length === 0) return;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const pageWidth = pdf.internal.pageSize.getWidth();

  days.forEach((dayData: any, index: number) => {
    if (index > 0) pdf.addPage();

    const gradientTop = [24, 122, 74];
    const gradientBottom = [59, 130, 246];
    pdf.setFillColor(gradientTop[0], gradientTop[1], gradientTop[2]);
    pdf.rect(0, 0, pageWidth, 110, "F");
    pdf.setFillColor(gradientBottom[0], gradientBottom[1], gradientBottom[2]);
    pdf.rect(0, 100, pageWidth, 12, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text("NIVARANA", 40, 50);
    pdf.setFontSize(12);
    pdf.text(title, 40, 74);

    const dayIndex = Math.max(0, Number(dayData.day || index + 1) - 1);
    const dayTitle = dayNames[dayIndex] || `Day ${index + 1}`;

    pdf.setTextColor(16, 24, 40);
    pdf.setFontSize(18);
    pdf.text(dayTitle, 40, 150);
    let y = 180;

    const mealEntries = [
      { key: "breakfast", label: "Breakfast" },
      { key: "lunch", label: "Lunch" },
      { key: "dinner", label: "Dinner" },
      { key: "snack", label: "Snacks" },
    ];

    mealEntries.forEach((entry) => {
      const meal = dayData?.meals?.[entry.key];
      if (!meal?.ingredients?.length) return;

      pdf.setFillColor(240, 253, 244);
      pdf.roundedRect(34, y - 20, pageWidth - 68, 70, 8, 8, "F");
      pdf.setTextColor(21, 128, 61);
      pdf.setFontSize(13);
      pdf.text(entry.label, 46, y);

      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(11);
      const line = `Ingredients: ${meal.ingredients.join(", ")}`;
      const wrapped = pdf.splitTextToSize(line, pageWidth - 100);
      pdf.text(wrapped, 46, y + 18);
      y += 85;
    });
  });

  pdf.save("nivarna-weekly-meal-plan.pdf");
}
