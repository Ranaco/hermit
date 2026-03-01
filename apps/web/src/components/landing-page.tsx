"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { ShaderAnimation } from "./ui/shader-lines";
import { Logo } from "./ui/logo";

export function LandingPage() {
  return (
    // Force dark mode for the landing page to match the premium dark aesthetic
    <div className="dark min-h-screen bg-background text-foreground selection:bg-primary/30 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <ShaderAnimation />

      {/* Very subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navbar */}
        <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="font-bold text-xl tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-white/10 glow">
                <Logo className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="tracking-[0.1em] font-black uppercase text-foreground drop-shadow-md">Hermes</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#use-cases" className="hover:text-foreground transition-colors">
              Use Cases
            </Link>
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#about" className="hover:text-foreground transition-colors">
              About
            </Link>
          </nav>

          <Link
            href="/login"
            className="hidden md:inline-flex h-10 items-center justify-center rounded-full bg-foreground text-background px-6 text-sm font-medium transition-transform hover:scale-105"
          >
            Learn More <ArrowUpRight className="ml-2 w-4 h-4" />
          </Link>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center pt-24 pb-16 px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-foreground backdrop-blur-md mb-8">
            <Sparkles className="w-4 h-4 mr-2 text-primary" />
            <span className="opacity-90">Now with Smart Key Integration</span>
          </div>

          {/* Headline */}
          <h1 className="max-w-4xl text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 inline-block bg-gradient-to-b from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            Turn Secrets <br />
            Into Security.
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
            Automate key rotation, enforce strict access policies, and protect your infrastructure 24/7 — powered by enterprise-grade encryption.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-24">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full bg-foreground text-background px-8 text-base font-medium transition-all hover:scale-105 shadow-[0_0_30px_-5px_var(--color-primary)] hover:shadow-[0_0_45px_-5px_var(--color-primary)] ring-1 ring-foreground/20"
            >
              Get Started <ArrowUpRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              href="#demo"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white/5 border border-white/10 text-foreground px-8 text-base font-medium transition-all hover:bg-white/10 hover:scale-105 backdrop-blur-md"
            >
              See It in Action <ArrowUpRight className="ml-2 w-4 h-4" />
            </Link>
          </div>

          {/* Dashboard Mockup Component */}
          <div className="w-full max-w-6xl mx-auto relative group perspect">
            {/* Massive deep glow behind the mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[50%] bg-primary/40 blur-[120px] rounded-[100%] pointer-events-none -z-10" />
            
            <div className="relative rounded-2xl border border-white/10 bg-[#0a101c]/90 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-white/5 transition-transform duration-500 hover:scale-[1.01]">
              <div className="flex h-12 items-center border-b border-white/5 px-4 bg-[#0a101c]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                </div>
                <div className="mx-auto flex h-6 w-64 items-center justify-center rounded bg-white/5 text-xs text-white/40">
                  hermes.com/dashboard
                </div>
              </div>
              <div className="p-8 pb-0">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
                  alt="Hermes Dashboard Preview"
                  className="w-full h-auto rounded-t-xl opacity-90 mix-blend-screen scale-105 origin-bottom"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a101c] to-transparent pointer-events-none" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
