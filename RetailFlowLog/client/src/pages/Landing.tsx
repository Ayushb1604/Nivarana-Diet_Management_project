import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useSearch } from "wouter";
import { 
  Leaf, 
  Heart, 
  Target, 
  Sparkles, 
  ArrowRight,
  CheckCircle,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  Wind,
  Flame,
  Mountain,
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup" | "forgot">("signup");
  const [tabDirection, setTabDirection] = useState<1 | -1>(1);

  const switchTab = (tab: "login" | "signup" | "forgot", dir: 1 | -1 = 1) => {
    setTabDirection(dir);
    setAuthTab(tab);
  };

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("tab") === "login") {
      setAuthTab("login");
      setShowAuthDialog(true);
    }
  }, [search]);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Password visibility
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      if (res.ok) {
        setForgotSent(true);
      } else {
        const d = await res.json().catch(() => null);
        setForgotError(d?.message || "Something went wrong");
      }
    } catch {
      setForgotError("Could not connect. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const canSignup = useMemo(() => {
    return (
      signupEmail.trim().length > 0 &&
      signupPassword.length >= 8 &&
      signupConfirmPassword.length > 0 &&
      signupPassword === signupConfirmPassword
    );
  }, [signupEmail, signupPassword, signupConfirmPassword]);

  const passwordStrength = useMemo(() => {
    if (signupPassword.length === 0) return 0;
    let score = 0;
    if (signupPassword.length >= 8) score++;
    if (/[A-Z]/.test(signupPassword)) score++;
    if (/[0-9]/.test(signupPassword)) score++;
    if (/[^A-Za-z0-9]/.test(signupPassword)) score++;
    return score;
  }, [signupPassword]);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "bg-destructive", "bg-yellow-500", "bg-blue-500", "bg-green-500"][passwordStrength];


  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const openAuth = (tab: "login" | "signup" = "signup") => {
    setAuthTab(tab);
    setShowAuthDialog(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setLoginError(null);
    setLoginLoading(true);

    try {
      const response = await fetch("/api/login/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      if (response.ok) {
        window.location.href = "/";
        return;
      }

      const payload = await response.json().catch(() => null);
      setLoginError(payload?.message || "Invalid credentials");
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Could not login");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSignup) return;
    setSignupError(null);
    setSignupLoading(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail.trim(),
          password: signupPassword,
          firstName: signupFirstName.trim() || undefined,
          lastName: signupLastName.trim() || undefined,
        }),
      });

      if (response.ok) {
        window.location.href = "/";
        return;
      }

      const payload = await response.json().catch(() => null);
      setSignupError(payload?.message || "Could not create account");
    } catch (err) {
      console.error("Signup error:", err);
      setSignupError("Could not create account");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight">NIVARANA</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {([{label:"Features",id:"features"},{label:"How It Works",id:"how-it-works"},{label:"Doshas",id:"doshas"},{label:"Testimonials",id:"testimonials"}] as const).map(({label,id})=>(
                <button key={id} onClick={()=>scrollToSection(id)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
                  data-testid={`link-${id}`}>{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button onClick={()=>openAuth("signup")} className="shadow-md shadow-primary/20" data-testid="button-login">Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-gentle" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-gentle" style={{ animationDelay: "1s" }} />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-full text-sm font-semibold mb-8 shadow-sm">
                <Sparkles className="w-4 h-4" />
                Ancient Wisdom, Modern Wellness
              </span>
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Discover Your Path to
              <span className="block gradient-text mt-2">Balanced Living</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Unlock personalized Ayurvedic meal plans tailored to your unique constitution. 
              Take our dosha assessment and transform your relationship with food.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Button 
                size="lg" 
                className="text-base px-8 gap-2" 
                onClick={() => openAuth("signup")}
                data-testid="button-hero-cta"
              >
                Start Your Journey
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8"
                onClick={() => scrollToSection("how-it-works")}
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 mt-16 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              {([
                { value:"70+", label:"Foods Analyzed", sub:"All dosha types" },
                { value:"10",  label:"Health Goals",   sub:"Targeted guidance" },
                { value:"30",  label:"Quiz Questions", sub:"Science-backed" },
                { value:"3",   label:"Dosha Types",    sub:"For every body" },
              ] as const).map(s=>(
                <div key={s.label} className="text-center px-6 py-5 rounded-2xl bg-card/70 border border-border/60 backdrop-blur-sm hover:bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default min-w-[120px]">
                  <div className="text-4xl font-bold gradient-text-primary stat-number">{s.value}</div>
                  <div className="text-sm font-semibold text-foreground mt-1">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <button 
          onClick={() => scrollToSection("features")}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float"
          data-testid="button-scroll-down"
        >
          <ChevronDown className="w-8 h-8 text-muted-foreground" />
        </button>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Platform Features
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Everything You Need for Holistic Wellness
            </h2>
            <div className="section-divider mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform combines ancient Ayurvedic wisdom with modern technology
              to deliver deeply personalized nutrition guidance.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 card-hover border-border/60 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-primary/10 transition-colors duration-300" />
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-7 h-7 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">30 Questions</span>
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">Dosha Assessment</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Answer 30 carefully crafted questions to discover your unique Ayurvedic constitution
                  and understand your body's natural tendencies.
                </p>
              </div>
            </Card>
            <Card className="p-8 card-hover border-border/60 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-accent/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-accent/10 transition-colors duration-300" />
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Leaf className="w-7 h-7 text-accent-foreground" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">70+ Foods</span>
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">Personalized Food Lists</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Receive tiered food recommendations based on your dosha — from highly favorable
                  choices to foods best avoided for your constitution.
                </p>
              </div>
            </Card>
            <Card className="p-8 card-hover border-border/60 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-primary/10 transition-colors duration-300" />
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Heart className="w-7 h-7 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">10 Goals</span>
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">Health Goals</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Choose from 10 specific health goals like immunity, digestion, or weight management
                  for even more targeted recommendations.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <CheckCircle className="w-3.5 h-3.5" /> Simple Process
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Your Journey to Balance
            </h2>
            <div className="section-divider mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Getting started with personalized Ayurvedic nutrition is simple and intuitive.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Create Account", description: "Sign up and enter your basic health information like height and weight." },
              { step: "2", title: "Take the Quiz", description: "Complete our 30-question dosha assessment to determine your constitution." },
              { step: "3", title: "Get Your Profile", description: "View your unique dosha breakdown with detailed explanations." },
              { step: "4", title: "Explore Foods", description: "Browse personalized food recommendations organized by favorability." },
            ].map((item, index) => (
              <div key={item.step} className="relative group">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary/20 group-hover:scale-105 group-hover:shadow-primary/30 transition-all duration-300">
                    {item.step}
                  </div>
                  <h3 className="font-serif text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-gradient-to-r from-primary/40 to-border border-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doshas Section */}
      <section id="doshas" className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Ayurvedic Science
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
              The Three Doshas
            </h2>
            <div className="section-divider mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              In Ayurveda, each person has a unique combination of three fundamental energies
              that govern their physical and mental characteristics.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border-t-4 border-t-vata hover-elevate transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-vata/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-vata" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold">Vata</h3>
                  <p className="text-sm text-muted-foreground">Air + Space</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Governs movement and communication. Vata types are creative, quick-thinking, 
                and energetic with variable energy levels.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Creative", "Quick", "Light", "Mobile"].map((quality) => (
                  <span key={quality} className="px-3 py-1 bg-vata/10 text-vata-foreground rounded-full text-xs">
                    {quality}
                  </span>
                ))}
              </div>
            </Card>
            
            <Card className="p-8 border-t-4 border-t-pitta hover-elevate transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-pitta/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-pitta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold">Pitta</h3>
                  <p className="text-sm text-muted-foreground">Fire + Water</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Governs metabolism and transformation. Pitta types are sharp-minded, ambitious, 
                and passionate with strong digestion.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Intense", "Sharp", "Hot", "Determined"].map((quality) => (
                  <span key={quality} className="px-3 py-1 bg-pitta/10 text-pitta-foreground rounded-full text-xs">
                    {quality}
                  </span>
                ))}
              </div>
            </Card>
            
            <Card className="p-8 border-t-4 border-t-kapha hover-elevate transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-kapha/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-kapha" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold">Kapha</h3>
                  <p className="text-sm text-muted-foreground">Earth + Water</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Governs structure and stability. Kapha types are calm, steady, and nurturing 
                with excellent stamina and memory.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Steady", "Calm", "Strong", "Nurturing"].map((quality) => (
                  <span key={quality} className="px-3 py-1 bg-kapha/10 text-kapha-foreground rounded-full text-xs">
                    {quality}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Heart className="w-3.5 h-3.5" /> User Stories
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">Transforming Lives Through Ayurveda</h2>
            <div className="section-divider" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {([
              { name:"Priya Sharma", role:"Yoga Instructor", text:"Nivarana completely changed how I think about food. Understanding my Vata constitution helped me fix years of digestive issues naturally.", avatar:"PS" },
              { name:"Arjun Mehta", role:"Software Engineer", text:"I was skeptical at first, but the dosha assessment was spot-on. My energy levels have improved dramatically following the food recommendations.", avatar:"AM" },
              { name:"Deepa Nair", role:"Wellness Coach", text:"The personalized food lists are incredibly detailed. I now recommend Nivarana to all my clients as the starting point for Ayurvedic wellness.", avatar:"DN" },
            ] as const).map(({name,role,text,avatar})=>(
              <div key={name} className="card-hover p-8 rounded-2xl bg-card border border-border/60 flex flex-col gap-4">
                <div className="flex gap-0.5 mb-1">
                  {[1,2,3,4,5].map(i=><span key={i} className="text-accent text-base">★</span>)}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1 italic">"{text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">{avatar}</div>
                  <div>
                    <div className="text-sm font-semibold">{name}</div>
                    <div className="text-xs text-muted-foreground">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-primary-foreground">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Free to Start
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Ready to Discover<br />Your True Dosha?
          </h2>
          <p className="text-primary-foreground/80 mb-10 max-w-xl mx-auto text-lg">
            Join thousands who have transformed their health through personalized Ayurvedic nutrition.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-10 gap-2 shadow-xl"
              onClick={()=>openAuth("signup")} data-testid="button-cta-signup">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Button>
            <button onClick={()=>scrollToSection("features")}
              className="text-primary-foreground/80 hover:text-primary-foreground text-sm underline underline-offset-4 transition-colors">
              Explore features first
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-xl font-bold">NIVARANA</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Personalized Ayurvedic Diet Management. Ancient wisdom meets modern wellness.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {([{label:"Features",id:"features"},{label:"How It Works",id:"how-it-works"},{label:"The Doshas",id:"doshas"}] as const).map(({label,id})=>(
                  <li key={id}><button onClick={()=>scrollToSection(id)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{label}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Account</h4>
              <ul className="space-y-2.5">
                <li><button onClick={()=>openAuth("signup")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign Up Free</button></li>
                <li><button onClick={()=>openAuth("login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Log In</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Nivarana. All rights reserved.</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              Made with <Heart className="w-3.5 h-3.5 text-destructive" /> for wellness
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Dialog — premium split panel */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent
          className="max-w-3xl p-0 gap-0 overflow-hidden border-0 rounded-3xl"
          data-testid="dialog-auth"
          style={{ boxShadow: "0 30px 80px -12px rgba(0,0,0,0.4)" }}
        >
          <div className="flex h-full">
            {/* Left decorative panel */}
            <div className="hidden sm:flex w-[42%] relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex-col items-center justify-center p-8 text-primary-foreground overflow-hidden">
              <div className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute bottom-[-40px] left-[-40px] w-40 h-40 rounded-full bg-white/5 blur-2xl" />

              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}
                className="absolute top-8 left-6 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Wind className="w-4 h-4 text-blue-200" />
              </motion.div>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 5, delay: 1 }}
                className="absolute top-14 right-6 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Flame className="w-4 h-4 text-orange-200" />
              </motion.div>
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 6, delay: 2 }}
                className="absolute bottom-16 right-8 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Mountain className="w-4 h-4 text-green-200" />
              </motion.div>

              <div className="relative z-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-5 ring-1 ring-white/20">
                  <Leaf className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl font-bold mb-3 leading-tight">
                  {authTab === "login" ? "Welcome\nback!" : "Start your\njourney"}
                </h3>
                <p className="text-primary-foreground/70 text-xs leading-relaxed">
                  {authTab === "login"
                    ? "Reconnect with your Ayurvedic wellness profile."
                    : "Join thousands discovering the power of Ayurveda."}
                </p>
                <div className="mt-6 space-y-2 text-left">
                  {["Personalized dosha assessment", "AI-powered meal guidance", "Track wellness progress"].map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-primary-foreground/80">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex flex-col">
              {/* Tabs — only show for login/signup */}
              {authTab !== "forgot" && (
              <div className="px-7 pt-7 pb-4">
                <div className="relative grid grid-cols-2 rounded-2xl p-1 bg-muted/40 border border-border/50">
                  {/* Sliding pill indicator */}
                  <motion.div
                    layout
                    layoutId="tab-pill"
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-xl shadow-md"
                    style={{ left: authTab === "login" ? "4px" : "calc(50%)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                  {(["login", "signup"] as const).map(tab => (
                    <button key={tab} onClick={() => switchTab(tab, tab === "signup" ? 1 : -1)}
                      className={`relative z-10 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 ${
                        authTab === tab ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`tab-${tab}`}>
                      {tab === "login" ? "Log In" : "Sign Up"}
                    </button>
                  ))}
                </div>
              </div>
              )}

              <div className="flex-1">
                {authTab === "login" ? (
                  <form onSubmit={handleLogin} className="px-7 pb-7 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Email address</label>
                      <Input type="email" placeholder="you@example.com" value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)} disabled={loginLoading}
                        className="h-10 bg-muted/30 border-border/60" data-testid="input-login-email" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Password</label>
                        <button type="button" onClick={() => switchTab("forgot", 1)}
                          className="text-xs text-primary hover:underline font-medium">Forgot password?</button>
                      </div>
                      <div className="relative">
                        <Input type={showLoginPw ? "text" : "password"} placeholder="••••••••"
                          value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                          disabled={loginLoading} className="h-10 bg-muted/30 border-border/60 pr-10"
                          data-testid="input-login-password" />
                        <button type="button" onClick={() => setShowLoginPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {loginError && (
                      <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                        {loginError}
                      </div>
                    )}
                    <Button type="submit" className="w-full h-10 gap-2 font-semibold"
                      disabled={loginLoading || !loginEmail.trim() || !loginPassword}
                      data-testid="button-login-submit">
                      {loginLoading ? <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Signing in...</> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      New here?{" "}
                      <button type="button" onClick={() => switchTab("signup", 1)}
                        className="text-primary font-semibold hover:underline" data-testid="link-switch-to-signup">
                        Create account
                      </button>
                    </p>
                  </form>
                ) : authTab === "signup" ? (
                  <form onSubmit={handleSignup} className="px-7 pb-7 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">First name</label>
                        <Input placeholder="Aarav" value={signupFirstName}
                          onChange={e => setSignupFirstName(e.target.value)} disabled={signupLoading}
                          className="h-10 bg-muted/30 border-border/60" data-testid="input-signup-firstname" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Last name</label>
                        <Input placeholder="Sharma" value={signupLastName}
                          onChange={e => setSignupLastName(e.target.value)} disabled={signupLoading}
                          className="h-10 bg-muted/30 border-border/60" data-testid="input-signup-lastname" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Email address</label>
                      <Input type="email" placeholder="you@example.com" value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)} disabled={signupLoading}
                        className="h-10 bg-muted/30 border-border/60" data-testid="input-signup-email" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Password</label>
                      <div className="relative">
                        <Input type={showSignupPw ? "text" : "password"} placeholder="At least 8 characters"
                          value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                          disabled={signupLoading} className="h-10 bg-muted/30 border-border/60 pr-10"
                          data-testid="input-signup-password" />
                        <button type="button" onClick={() => setShowSignupPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showSignupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signupPassword.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex gap-1 h-1">
                            {[1,2,3,4].map(i => (
                              <div key={i} className={`flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor : "bg-muted"}`} />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">{strengthLabel} password</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Confirm password</label>
                      <div className="relative">
                        <Input type={showConfirmPw ? "text" : "password"} placeholder="Repeat password"
                          value={signupConfirmPassword} onChange={e => setSignupConfirmPassword(e.target.value)}
                          disabled={signupLoading}
                          className={`h-10 bg-muted/30 border-border/60 pr-10 ${signupConfirmPassword && signupPassword !== signupConfirmPassword ? "border-destructive/60" : ""}`}
                          data-testid="input-signup-confirm" />
                        <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signupConfirmPassword && signupPassword !== signupConfirmPassword && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                    </div>
                    {signupError && (
                      <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                        {signupError}
                      </div>
                    )}
                    <Button type="submit" className="w-full h-10 gap-2 font-semibold"
                      disabled={!canSignup || signupLoading} data-testid="button-signup-submit">
                      {signupLoading ? <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Creating...</> : <>Get started free <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Have an account?{" "}
                      <button type="button" onClick={() => switchTab("login", -1)}
                        className="text-primary font-semibold hover:underline" data-testid="link-switch-to-login">
                        Sign in
                      </button>
                    </p>
                  </form>
                ) : (
                  <div className="px-7 py-6 space-y-4">
                    {forgotSent ? (
                      <div className="text-center py-4 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <CheckCircle className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-serif text-xl font-bold mb-1">Check your email</h3>
                          <p className="text-sm text-muted-foreground">We sent a reset link to <span className="font-medium text-foreground">{forgotEmail}</span>. Check your inbox and spam folder.</p>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => { setForgotSent(false); setForgotEmail(""); switchTab("login", -1); }}>
                          Back to Sign in
                        </Button>
                        <button type="button" onClick={() => { setForgotSent(false); }}
                          className="text-xs text-primary hover:underline block mx-auto">
                          Resend email
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleForgot} className="space-y-4">
                        <div>
                          <button type="button" onClick={() => switchTab("login", -1)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Sign in
                          </button>
                          <h3 className="font-serif text-xl font-bold mb-1">Forgot password?</h3>
                          <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Email address</label>
                          <Input type="email" placeholder="you@example.com" value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)} disabled={forgotLoading}
                            className="h-10 bg-muted/30 border-border/60" />
                        </div>
                        {forgotError && (
                          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{forgotError}</div>
                        )}
                        <Button type="submit" className="w-full h-10 gap-2 font-semibold" disabled={!forgotEmail.trim() || forgotLoading}>
                          {forgotLoading ? <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Sending...</> : <>Send reset link <ArrowRight className="w-4 h-4" /></>}
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
