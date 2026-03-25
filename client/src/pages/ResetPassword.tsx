import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Leaf } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ResetPassword() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        setTokenValid(!!data.valid);
      } catch {
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    }
    if (!token) {
      setTokenValid(false);
      setValidating(false);
      return;
    }
    void validate();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password !== passwordConfirmation) {
      setError("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirmation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not reset password");
        return;
      }
      setSuccess("Password reset successful. You can now login with your new password.");
      setPassword("");
      setPasswordConfirmation("");
    } catch {
      setError("Unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-7 w-7 text-primary" />
            <span className="font-serif text-xl font-semibold">NIVARANA</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Reset password</CardTitle>
            <CardDescription>Set a new secure password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {validating ? (
              <p className="text-sm text-muted-foreground">Validating reset link...</p>
            ) : !tokenValid ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">This reset link is invalid or expired.</p>
                <Link href="/forgot-password"><a className="text-sm underline">Request a new reset link</a></Link>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="text-sm font-medium">New password</label>
                  <Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Confirm new password</label>
                  <Input type="password" minLength={8} value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-primary">{success}</p>}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Resetting..." : "Reset password"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  <Link href="/login"><a className="underline">Back to login</a></Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
