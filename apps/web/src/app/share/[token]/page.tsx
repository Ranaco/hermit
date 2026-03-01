"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useConsumeShare } from "@/hooks/use-shares";
import { shareService } from "@/services/share.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Eye, Lock, Unlock, KeyRound, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function ConsumeSharePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [passphrase, setPassphrase] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<"expired" | "consumed" | "invalid_passphrase" | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch metadata first
  const { data: metadata, isLoading: metadataLoading, isError: metadataError } = useQuery({
    queryKey: ["shareMetadata", token],
    queryFn: () => shareService.getShareMetadata(token),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { mutate: consumeShare, isPending: isConsuming } = useConsumeShare();

  useEffect(() => {
    const shareData = metadata?.data;
    if (shareData?.status && shareData.status !== "active") {
      setErrorStatus(shareData.status as any);
    }
  }, [metadata]);

  const shareData = metadata?.data;

  const handleConsume = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);
    consumeShare(
      { token, passphrase },
      {
        onSuccess: (data: any) => {
          setIsRevealed(true);
          setRevealedValue(data.data.value);
        },
        onError: (err: any) => {
          const msg = err.response?.data?.error?.message?.toLowerCase();
          if (msg?.includes("passphrase")) {
            setErrorStatus("invalid_passphrase");
          } else if (msg?.includes("expired")) {
            setErrorStatus("expired");
          } else if (msg?.includes("consumed")) {
            setErrorStatus("consumed");
          }
        },
      }
    );
  };

  const handleCopy = () => {
    if (revealedValue) {
      navigator.clipboard.writeText(revealedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (metadataLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Pre-calculate gradient styling for dynamic background
  const animatedBgStyle = {
    background: `radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.15) 0%, transparent 50%), 
                 radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 40%)`,
    backgroundColor: "#050510",
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden isolate" style={animatedBgStyle}>
      {/* Dynamic Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[10000ms]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

      <main className="relative z-10 w-full max-w-lg px-4 flex flex-col items-center">
        {/* Logo/Branding */}
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-2xl shadow-indigo-500/20">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white/90 drop-shadow-md">
            Hermes <span className="text-indigo-400 font-light">Secure Share</span>
          </h1>
        </div>

        {/* Card Container */}
        <div className="w-full bg-white/5 backdrop-blur-[40px] border border-white/10 p-8 rounded-[32px] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all duration-300">
          
          {errorStatus === "consumed" || errorStatus === "expired" || metadataError ? (
            <div className="text-center space-y-6 py-4">
              <div className="mx-auto w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.2)]">
                <AlertTriangle className="w-10 h-10 text-rose-400" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {errorStatus === "expired" ? "Link Expired" : "Secret Destroyed"}
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-[300px] mx-auto">
                {errorStatus === "expired" 
                  ? "This secure link has lived past its expiration date and the contents have been securely destroyed." 
                  : "This secret has already been viewed. For security, one-time shares are permanently destroyed immediately upon first view."}
              </p>
            </div>
          ) : isRevealed ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30">
                    <Unlock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-emerald-400 font-medium tracking-wide text-sm uppercase">Secret Revealed</h3>
                </div>
                <div className="bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                  <span className="text-rose-400 text-xs font-medium">Link Destroyed</span>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-[#0A0A0A] p-6 rounded-2xl border border-white/10 shadow-inner">
                  <pre className="text-sm font-mono text-emerald-300 whitespace-pre-wrap word-break-all max-h-[400px] overflow-y-auto">
                    {revealedValue}
                  </pre>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleCopy}
                  className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl transition-all font-medium flex items-center justify-center gap-2"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied securely" : "Copy to clipboard"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Encrypted Message</h2>
                <p className="text-white/60 text-sm">
                  You've received a secure, one-time secret. Once you reveal it, it will be permanently deleted from our servers.
                </p>
              </div>

              {shareData?.metadata?.note && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6">
                  <p className="text-indigo-200 text-sm italic">
                    <span className="font-semibold text-indigo-400">Note: </span>
                    {shareData.metadata.note}
                  </p>
                </div>
              )}

              <form onSubmit={handleConsume} className="space-y-6">
                {shareData?.metadata?.requirePassphrase && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white/80 pb-1">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <label className="text-sm font-medium tracking-wide">Passphrase Required</label>
                    </div>
                    <div className="relative">
                      <Input
                        type="password"
                        required
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder="Enter the passphrase to decrypt"
                        className={`h-12 bg-black/40 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${
                          errorStatus === "invalid_passphrase" ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""
                        }`}
                      />
                    </div>
                    {errorStatus === "invalid_passphrase" && (
                      <p className="text-rose-400 text-xs font-medium animate-in slide-in-from-top-1">
                        Incorrect passphrase. Please try again.
                      </p>
                    )}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isConsuming || (shareData?.metadata?.requirePassphrase && !passphrase)}
                  className="w-full h-14 bg-gradient-to-r from-indigo-500 hover:from-indigo-600 to-purple-600 hover:to-purple-700 text-white rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all font-semibold text-lg flex items-center justify-center gap-2 relative overflow-hidden group border border-white/10"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                  <span className="relative z-10 flex items-center gap-2">
                    {isConsuming ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Eye className="w-5 h-5" />
                        Reveal Secret Now
                      </>
                    )}
                  </span>
                </Button>
              </form>

              <p className="text-center text-xs text-white/40 mt-6 px-4">
                Powered by Hermes KMS • End-to-End Encrypted
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
