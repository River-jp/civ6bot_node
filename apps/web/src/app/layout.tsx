import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Civ6 Bot",
  description: "Civilization VI multiplayer assistant dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
