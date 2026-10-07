import type { Metadata } from "next";

import "./globals.css";
import { AuthProvider } from "../context/AuthContext";





export const metadata: Metadata = {
  title: "CAMPUSLINK",
  description: "AI-Powered Campus-to-Corporate Placement Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-campusblue-50 text-campusblue-900"
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}





