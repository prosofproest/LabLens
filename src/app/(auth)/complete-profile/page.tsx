"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input } from "@/components/ui/Input";
import { DepartmentSelect } from "@/components/auth/DepartmentSelect";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { Department } from "@/types";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, userProfile, missingProfile, retryCreateProfile, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If not authenticated, send to login
    if (!authLoading && !user) {
      router.push("/login");
    }
    // If profile is already complete, send to dashboard
    if (!authLoading && user && !missingProfile && userProfile) {
      router.push("/dashboard");
    }
  }, [user, userProfile, missingProfile, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please provide your full name.");
      return;
    }
    if (!department) {
      setError("Please select your academic engineering department.");
      return;
    }

    try {
      setSubmitting(true);
      await retryCreateProfile(name.trim(), department as Department);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Profile recovery error:", err);
      setError("Failed to initialize profile. Please check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-6">
      <AuthCard
        title="Complete Your Profile"
        subtitle="Your authentication account is ready. Please finalize your academic profile to proceed."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#EBF5FF] border border-[#B9E1FF] text-xs text-[#0071E3] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Authenticated account: <strong>{user?.email}</strong></span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[#FEE2E2]/60 border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <DepartmentSelect
            label="Engineering Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department)}
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
              {submitting ? "Finalizing profile..." : "Save Profile & Enter Platform"}
            </Button>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
