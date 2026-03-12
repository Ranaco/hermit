import { getRuntimeState } from "./runtime.js";
import { getTokens, saveTokens, getServerUrl, clearTokens } from "./auth-store.js";
export class ApiError extends Error {
    statusCode;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = "ApiError";
    }
}
function buildHeaders(skipAuth) {
    const headers = {
        "Content-Type": "application/json",
        "User-Agent": "hermes-cli/0.1.0",
    };
    if (!skipAuth) {
        const tokens = getTokens();
        if (tokens?.accessToken) {
            headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
    }
    return headers;
}
function resolveBaseUrl() {
    return getRuntimeState().serverUrlOverride || getServerUrl();
}
async function parseJson(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        return {
            success: response.ok,
            message: await response.text(),
        };
    }
    return response.json();
}
function getErrorMessage(json, response) {
    if (typeof json.error === "string") {
        return json.error;
    }
    if (json.error?.message) {
        return json.error.message;
    }
    if (json.message) {
        return json.message;
    }
    return `Request failed with status ${response.status}`;
}
async function request(method, path, body, opts = {}) {
    const url = `${resolveBaseUrl()}${path}`;
    const headers = buildHeaders(opts.skipAuth);
    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401 && !opts.skipAuth && !opts.retried) {
        const refreshed = await refreshToken();
        if (refreshed) {
            return request(method, path, body, { ...opts, retried: true });
        }
        clearTokens();
        throw new ApiError(401, "Session expired. Please login again.");
    }
    const json = (await parseJson(response));
    if (!response.ok) {
        throw new ApiError(response.status, getErrorMessage(json, response), json);
    }
    return json.data;
}
async function refreshToken() {
    try {
        const tokens = getTokens();
        if (!tokens?.refreshToken)
            return false;
        const response = await fetch(`${resolveBaseUrl()}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        if (!response.ok)
            return false;
        const json = (await parseJson(response));
        if (json.data?.tokens) {
            saveTokens({
                accessToken: json.data.tokens.accessToken,
                refreshToken: json.data.tokens.refreshToken,
            });
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
export function get(path) {
    return request("GET", path);
}
export function post(path, body, opts) {
    return request("POST", path, body, opts);
}
export function put(path, body) {
    return request("PUT", path, body);
}
export function del(path) {
    return request("DELETE", path);
}
