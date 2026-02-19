import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";
import {
  Leaf,
  Heart,
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  ChevronDown,
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-7 w-7 text-primary" />
              <span className="font-serif text-xl font-semibold text-foreground">NIVARANA</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => scrollToSection("features")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-features"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection("how-it-works")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-how-it-works"
              >
                How It Works
              </button>
              <button 
                onClick={() => scrollToSection("doshas")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-doshas"
              >
                Doshas
              </button>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                onClick={() => setLocation("/signup")}
                data-testid="button-login"
              >
                Get Started
              </Button>
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
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                Ancient Wisdom, Modern Wellness
              </span>
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Discover Your Path to
              <span className="block text-primary mt-2">Balanced Living</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Unlock personalized Ayurvedic meal plans tailored to your unique constitution. 
              Take our dosha assessment and transform your relationship with food.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Button
                size="lg"
                className="text-base px-8 gap-2"
                onClick={() => setLocation("/signup")}
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
            <div className="flex flex-wrap justify-center gap-8 mt-16 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">70+</div>
                <div className="text-sm text-muted-foreground">Foods Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">10</div>
                <div className="text-sm text-muted-foreground">Health Goals</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">30</div>
                <div className="text-sm text-muted-foreground">Quiz Questions</div>
              </div>
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
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need for Holistic Wellness
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform combines ancient Ayurvedic wisdom with modern technology 
              to deliver personalized nutrition guidance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover-elevate transition-all duration-300">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3">Dosha Assessment</h3>
              <p className="text-muted-foreground">
                Answer 30 carefully crafted questions to discover your unique Ayurvedic constitution 
                and understand your body's natural tendencies.
              </p>
            </Card>
            
            <Card className="p-8 hover-elevate transition-all duration-300">
              <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <Leaf className="w-7 h-7 text-accent-foreground" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3">Personalized Food Lists</h3>
              <p className="text-muted-foreground">
                Receive tiered food recommendations based on your dosha, from highly favorable 
                choices to foods to avoid.
              </p>
            </Card>
            
            <Card className="p-8 hover-elevate transition-all duration-300">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Heart className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3">Health Goals</h3>
              <p className="text-muted-foreground">
                Choose from 10 specific health goals like immunity, digestion, or weight management 
                for even more targeted recommendations.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Your Journey to Balance
            </h2>
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
              <div key={item.step} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-serif text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-border" />
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
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
              The Three Doshas
            </h2>
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

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
            Ready to Discover Your Dosha?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of others who have transformed their health through personalized 
            Ayurvedic nutrition. Start your journey today.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="text-base px-8 gap-2"
            onClick={() => setLocation("/signup")}
            data-testid="button-cta-signup"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-serif text-lg font-semibold">NIVARANA</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Personalized Ayurvedic Diet Management
            </p>
            <div className="flex items-center gap-6">
              <span className="text-sm text-muted-foreground">
                Made with <Heart className="inline w-4 h-4 text-destructive" /> for wellness
              </span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
