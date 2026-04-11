import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hudson's Epic Quest - Fraction Adventure Game",
  description:
    "Help Hudson solve fraction puzzles, defeat monsters, and save the kingdom! A fun math learning game for kids.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
