import { useState } from "react";
import { useSearch, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function FeedbackPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const dietPlanId = params.get("dietPlanId") || "";
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [isSuspicious, setIsSuspicious] = useState(false);
  const { toast } = useToast();

  async function submitFeedback() {
    const r = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dietPlanId, rating, comments, suggestions, isSuspicious }),
    });
    if (!r.ok) {
      toast({ title: "Failed", description: "Could not submit feedback", variant: "destructive" });
      return;
    }
    toast({
      title: "Feedback submitted",
      description: isSuspicious
        ? "Plan flagged and forwarded to superadmin with alert."
        : "Thank you for your feedback.",
    });
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/dashboard">
          <Button variant="ghost">Back to Dashboard</Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Meal Plan Feedback</CardTitle>
            <CardDescription>Help us improve your personalized diet recommendations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rating (1-5)</Label>
              <Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value || 5))} />
            </div>
            <div className="space-y-2">
              <Label>How do you feel about this plan?</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Suggestions for superadmin/website</Label>
              <Textarea value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isSuspicious} onChange={(e) => setIsSuspicious(e.target.checked)} />
              Flag this plan as suspicious/ambiguous for superadmin review
            </label>
            <Button className="w-full" onClick={submitFeedback}>Submit Feedback</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
