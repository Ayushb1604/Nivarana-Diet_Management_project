import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { Leaf, Wind, Flame, Mountain, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = useMemo(() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "bg-destructive", "bg-yellow-500", "bg-blue-500", "bg-green-500"][passwordStrength];

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.length >= 8 &&
      confirmPassword.length > 0 &&
      password === confirmPassword
    );
  }, [email, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      if (response.ok) {
        window.location.href = "/";
        return;
      }

      const payload = await response.json().catch(() => null);
      setError(payload?.message || "Could not create account");
    } catch (err) {
      setError("Could not connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "Discover your unique Dosha constitution",
    "Personalized Ayurvedic food recommendations",
    "AI-powered wellness guidance",
    "Track your health progress over time",
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex-col items-center justify-center p-12 text-primary-foreground">
        {/* Background orbs */}
        <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-white/5 blur-2xl" />

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
          className="absolute bottom-28 right-14 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm"
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
            Begin your<br />wellness journey
          </h1>
          <p className="text-primary-foreground/75 text-base leading-relaxed mb-10">
            Join thousands discovering the power of Ayurveda with personalised recommendations tailored to your unique constitution.
          </p>

          {/* Feature list */}
          <div className="space-y-3 text-left">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <span className="text-sm text-primary-foreground/85">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-8 left-10 right-10 flex items-center justify-center gap-2 text-xs text-primary-foreground/60"
        >
          <div className="h-px flex-1 bg-white/15" />
          <span className="px-3">Free forever • No credit card needed</span>
          <div className="h-px flex-1 bg-white/15" />
        </motion.div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
          <button className="flex items-center gap-2 group" onClick={() => setLocation("/")}>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Leaf className="h-4 w-4 text-primary" />
            </div>
            <span className="font-serif font-semibold text-foreground lg:hidden">NIVARANA</span>
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">Have an account?</span>
            <Button variant="outline" size="sm" onClick={() => setLocation("/login")}>
              Sign in
            </Button>
          </div>
        </nav>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm"
          >
            <div className="mb-7">
              <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Create account</h2>
              <p className="text-muted-foreground text-sm">Start your free Ayurvedic wellness journey.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">First name</label>
                  <Input
                    placeholder="Aarav"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                    className="h-11 bg-muted/30 border-border/60 focus:border-primary/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Last name</label>
                  <Input
                    placeholder="Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    className="h-11 bg-muted/30 border-border/60 focus:border-primary/60"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-11 bg-muted/30 border-border/60 focus:border-primary/60"
                  data-testid="input-email"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11 bg-muted/30 border-border/60 focus:border-primary/60 pr-10"
                    data-testid="input-password"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthColor : "bg-muted"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{strengthLabel} password</p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirm password</label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className={`h-11 bg-muted/30 border-border/60 focus:border-primary/60 pr-10 ${
                      confirmPassword && password !== confirmPassword ? "border-destructive/60" : ""
                    }`}
                    data-testid="input-confirm-password"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
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
                disabled={!canSubmit || isLoading}
                data-testid="button-signup"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <>Get started free <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                By creating an account you agree to our{" "}
                <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>{" "}
                and{" "}
                <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
              </p>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <button onClick={() => setLocation("/login")} className="text-primary font-semibold hover:underline">
                Sign in
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
