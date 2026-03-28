import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const hermitSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-hermit-sans",
});

const hermitDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-hermit-display",
});

export const metadata: Metadata = {
  title: "Hermit | Secret Operations Control Plane",
  description:
    "Hermit is a multi-tenant KMS and secret operations control plane for vaults, keys, policies, reveal flows, and audit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${hermitSans.variable} ${hermitDisplay.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
