import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./client";
import { UserProfile, Department } from "@/types";

export async function createUserProfile(
  uid: string,
  data: {
    name: string;
    email: string;
    department: Department;
  }
): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    uid,
    name: data.name.trim(),
    email: data.email.trim(),
    role: "user", // Strictly locked to 'user' on public creation
    department: data.department,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid: d.uid,
    name: d.name,
    email: d.email,
    role: d.role,
    department: d.department,
    createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
  };
}

export async function updateUserProfile(
  uid: string,
  data: {
    name?: string;
    department?: Department;
  }
): Promise<void> {
  const userRef = doc(db, "users", uid);
  const payload: Record<string, string> = {};
  if (data.name) payload.name = data.name.trim();
  if (data.department) payload.department = data.department;
  await updateDoc(userRef, payload);
}

