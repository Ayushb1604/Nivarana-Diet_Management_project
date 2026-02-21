import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Sparkles, Star } from "lucide-react";

interface CelebrationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

export function Celebration({ show, message = "Congratulations!", onComplete }: CelebrationProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!mounted || !show) return null;

  const confetti = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 2,
  }));

  const content = (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="absolute w-2 h-2 rounded-full animate-bounce"
            style={{
              left: `${c.left}%`,
              top: "-10px",
              backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Celebration Message */}
      <div className="relative z-10 animate-in zoom-in-95 duration-500">
        <div className="bg-background/95 backdrop-blur-md border-2 border-primary rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CheckCircle className="w-16 h-16 text-primary animate-in zoom-in-95" />
              <Sparkles className="w-8 h-8 text-accent absolute -top-2 -right-2 animate-spin" style={{ animationDuration: "2s" }} />
            </div>
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground mb-2">{message}</h2>
          <p className="text-muted-foreground">You've completed an important step!</p>
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-in zoom-in-95"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

