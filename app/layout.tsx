import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KING LEADFLOW AI",
  description: "Agency-first lead management and AI receptionist platform for contractor businesses."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}