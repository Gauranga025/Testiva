/**
 * URL Validation Service for production-grade URL handling.
 */

import { createExecutionError, ExecutionErrorCode } from "./errors";
import { normalizeBaseUrl } from "./environment-utils";

export type ValidationResult = {
    valid: boolean;
    normalized: string;
    environmentType: "localhost" | "deployed";
    error?: string;
};

export class UrlValidator {
    private LOCALHOST_PATTERNS = [
        /^https?:\/\/localhost(?::\d+)?(?:\/|$)/i,
        /^https?:\/\/127\.0\.0\.1(?::\d+)?(?:\/|$)/i,
        /^https?:\/\/0\.0\.0\.0(?::\d+)?(?:\/|$)/i,
        /^https?:\/\/\[::1\](?::\d+)?(?:\/|$)/i,
    ];

    private DEPLOYED_PATTERNS = [
        /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(?::\d+)?(?:\/|$)/i,
    ];

    validate(url: string): ValidationResult {
        const trimmed = url.trim();
        
        if (!trimmed) {
            return {
                valid: false,
                normalized: "",
                environmentType: "localhost",
                error: "URL is empty",
            };
        }

        const normalized = normalizeBaseUrl(trimmed);

        if (!this.isValidUrlFormat(normalized)) {
            return {
                valid: false,
                normalized,
                environmentType: "localhost",
                error: "Invalid URL format",
            };
        }

        const environmentType = this.detectEnvironmentType(normalized);

        return {
            valid: true,
            normalized,
            environmentType,
        };
    }

    validateOrThrow(url: string): string {
        const result = this.validate(url);
        
        if (!result.valid) {
            throw createExecutionError(
                ExecutionErrorCode.INVALID_URL,
                result.error || "Invalid URL",
                { url }
            );
        }

        return result.normalized;
    }

    isLocalhost(url: string): boolean {
        const normalized = normalizeBaseUrl(url);
        return this.LOCALHOST_PATTERNS.some((pattern) => pattern.test(normalized));
    }

    isDeployed(url: string): boolean {
        const normalized = normalizeBaseUrl(url);
        return this.DEPLOYED_PATTERNS.some((pattern) => pattern.test(normalized));
    }

    detectEnvironmentType(url: string): "localhost" | "deployed" {
        return this.isLocalhost(url) ? "localhost" : "deployed";
    }

    private isValidUrlFormat(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    extractPort(url: string): number | null {
        try {
            const parsed = new URL(url);
            const port = parseInt(parsed.port, 10);
            return isNaN(port) ? null : port;
        } catch {
            return null;
        }
    }

    extractOrigin(url: string): string {
        try {
            const parsed = new URL(url);
            return parsed.origin;
        } catch {
            return url;
        }
    }
}
