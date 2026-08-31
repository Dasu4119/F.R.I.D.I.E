import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command center — F.R.I.D.I.E.",
  description: "Turn complex goals into coordinated, explainable, and verifiable specialist work.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
