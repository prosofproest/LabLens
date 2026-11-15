"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SimulatedRoleBanner } from "@/components/auth/SimulatedRoleBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, actualRole, activeRoleView, isRoleSimulated, missingProfile, loading, setActiveRoleView } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (missingProfile) {
        router.push("/complete-profile");
      }
    }
  }, [user, missingProfile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center" role="status">
        <div className="w-10 h-10 rounded-full border-3 border-[#E5E5EA] border-t-[#0071E3] animate-spin" />
        <p className="mt-4 text-xs font-medium text-[#656565]">
          Verifying security and user profile...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-14rem)] flex flex-col">
      {/* Persistent Simulated Role Banner */}
      {isRoleSimulated && (
        <SimulatedRoleBanner
          activeRoleView={activeRoleView}
          actualRole={actualRole}
          onReset={() => setActiveRoleView(actualRole)}
        />
      )}

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
