"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, actualRole, login, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to proper dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.push(actualRole === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, actualRole, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    try {
      setSubmitting(true);
      await login(email, password);
      // Auth listener handles redirection
    } catch (err: unknown) {
      console.error("Login failed:", err);
      const code = (err as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Invalid email or password. Please verify your credentials.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please wait a few moments before trying again.");
      } else {
        setError("Authentication error. Please check your network connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
      <AuthCard
        title="Sign In to LabLens AI"
        subtitle="Access your laboratory fault reporting and equipment tracking portal."
        footer={
          <p>
            Don&apos;t have an account yet?{" "}
            <Link
              href="/register"
              className="font-medium text-[#0071E3] hover:underline"
            >
              Register here
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#FEE2E2]/60 border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="College Email"
            type="email"
            placeholder="student@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign In"}
              {!submitting && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}

