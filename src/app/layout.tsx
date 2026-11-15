import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import { FloatingChatbot } from "@/components/chat/FloatingChatbot";

export const metadata: Metadata = {
  title: "LabLens AI — Smart Laboratory Fault Reporting & Equipment Intelligence",
  description:
    "Centralized equipment fault reporting, AI-assisted triage suggestions, and maintenance tracking for academic engineering laboratories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col bg-[#F5F5F7] text-[#1D1D1F] antialiased">
        <AuthProvider>
          <ChatProvider>
            <Navbar />
            <main className="flex-1" id="top">
              {children}
            </main>
            <Footer />
            <FloatingChatbot />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
