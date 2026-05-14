import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Utensils,
  Zap,
  AlertTriangle,
  Leaf,
  Maximize2,
  Minimize2,
  GripHorizontal,
  Trash2,
} from "lucide-react";
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

// Size constraints
const MIN_WIDTH = 340;
const MIN_HEIGHT = 460;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 900;
const DEFAULT_SIZE = { width: 400, height: 560 };
const STORAGE_KEY = "nivarana-chatbot-size";

export default function Chatbot({ dosha, goal, foods }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SIZE;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.width && parsed.height) return parsed;
      }
    } catch {}
    return DEFAULT_SIZE;
  });
  const [isResizing, setIsResizing] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Namaste! 🌿 I am Vaidya, your personal Ayurvedic guide. I see you have a ${dosha} constitution and are focusing on ${goal}. How can I help you on your wellness journey today?`,
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Persist size to localStorage
  useEffect(() => {
    if (!isMaximized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
      } catch {}
    }
  }, [size, isMaximized]);

  // Resize handler — drag from top-left grows up & left
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (isMaximized) return;
      setIsResizing(true);

      const startX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const startY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const startWidth = size.width;
      const startHeight = size.height;

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        const clientX = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
        const clientY = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
        // Dragging up-left grows the window (since it's anchored bottom-right)
        const dx = startX - clientX;
        const dy = startY - clientY;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + dx));
        const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + dy));
        setSize({ width: newWidth, height: newHeight });
      };

      const handleEnd = () => {
        setIsResizing(false);
        window.removeEventListener("mousemove", handleMove as any);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchmove", handleMove as any);
        window.removeEventListener("touchend", handleEnd);
      };

      window.addEventListener("mousemove", handleMove as any);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove as any, { passive: false });
      window.addEventListener("touchend", handleEnd);
    },
    [size, isMaximized]
  );

  const toggleMaximize = () => setIsMaximized((m) => !m);

  // Reset the conversation to the initial welcome state
  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `Namaste! 🌿 I am Vaidya, your personal Ayurvedic guide. I see you have a ${dosha} constitution and are focusing on ${goal}. How can I help you on your wellness journey today?`,
      },
    ]);
    setInput("");
    setConversationId(null);
  };


  // Quick-reply chips — includes dosha-specific Ayurvedic questions
  const quickQuestions = [
    { label: "What should I eat for dinner?", icon: Utensils, color: "hover:bg-amber-500/10 hover:text-amber-700 hover:border-amber-400/40" },
    { label: `How to balance ${dosha}?`, icon: Sparkles, color: "hover:bg-primary/10 hover:text-primary hover:border-primary/40" },
    { label: "Best morning foods for me", icon: Zap, color: "hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-400/40" },
    { label: "Foods to avoid for my dosha", icon: AlertTriangle, color: "hover:bg-rose-500/10 hover:text-rose-700 hover:border-rose-400/40" },
  ];


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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble starting a conversation. Please refresh and try again." },
      ]);
      return;
    }

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
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
              avoid: foods.tier_5,
            },
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      let assistantMessage = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  return [...prev.slice(0, -1), { ...last, content: assistantMessage }];
                });
              }
            } catch (e) {
              // Ignore non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm sorry, I'm having trouble connecting right now. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute effective dimensions — maximized is viewport-relative
  const getEffectiveSize = () => {
    if (isMaximized) {
      if (typeof window === "undefined") return { width: 720, height: 800 };
      const w = Math.min(720, window.innerWidth - 48);
      const h = Math.min(800, window.innerHeight - 48);
      return { width: w, height: h };
    }
    return size;
  };
  const effectiveSize = getEffectiveSize();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="bubble"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
          <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full h-16 w-16 shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-110 transition-all bg-gradient-to-br from-primary to-primary/80 relative group"
              data-testid="button-open-chatbot"
            >
              {/* Herb emoji avatar */}
              <span className="text-2xl leading-none" aria-hidden>🌿</span>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-background animate-pulse" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Ask Vaidya
              </span>
            </Button>

          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              width: effectiveSize.width,
              height: effectiveSize.height,
            }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{
              opacity: { type: "spring", stiffness: 300, damping: 25 },
              scale: { type: "spring", stiffness: 300, damping: 25 },
              width: { type: "spring", stiffness: 280, damping: 28 },
              height: { type: "spring", stiffness: 280, damping: 28 },
            }}
            className="flex flex-col rounded-3xl overflow-hidden bg-card/80 backdrop-blur-2xl border border-border/60 shadow-2xl shadow-primary/10 relative origin-bottom-right"
          >
            {/* Resize handle (top-left corner) */}
            {!isMaximized && (
              <div
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
                className={`absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-20 group flex items-start justify-start p-1 ${isResizing ? "bg-primary/20" : ""}`}
                data-testid="chat-resize-handle"
                title="Drag to resize"
              >
                <div className="w-3 h-3 border-l-2 border-t-2 border-foreground/30 group-hover:border-primary rounded-tl-md transition-colors" />
              </div>
            )}

            {/* Top drag indicator strip (visual cue) */}
            {!isMaximized && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-30 hover:opacity-60 transition-opacity pointer-events-none">
                <GripHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
            )}

            {/* Header — gradient with avatar */}
            <div className="relative px-5 py-4 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground flex items-center justify-between gap-3 shrink-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10 min-w-0">
                  {/* Vaidya avatar — herb emoji in rounded frame */}
                  <div className="w-10 h-10 rounded-2xl bg-primary-foreground/15 backdrop-blur-md flex items-center justify-center shrink-0 ring-1 ring-primary-foreground/20 text-xl leading-none">
                    🌿
                  </div>
                  <div className="min-w-0">
                    <div className="font-serif text-base font-semibold leading-tight truncate">
                      Vaidya
                    </div>
                    <div className="text-xs text-primary-foreground/80 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="capitalize truncate">{dosha} • {goal}</span>
                    </div>
                  </div>
                </div>

              <div className="flex items-center gap-1 relative z-10 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15 rounded-xl"
                  onClick={clearChat}
                  data-testid="button-clear-chat"
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15 rounded-xl"
                  onClick={toggleMaximize}
                  data-testid="button-toggle-maximize"
                  title={isMaximized ? "Restore" : "Maximize"}
                >
                  {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15 rounded-xl"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-close-chatbot"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
              <div className="px-4 py-5 space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {m.role === "assistant" && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm">
                          <Leaf className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <div
                        className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                          m.role === "user"
                            ? "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-3xl rounded-br-md"
                            : "bg-muted/70 text-foreground rounded-3xl rounded-bl-md border border-border/40"
                        }`}
                      >
                        {m.content || (
                          <span className="inline-flex gap-1 items-center py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                      <Leaf className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <div className="bg-muted/70 rounded-3xl rounded-bl-md border border-border/40 px-4 py-3 inline-flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick suggestions (only when conversation is fresh) */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-4 pb-2 shrink-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  Try asking
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => handleSend(q.label)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 transition-all flex items-center gap-1.5 ${q.color}`}
                      data-testid={`quick-question-${q.label}`}
                    >
                      <q.icon className="w-3 h-3" />
                      {q.label}
                    </button>
                  ))}

                </div>
              </div>
            )}

            {/* Input area */}
            <div className="px-4 py-3 border-t border-border/40 bg-background/40 backdrop-blur-md shrink-0">
              <div className="flex items-end gap-2 rounded-2xl bg-muted/40 border border-border/60 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all p-1.5">
                <textarea
                  ref={textareaRef}
                  placeholder="Ask anything about your diet..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none resize-none px-2 py-2 text-sm placeholder:text-muted-foreground max-h-[120px] leading-relaxed"
                  data-testid="input-chat-message"
                />
                <Button
                  size="icon"
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="h-9 w-9 rounded-xl shrink-0 shadow-md shadow-primary/20 disabled:opacity-40 disabled:shadow-none"
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-[10px] text-muted-foreground/70 text-center mt-1.5">
                Press <kbd className="px-1 py-0.5 rounded bg-muted/60 font-mono">Enter</kbd> to send • <kbd className="px-1 py-0.5 rounded bg-muted/60 font-mono">Shift+Enter</kbd> for new line
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
