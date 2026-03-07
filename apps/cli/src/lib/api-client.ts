import { getTokens, saveTokens, getServerUrl, clearTokens, getOrg } from "./auth-store.js";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | { code?: string; message?: string };
  message?: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─────────────────────────────────────────────
// HTTP Client
// ─────────────────────────────────────────────

function buildHeaders(skipAuth?: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "hermes-cli/0.0.1",
  };

  if (!skipAuth) {
    const tokens = getTokens();
    if (tokens?.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
  }

  const activeOrg = getOrg();
  if (activeOrg?.id) {
    headers["X-Organization-Id"] = activeOrg.id;
  }

  return headers;
}

async function parseJson(response: Response): Promise<ApiResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      success: response.ok,
      message: await response.text(),
    };
  }
  return response.json() as Promise<ApiResponse>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { skipAuth?: boolean; retried?: boolean } = {}
): Promise<T> {
  const baseUrl = getServerUrl();
  const url = `${baseUrl}${path}`;
  const headers = buildHeaders(opts.skipAuth);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — attempt token refresh once
  if (response.status === 401 && !opts.skipAuth && !opts.retried) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return request<T>(method, path, body, { ...opts, retried: true });
    }
    clearTokens();
    throw new ApiError(401, "Session expired. Please login again.");
  }

  const json = (await parseJson(response)) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (typeof json.error === "string" ? json.error : undefined) ||
        json.message ||
        `Request failed with status ${response.status}`,
      json
    );
  }

  return json.data as T;
}

async function refreshToken(): Promise<boolean> {
  try {
    const tokens = getTokens();
    if (!tokens?.refreshToken) return false;

    const baseUrl = getServerUrl();
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!response.ok) return false;

    const json = (await parseJson(response)) as ApiResponse<{
      tokens: { accessToken: string; refreshToken: string };
    }>;

    if (json.data?.tokens) {
      saveTokens({
        accessToken: json.data.tokens.accessToken,
        refreshToken: json.data.tokens.refreshToken,
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export function get<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function post<T>(path: string, body?: unknown, opts?: { skipAuth?: boolean }): Promise<T> {
  return request<T>("POST", path, body, opts);
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("PUT", path, body);
}

export function del<T>(path: string): Promise<T> {
  return request<T>("DELETE", path);
}
