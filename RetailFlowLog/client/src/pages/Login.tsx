import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { Leaf, Wind, Flame, Mountain, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/login/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.ok) {
        window.location.href = "/";
        return;
      }

      const payload = await response.json().catch(() => null);
      setError(payload?.message || "Invalid email or password");
    } catch (err) {
      setError("Could not connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex-col items-center justify-center p-12 text-primary-foreground">
        {/* Background circles */}
        <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/[0.03] blur-3xl" />

        {/* Floating dosha icons */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="absolute top-16 left-10 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm"
        >
          <Wind className="w-6 h-6 text-blue-200" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
          className="absolute top-24 right-12 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm"
        >
          <Flame className="w-6 h-6 text-orange-200" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-20 right-14 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm"
        >
          <Mountain className="w-6 h-6 text-green-200" />
        </motion.div>

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md flex items-center justify-center mx-auto mb-8 ring-1 ring-white/20 shadow-2xl">
            <Leaf className="w-10 h-10" />
          </div>
          <h1 className="font-serif text-4xl font-bold mb-4 leading-tight">
            Welcome back to<br />NIVARANA
          </h1>
          <p className="text-primary-foreground/75 text-base leading-relaxed mb-10">
            Your personalized Ayurvedic wellness journey continues here. Reconnect with your dosha profile and today's guidance.
          </p>

          {/* Dosha pills */}
          <div className="flex gap-3 justify-center flex-wrap">
            {[
              { label: "Vata", icon: Wind, color: "text-blue-200 bg-blue-400/20" },
              { label: "Pitta", icon: Flame, color: "text-orange-200 bg-orange-400/20" },
              { label: "Kapha", icon: Mountain, color: "text-green-200 bg-green-400/20" },
            ].map(({ label, icon: Icon, color }) => (
              <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${color} text-xs font-semibold`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="absolute bottom-10 left-10 right-10 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15"
        >
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Sparkles key={i} className="w-3.5 h-3.5 text-yellow-300" />
            ))}
          </div>
          <p className="text-xs text-primary-foreground/80 leading-relaxed italic">
            "NIVARANA completely changed how I eat. My energy levels are incredible!"
          </p>
          <p className="text-xs font-semibold mt-1.5">— Priya S., Pitta type</p>
        </motion.div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        {/* Top nav */}
        <nav className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <button className="flex items-center gap-2 group" onClick={() => setLocation("/")}>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Leaf className="h-4 w-4 text-primary" />
            </div>
            <span className="font-serif font-semibold text-foreground lg:hidden">NIVARANA</span>
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">New here?</span>
            <Button variant="outline" size="sm" onClick={() => setLocation("/signup")}>
              Create account
            </Button>
          </div>
        </nav>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm"
          >
            <div className="mb-8">
              <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Sign in</h2>
              <p className="text-muted-foreground text-sm">Enter your email and password to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-11 bg-muted/30 border-border/60 focus:border-primary/60 focus:ring-primary/20"
                  data-testid="input-email"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11 bg-muted/30 border-border/60 focus:border-primary/60 focus:ring-primary/20 pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 gap-2 shadow-md shadow-primary/20 text-sm font-semibold"
                disabled={isLoading || !email.trim() || !password}
                data-testid="button-login"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>Sign in <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Don't have an account?{" "}
              <button onClick={() => setLocation("/signup")} className="text-primary font-semibold hover:underline">
                Sign up free
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
