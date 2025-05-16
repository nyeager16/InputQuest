import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "InputQuest",
  description: "Comprehensible Input Language Learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <div className="flex min-h-screen">
          {/* Fixed Sidebar */}
          <Sidebar />

          {/* Main Content - Scrollable */}
          <main className="flex-1 overflow-y-auto h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

