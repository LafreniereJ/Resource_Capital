import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { Onboarding } from "@/components/Onboarding";
import PostHogProvider from "@/components/PostHogProvider";
import { SubscriptionProvider } from "@/components/providers/SubscriptionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resource Capital | Mining Intelligence Platform",
  description: "Real-time mining sector intelligence: stocks, news, financials, and market data for Canadian mining companies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: 'var(--color-bg-base)' }}
      >
        <ThemeProvider>
          <AuthProvider>
            <PostHogProvider>
              <SubscriptionProvider>
                <ToastProvider>
                  <Navbar />
                  {children}
                  <Onboarding />
                </ToastProvider>
              </SubscriptionProvider>
            </PostHogProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
