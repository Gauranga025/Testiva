import type { EnvironmentType } from "./types";

const LOCALHOST_PATTERNS = [
    /^https?:\/\/localhost(?::\d+)?(?:\/|$)/i,
    /^https?:\/\/127\.0\.0\.1(?::\d+)?(?:\/|$)/i,
    /^https?:\/\/0\.0\.0\.0(?::\d+)?(?:\/|$)/i,
    /^https?:\/\/\[::1\](?::\d+)?(?:\/|$)/i,
];

export function normalizeBaseUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return "http://localhost:3000";
    try {
        const parsed = new URL(trimmed.startsWith("http") ? trimmed : `http://${trimmed}`);
        return parsed.origin;
    } catch {
        return trimmed.replace(/\/$/, "");
    }
}

export function detectEnvironmentType(baseUrl: string): EnvironmentType {
    const normalized = normalizeBaseUrl(baseUrl);
    return LOCALHOST_PATTERNS.some((pattern) => pattern.test(normalized))
        ? "localhost"
        : "deployed";
}

/** Respects explicit localhost toggle from the UI; never tunnels deployed URLs. */
export function resolveEnvironmentType(
    baseUrl: string,
    useLocalhost?: boolean
): EnvironmentType {
    if (useLocalhost === false) {
        return "deployed";
    }
    return detectEnvironmentType(baseUrl);
}

export function buildFullUrl(baseUrl: string, targetRoute: string): string {
    const origin = normalizeBaseUrl(baseUrl);
    const route = targetRoute || "/";
    const path = route.startsWith("/") ? route : `/${route}`;
    return `${origin}${path}`;
}
