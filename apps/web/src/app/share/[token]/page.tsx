"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Shield,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConsumeShare } from "@/hooks/use-shares";
import {
  shareService,
  type ConsumeShareResponse,
  type ShareMetadataResponse,
} from "@/services/share.service";

type ShareStatus = "expired" | "consumed" | "invalid_passphrase" | null;

type ShareApiError = {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
};

export default function ConsumeSharePage() {
  const params = useParams();
  const token = params.token as string;

  const [passphrase, setPassphrase] = useState("");
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<ShareStatus>(null);
  const [copied, setCopied] = useState(false);

  const { data: metadata, isLoading: metadataLoading, isError: metadataError } =
    useQuery({
      queryKey: ["shareMetadata", token],
      queryFn: (): Promise<ShareMetadataResponse> =>
        shareService.getShareMetadata(token),
      retry: false,
      refetchOnWindowFocus: false,
    });

  const { mutate: consumeShare, isPending: isConsuming } = useConsumeShare();

  useEffect(() => {
    if (metadata?.status && metadata.status !== "active") {
      setErrorStatus(metadata.status);
    }
  }, [metadata]);

  const handleConsume = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);

    consumeShare(
      { token, passphrase },
      {
        onSuccess: (payload: ConsumeShareResponse) => {
          setRevealedValue(payload.value);
        },
        onError: (error) => {
          const shareError = error as ShareApiError;
          const message = shareError.response?.data?.error?.message?.toLowerCase();

          if (message?.includes("passphrase")) {
            setErrorStatus("invalid_passphrase");
            return;
          }

          if (message?.includes("expired")) {
            setErrorStatus("expired");
            return;
          }

          if (message?.includes("consumed")) {
            setErrorStatus("consumed");
          }
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!revealedValue) {
      return;
    }

    await navigator.clipboard.writeText(revealedValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareData = metadata;
  const isRevealed = !!revealedValue;
  const isUnavailable = errorStatus === "consumed" || errorStatus === "expired" || metadataError;

  if (metadataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f19] text-white">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/72 backdrop-blur-xl">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing secure share...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f19] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,129,255,0.24),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(94,92,230,0.22),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(48,209,88,0.14),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:38px_38px] opacity-25" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1180px] items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[0.92fr_minmax(0,1.08fr)] lg:gap-10">
          <section className="hidden min-h-[620px] flex-col justify-between rounded-[32px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl lg:flex">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-black tracking-tight text-white">Hermes Secure Share</p>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">
                    One-time delivery flow
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                  Secret handoff
                </div>
                <h1 className="max-w-[11ch] text-5xl font-black tracking-tight text-white">
                  Send a secret once. Destroy access after reveal.
                </h1>
                <p className="max-w-[46ch] text-lg leading-8 text-white/62">
                  Hermes keeps shared payloads encrypted at rest, supports passphrase protection, and wipes the underlying value immediately after successful consumption.
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-[26px] border border-white/10 bg-slate-950/28 p-5">
              {[
                "Encrypted payload stays sealed until the link is redeemed.",
                "Passphrase-protected shares resist casual interception.",
                "Expired or consumed links cannot be replayed.",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-sm leading-6 text-white/64">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_80px_-28px_rgba(2,6,23,0.85)] backdrop-blur-2xl sm:p-8">
            {isUnavailable ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-rose-500/12 text-rose-300">
                  <AlertTriangle className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-white">
                    {errorStatus === "expired" ? "Link expired" : "Secret unavailable"}
                  </h2>
                  <p className="mx-auto max-w-[44ch] text-sm leading-7 text-white/62">
                    {errorStatus === "expired"
                      ? "This one-time share has passed its expiration window and the encrypted payload is no longer available."
                      : "This share has already been consumed, or the token no longer points to an active payload."}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-slate-950/26 px-5 py-4 text-sm leading-6 text-white/60">
                  Ask the sender to create a new share if the secret still needs to be delivered.
                </div>
              </div>
            ) : isRevealed ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      <Unlock className="h-3.5 w-3.5" />
                      Secret revealed
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-white">
                      One-time payload delivered
                    </h2>
                    <p className="text-sm leading-6 text-white/62">
                      The underlying link has now been consumed and cannot be used again.
                    </p>
                  </div>
                  <div className="rounded-full border border-rose-400/15 bg-rose-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
                    Link destroyed
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-950/38 p-5">
                  <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-all text-sm leading-7 text-emerald-200">
                    {revealedValue}
                  </pre>
                </div>

                <Button
                  onClick={() => void handleCopy()}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.08] text-base font-semibold text-white transition-colors hover:bg-white/[0.12]"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-300" />
                      Copied securely
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to clipboard
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/72">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    One-time reveal
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-white">
                    Open this secure payload
                  </h2>
                  <p className="max-w-[46ch] text-sm leading-7 text-white/62">
                    Once revealed, the secret is removed from future access. If the sender added a note or passphrase requirement, you&apos;ll see it below.
                  </p>
                </div>

                {shareData?.metadata?.note ? (
                  <div className="rounded-[24px] border border-primary/18 bg-primary/10 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      Sender note
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78">
                      {shareData.metadata.note}
                    </p>
                  </div>
                ) : null}

                <form onSubmit={handleConsume} className="space-y-5">
                  {shareData?.metadata?.requirePassphrase ? (
                    <div className="space-y-3 rounded-[24px] border border-white/10 bg-slate-950/26 p-5">
                      <div className="flex items-center gap-2 text-white">
                        <KeyRound className="h-4 w-4 text-amber-300" />
                        <LabelText title="Passphrase required" detail="Enter the passphrase supplied by the sender to decrypt this payload." />
                      </div>
                      <Input
                        type="password"
                        required
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder="Enter passphrase"
                        className={`h-12 border-white/10 bg-black/35 text-white placeholder:text-white/30 ${
                          errorStatus === "invalid_passphrase"
                            ? "border-rose-400/50 focus-visible:ring-rose-400/40"
                            : ""
                        }`}
                      />
                      {errorStatus === "invalid_passphrase" ? (
                        <p className="text-sm leading-6 text-rose-300">
                          The passphrase was rejected. Confirm it with the sender and try again.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-white/10 bg-slate-950/26 px-5 py-4 text-sm leading-6 text-white/62">
                      No passphrase is required for this share. Revealing it will immediately consume the link.
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      isConsuming ||
                      (shareData?.metadata?.requirePassphrase && !passphrase)
                    }
                    className="h-13 w-full rounded-2xl text-base font-semibold shadow-[0_14px_44px_-18px_rgba(10,132,255,0.72)]"
                  >
                    {isConsuming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Revealing secret...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Reveal Secret
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function LabelText({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <p className="text-sm font-semibold tracking-tight text-white">{title}</p>
      <p className="text-sm leading-6 text-white/56">{detail}</p>
    </div>
  );
}
