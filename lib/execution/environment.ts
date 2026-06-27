import { formatLogLine } from "./logger";
import type { EnvironmentDiscoveryResult, EnvironmentType } from "./types";
import {
    buildFullUrl,
    detectEnvironmentType,
    normalizeBaseUrl,
    resolveEnvironmentType,
} from "./environment-utils";
import {
    createTunnel,
    verifyTunnelReachable,
    type TunnelHandle,
} from "./tunnel";

export {
    normalizeBaseUrl,
    detectEnvironmentType,
    resolveEnvironmentType,
    buildFullUrl,
} from "./environment-utils";

export async function discoverEnvironment(options: {
    baseUrl: string;
    useLocalhost?: boolean;
    logs: string[];
}): Promise<{ result: EnvironmentDiscoveryResult; tunnelHandle: TunnelHandle | null }> {
    const { baseUrl, logs, useLocalhost } = options;
    const normalized = normalizeBaseUrl(baseUrl);
    const environmentType: EnvironmentType = resolveEnvironmentType(
        normalized,
        useLocalhost
    );

    if (environmentType === "deployed") {
        logs.push(formatLogLine("[ENVIRONMENT]", "Detected deployed application"));
        logs.push(formatLogLine("[ENVIRONMENT]", `Target URL: ${normalized}`));

        return {
            result: {
                environmentType: "deployed",
                originalUrl: normalized,
                effectiveUrl: normalized,
                tunnel: null,
            },
            tunnelHandle: null,
        };
    }

    logs.push(formatLogLine("[ENVIRONMENT]", "Detected localhost"));
    logs.push(formatLogLine("[ENVIRONMENT]", `Local URL: ${normalized}`));
    logs.push(formatLogLine("[TUNNEL]", "Creating secure tunnel for Browserbase access..."));

    const tunnelHandle = await createTunnel(normalized, logs);

    logs.push(formatLogLine("[TUNNEL]", "Tunnel established"));
    logs.push(formatLogLine("[TUNNEL]", `Tunnel URL: ${tunnelHandle.publicUrl}`));

    await verifyTunnelReachable(tunnelHandle.publicUrl, logs);

    logs.push(formatLogLine("[TUNNEL]", "Tunnel connected"));

    return {
        result: {
            environmentType: "localhost",
            originalUrl: normalized,
            effectiveUrl: tunnelHandle.publicUrl,
            tunnel: {
                status: "connected",
                localUrl: normalized,
                publicUrl: tunnelHandle.publicUrl,
                provider: tunnelHandle.provider,
            },
        },
        tunnelHandle,
    };
}

export function mapUrlThroughTunnel(
    originalBaseUrl: string,
    effectiveBaseUrl: string,
    pageUrl: string
): string {
    const localOrigin = normalizeBaseUrl(originalBaseUrl);
    const tunnelOrigin = normalizeBaseUrl(effectiveBaseUrl);

    if (pageUrl.startsWith(tunnelOrigin)) {
        return pageUrl;
    }

    if (pageUrl.startsWith(localOrigin)) {
        return pageUrl.replace(localOrigin, tunnelOrigin);
    }

    return pageUrl;
}

const TUNNEL_URL_PATTERN =
    /https:\/\/[a-z0-9-]+\.(?:trycloudflare\.com|ngrok-free\.app|ngrok\.io|ngrok\.app)[^\s'"]*/gi;

export function rewriteScriptForEnvironment(
    scriptText: string,
    localBaseUrl: string,
    effectiveBaseUrl: string
): string {
    const localOrigin = normalizeBaseUrl(localBaseUrl);
    const effectiveOrigin = normalizeBaseUrl(effectiveBaseUrl);

    let rewritten = scriptText.split(localOrigin).join(effectiveOrigin);
    rewritten = rewritten.replace(TUNNEL_URL_PATTERN, effectiveOrigin);
    return rewritten;
}
