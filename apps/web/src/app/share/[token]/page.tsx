"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
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
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading share...
        </div>
      </div>
    );
  }

  const asideEyebrow = isRevealed ? "Delivered" : isUnavailable ? "Unavailable" : "Secure Share";
  const asideTitle = isRevealed
    ? "Delivered."
    : isUnavailable
      ? "Link expired."
      : "One-time share.";
  const asideDescription = isRevealed
    ? "Copy the value now. This link is destroyed."
    : isUnavailable
      ? "Ask the sender for a new link."
      : "This link works once, then self-destructs.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1120px] items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_minmax(0,0.85fr)]">
          {/* Aside — matches AuthShell */}
          <section className="hidden border-r border-border pr-10 lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-8">
              <div className="flex items-center justify-between gap-4 pt-2">
                <Link href="/" className="inline-flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card">
                    <Logo className="h-4 w-4 text-foreground" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">Hermit</span>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Control Plane
                    </span>
                  </span>
                </Link>
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  {asideEyebrow}
                </div>
                <div className="space-y-2">
                  <h1 className="max-w-[16ch] text-[clamp(2.4rem,4vw,3.75rem)] font-semibold leading-[1.02] tracking-tight text-foreground">
                    {asideTitle}
                  </h1>
                  <p className="max-w-[46ch] text-sm leading-6 text-muted-foreground">
                    {asideDescription}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    icon: <Lock className="h-4 w-4" />,
                    title: "Encrypted at rest",
                    detail: "Sealed until redeemed.",
                  },
                  {
                    icon: <KeyRound className="h-4 w-4" />,
                    title: "Passphrase protected",
                    detail: "Optional second layer before reveal.",
                  },
                  {
                    icon: <Shield className="h-4 w-4" />,
                    title: "Single-use",
                    detail: "Cannot be replayed after consumption.",
                  },
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                      {feature.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-tight text-foreground">
                        {feature.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                        {feature.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between gap-4 border-t border-border pt-6">
              <div>
                <p className="text-sm font-medium text-foreground">Hermit</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Secure share.
                </p>
              </div>
            </div>
          </section>

          {/* Main content */}
          <section className="flex items-center justify-center">
            <div className="w-full max-w-[540px]">
              {/* Mobile header */}
              <div className="border-b border-border pb-6 lg:hidden">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <Link href="/" className="inline-flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card">
                      <Logo className="h-4 w-4 text-foreground" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">Hermit</span>
                  </Link>
                </div>
              </div>

              <div className="pt-6 lg:pt-0">
                {isUnavailable ? (
                  <ShareUnavailable errorStatus={errorStatus} />
                ) : isRevealed ? (
                  <ShareRevealed
                    revealedValue={revealedValue!}
                    copied={copied}
                    onCopy={() => void handleCopy()}
                  />
                ) : (
                  <ShareRevealForm
                    shareData={shareData}
                    passphrase={passphrase}
                    setPassphrase={setPassphrase}
                    errorStatus={errorStatus}
                    isConsuming={isConsuming}
                    onSubmit={handleConsume}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ShareUnavailable({ errorStatus }: { errorStatus: ShareStatus }) {
  return (
    <div className="space-y-7">
      <div>
        <div className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Unavailable
        </div>
        <h2 className="mt-4 text-[clamp(2rem,3vw,2.75rem)] font-semibold tracking-tight text-foreground">
          {errorStatus === "expired" ? "Link expired" : "Unavailable"}
        </h2>
        <p className="mt-3 max-w-[46ch] text-[15px] leading-7 text-muted-foreground">
          {errorStatus === "expired"
            ? "This share has expired and is no longer available."
            : "This share has been consumed or is no longer active."}
        </p>
      </div>

      <div className="flex items-start gap-4 rounded-[18px] border border-border bg-muted/30 px-5 py-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm leading-6 text-muted-foreground">
          Ask the sender for a new link.
        </p>
      </div>

      <div className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
        Consumed links cannot be replayed.
      </div>
    </div>
  );
}

function ShareRevealed({
  revealedValue,
  copied,
  onCopy,
}: {
  revealedValue: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <div className="inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <Unlock className="h-3.5 w-3.5" />
          Revealed
        </div>
        <h2 className="mt-4 text-[clamp(2rem,3vw,2.75rem)] font-semibold tracking-tight text-foreground">
          Delivered
        </h2>
        <p className="mt-3 max-w-[46ch] text-[15px] leading-7 text-muted-foreground">
          This link is now destroyed. Copy the value below.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">Payload</Label>
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Link destroyed
          </span>
        </div>
        <div className="rounded-[18px] border border-border bg-muted/30 p-4">
          <pre className="max-h-[320px] overflow-y-auto whitespace-pre-wrap break-all font-mono text-[13px] leading-7 text-foreground">
            {revealedValue}
          </pre>
        </div>
      </div>

      <Button
        onClick={onCopy}
        className="h-12 w-full rounded-2xl text-base font-medium shadow-none"
      >
        {copied ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            Copy to clipboard
          </>
        )}
      </Button>

      <div className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
        This value will not be available again.
      </div>
    </div>
  );
}

function ShareRevealForm({
  shareData,
  passphrase,
  setPassphrase,
  errorStatus,
  isConsuming,
  onSubmit,
}: {
  shareData: ShareMetadataResponse | undefined;
  passphrase: string;
  setPassphrase: (value: string) => void;
  errorStatus: ShareStatus;
  isConsuming: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <div className="inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          One-time reveal
        </div>
        <h2 className="mt-4 text-[clamp(2rem,3vw,2.75rem)] font-semibold tracking-tight text-foreground">
          Reveal secret
        </h2>
        <p className="mt-3 max-w-[46ch] text-[15px] leading-7 text-muted-foreground">
          This link works once, then self-destructs.
        </p>
      </div>

      {shareData?.metadata?.note ? (
        <div className="flex items-start gap-4 rounded-[18px] border border-border bg-muted/30 px-5 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Sender note
            </p>
            <p className="mt-1.5 text-sm leading-6 text-foreground">
              {shareData.metadata.note}
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5">
        {shareData?.metadata?.requirePassphrase ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="passphrase">Passphrase</Label>
              <span className="text-xs font-medium text-muted-foreground">Required</span>
            </div>
            <Input
              id="passphrase"
              type="password"
              required
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              className={`h-11 rounded-2xl border-black/8 bg-background/70 shadow-none dark:border-white/10 dark:bg-white/[0.03] ${
                errorStatus === "invalid_passphrase"
                  ? "border-destructive/50 focus-visible:ring-destructive/40"
                  : ""
              }`}
            />
            {errorStatus === "invalid_passphrase" ? (
              <p className="text-sm text-destructive">
                Incorrect passphrase. Try again.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-4 rounded-[18px] border border-border bg-muted/30 px-5 py-4">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-6 text-muted-foreground">
              No passphrase required. Revealing consumes this link.
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={
            isConsuming ||
            (shareData?.metadata?.requirePassphrase && !passphrase)
          }
          className="h-12 w-full rounded-2xl text-base font-medium shadow-none"
        >
          {isConsuming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Revealing...
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Reveal secret
            </>
          )}
        </Button>
      </form>

      <div className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
        Single-use link. Self-destructs after reveal.
      </div>
    </div>
  );
}
