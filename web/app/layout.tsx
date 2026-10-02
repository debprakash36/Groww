import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppHeader from "@/components/AppHeader";
import AuthGate from "@/components/AuthGate";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Groww Assistant",
  description: "Ask Groww investing questions grounded in indexed documents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="app-shell">
          <AppHeader />
          <AuthGate>{children}</AuthGate>
        </div>
      </body>
    </html>
  );
}
