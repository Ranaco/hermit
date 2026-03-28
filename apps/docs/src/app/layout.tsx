import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const docsSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-docs-sans",
});

const docsDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-docs-display",
});

export const metadata: Metadata = {
  title: "Hermit Docs",
  description:
    "Reference-first documentation for Hermit's architecture, security model, operator workflows, API surface, and CLI direction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${docsSans.variable} ${docsDisplay.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = window.localStorage.getItem("hermit-docs-theme");
    const theme = stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
