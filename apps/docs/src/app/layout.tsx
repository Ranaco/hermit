import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hermit Docs",
  description:
    "Architecture, security model, and operator workflows for the Hermit multi-tenant KMS and secret operations platform.",
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
