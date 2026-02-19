import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Sparkles, Utensils, Zap, AlertTriangle } from "lucide-react";
import { type TieredFoods } from "@shared/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotProps {
  dosha: string;
  goal: string;
  foods: TieredFoods;
}

export default function Chatbot({ dosha, goal, foods }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Namaste! I am your Ayurvedic Dietician. I see you have a ${dosha} constitution and are focusing on ${goal}. How can I help you with your meal planning today?`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const quickQuestions = [
    { label: "Suggest a daily meal plan", icon: Utensils },
    { label: "What spices should I use?", icon: Sparkles },
    { label: "Best breakfast options?", icon: Zap },
    { label: "Foods to strictly avoid?", icon: AlertTriangle },
  ];

  const [conversationId, setConversationId] = useState<number | null>(null);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    let currentConvId = conversationId;
    if (!currentConvId) {
      try {
        const convResp = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: `Ayurvedic Dietician Chat - ${dosha}` }),
        });
        if (convResp.ok) {
          const convData = await convResp.json();
          currentConvId = convData.id;
          setConversationId(currentConvId);
        }
      } catch (e) {
        console.error("Failed to create conversation", e);
      }
    }

    if (!currentConvId) {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble starting a conversation. Please refresh and try again." }]);
      return;
    }

    const userMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/conversations/${currentConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          context: {
            dosha,
            goal,
            foods: {
              recommended: foods.tier_1,
              good: foods.tier_2,
              neutral: foods.tier_3,
              caution: foods.tier_4,
              avoid: foods.tier_5
            }
          }
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      let assistantMessage = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.content) {
                assistantMessage += data.content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  return [...prev.slice(0, -1), { ...last, content: assistantMessage }];
                });
              }
            } catch (e) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform bg-primary"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-[350px] sm:w-[400px] h-[500px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5">
          <CardHeader className="p-4 border-b bg-primary text-primary-foreground rounded-t-lg flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Your Ayurvedic Dietician</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 grid grid-cols-2 gap-2 border-t bg-muted/30">
              {quickQuestions.map((q) => (
                <Button
                  key={q.label}
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-auto py-2 justify-start gap-1"
                  onClick={() => handleSend(q.label)}
                >
                  <q.icon className="h-3 w-3" />
                  {q.label}
                </Button>
              ))}
            </div>

            <div className="p-4 border-t flex gap-2">
              <Input
                placeholder="Ask your dietician..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1"
              />
              <Button size="icon" onClick={() => handleSend()} disabled={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
