import type { Metadata } from "next";
import "./globals.css";

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
      <body>
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
