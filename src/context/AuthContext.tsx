"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { createUserProfile } from "@/lib/firebase/user";
import { AuthContextType, Department, UserProfile, UserRole } from "@/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeRoleView, setActiveRoleView] = useState<UserRole>("user");
  const [missingProfile, setMissingProfile] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Computed actual role grounded in Firestore
  const actualRole: UserRole = userProfile?.role ?? "user";

  // Role is simulated only if user profile exists and the selected view differs from actual role
  const isRoleSimulated = useMemo(() => {
    if (!userProfile) return false;
    return activeRoleView !== userProfile.role;
  }, [activeRoleView, userProfile]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // 1. Clean up previous profile listener on account change or signout
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        setActiveRoleView("user");
        setMissingProfile(false);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      // 2. Attach reactive listener for the authenticated user's profile
      const userDocRef = doc(db, "users", firebaseUser.uid);
      unsubscribeProfile = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const profile: UserProfile = {
              uid: data.uid,
              name: data.name,
              email: data.email,
              role: data.role as UserRole,
              department: data.department as Department,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            };
            setUserProfile(profile);
            setMissingProfile(false);
            // Default active view to user's authentic role
            setActiveRoleView(profile.role);
          } else {
            // Profile document is missing (partial registration failure)
            setUserProfile(null);
            setMissingProfile(true);
            setActiveRoleView("user");
          }
          setLoading(false);
        },
        (error) => {
          console.error("Firestore user profile subscription error:", error);
          setLoading(false);
        }
      );
    });

    // 3. Complete cleanup on unmount
    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribeAuth();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const register = async (name: string, email: string, pass: string, dept: Department) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    try {
      await createUserProfile(cred.user.uid, {
        name,
        email,
        department: dept,
      });
    } catch (profileError) {
      console.error("Profile creation write failed during registration:", profileError);
      // Auth user was created, but profile write failed.
      // missingProfile will become true and guide user to self-healing complete-profile flow.
      throw profileError;
    }
  };

  const retryCreateProfile = async (name: string, dept: Department) => {
    if (!user || !user.email) {
      throw new Error("No authenticated account found to complete profile.");
    }
    await createUserProfile(user.uid, {
      name,
      email: user.email,
      department: dept,
    });
    setMissingProfile(false);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setActiveRoleView("user");
    setMissingProfile(false);
  };

  const value = {
    user,
    userProfile,
    actualRole,
    activeRoleView,
    isRoleSimulated,
    missingProfile,
    loading,
    login,
    register,
    logout,
    retryCreateProfile,
    setActiveRoleView,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
