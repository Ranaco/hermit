"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import type { ApiEndpoint } from "@/lib/api-reference";
import { endpointAuthLabel } from "@/lib/api-reference";

function inferBaseUrl() {
  if (typeof window === "undefined") {
    return "https://hermit.ranax.co";
  }

  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname}:5001`;
  }

  return window.location.origin;
}

function buildHeaders(
  endpoint: ApiEndpoint,
  token: string,
  mfaToken: string,
  cliDeviceId: string,
  cliSignature: string,
  cliNonce: string,
  cliTimestamp: string,
) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (!["GET", "DELETE", "OPTIONS"].includes(endpoint.method)) {
    headers["Content-Type"] = "application/json";
  }

  if (endpoint.auth !== "public" && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  if (mfaToken.trim()) {
    headers["X-MFA-Token"] = mfaToken.trim();
  }

  if (endpoint.auth === "cli") {
    if (cliDeviceId.trim()) headers["X-Hermit-Device-Id"] = cliDeviceId.trim();
    if (cliSignature.trim()) headers["X-Hermit-Signature"] = cliSignature.trim();
    if (cliNonce.trim()) headers["X-Hermit-Nonce"] = cliNonce.trim();
    if (cliTimestamp.trim()) headers["X-Hermit-Timestamp"] = cliTimestamp.trim();
  }

  return headers;
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--docs-soft)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="docs-input"
      />
    </label>
  );
}

export function ApiPlayground({ endpoint }: { endpoint: ApiEndpoint }) {
  const [baseUrl, setBaseUrl] = useState(inferBaseUrl);
  const [path, setPath] = useState(endpoint.path);
  const [token, setToken] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [cliDeviceId, setCliDeviceId] = useState("");
  const [cliSignature, setCliSignature] = useState("");
  const [cliNonce, setCliNonce] = useState("");
  const [cliTimestamp, setCliTimestamp] = useState("");
  const [body, setBody] = useState(endpoint.requestExample ?? "{}");
  const [status, setStatus] = useState<string>("");
  const [responseBody, setResponseBody] = useState<string>("");
  const [responseHeaders, setResponseHeaders] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const supportsBody = useMemo(
    () => !["GET", "DELETE", "OPTIONS"].includes(endpoint.method),
    [endpoint.method],
  );

  useEffect(() => {
    setBaseUrl(inferBaseUrl());
  }, []);

  async function sendRequest() {
    setLoading(true);
    setError("");
    setStatus("");

    try {
      const headers = buildHeaders(
        endpoint,
        token,
        mfaToken,
        cliDeviceId,
        cliSignature,
        cliNonce,
        cliTimestamp,
      );

      let parsedBody: unknown = undefined;
      if (supportsBody && body.trim()) {
        parsedBody = JSON.parse(body);
      }

      const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        method: endpoint.method,
        headers,
        body: supportsBody ? JSON.stringify(parsedBody ?? {}) : undefined,
      });

      const text = await response.text();
      setStatus(`${response.status} ${response.statusText}`);
      setResponseHeaders(
        JSON.stringify(
          Object.fromEntries([...response.headers.entries()].sort(([a], [b]) => a.localeCompare(b))),
          null,
          2,
        ),
      );

      try {
        setResponseBody(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponseBody(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setResponseHeaders("");
      setResponseBody("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border bg-[color:color-mix(in_oklab,var(--docs-panel)_62%,var(--docs-bg))] p-4 md:p-5" style={{ borderColor: "var(--docs-border)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--docs-border)" }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--docs-soft)]">Try it</p>
          <p className="mt-1 text-sm text-[var(--docs-muted)]">
            {endpointAuthLabel[endpoint.auth]} request runner. Local docs default to <code>http://localhost:5001</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={sendRequest}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--docs-accent)] bg-[color:color-mix(in_oklab,var(--docs-accent)_12%,var(--docs-panel))] px-4 text-sm font-semibold text-[var(--docs-text)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--docs-accent)_18%,var(--docs-panel))] disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send request"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input label="Base URL" value={baseUrl} onChange={setBaseUrl} />
        <Input label="Path" value={path} onChange={setPath} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input
          label="Bearer token"
          value={token}
          onChange={setToken}
          placeholder={endpoint.auth === "public" ? "Not required for this endpoint" : "Paste access token"}
        />
        <Input label="MFA token" value={mfaToken} onChange={setMfaToken} placeholder="Optional" />
      </div>

      {endpoint.auth === "cli" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label="CLI device id" value={cliDeviceId} onChange={setCliDeviceId} />
          <Input label="CLI signature" value={cliSignature} onChange={setCliSignature} />
          <Input label="CLI nonce" value={cliNonce} onChange={setCliNonce} />
          <Input label="CLI timestamp" value={cliTimestamp} onChange={setCliTimestamp} placeholder="Unix ms" />
        </div>
      ) : null}

      {supportsBody ? (
        <label className="mt-4 block text-sm">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--docs-soft)]">
            JSON body
          </span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            className="docs-input min-h-[14rem] resize-y font-mono text-[13px] leading-6"
          />
        </label>
      ) : null}

      <p className="mt-4 text-xs leading-6 text-[var(--docs-soft)]">
        Replace placeholder IDs before sending. Deployed docs use same-origin requests by default; standalone local
        docs target the API on port 5001.
      </p>

      {error ? (
        <div className="mt-4 border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : null}

      {status ? (
        <div className="mt-5 grid gap-4">
          <div className="border bg-[var(--docs-panel)] px-4 py-4" style={{ borderColor: "var(--docs-border)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--docs-soft)]">Status</p>
            <p className="mt-2 text-[15px] font-semibold text-[var(--docs-text)]">{status}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border bg-[var(--docs-panel)]" style={{ borderColor: "var(--docs-border)" }}>
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--docs-border)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--docs-soft)]">Response headers</p>
                <CopyButton value={responseHeaders || "{}"} />
              </div>
              <pre className="overflow-x-auto bg-[#0b1018] p-4 text-xs leading-6 text-[#d8e2f4]">
                <code>{responseHeaders || "{}"}</code>
              </pre>
            </div>

            <div className="border bg-[var(--docs-panel)]" style={{ borderColor: "var(--docs-border)" }}>
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--docs-border)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--docs-soft)]">Response body</p>
                <CopyButton value={responseBody || "{}"} />
              </div>
              <pre className="overflow-x-auto bg-[#0b1018] p-4 text-xs leading-6 text-[#d8e2f4]">
                <code>{responseBody || "{}"}</code>
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
