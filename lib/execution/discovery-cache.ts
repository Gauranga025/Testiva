import type { DiscoveryCacheEntry, DomSummary } from "./types";
import { normalizeBaseUrl } from "./environment-utils";

export function buildDiscoveryCacheKey(options: {
    repoId: string | number | null;
    baseUrl: string;
    branch?: string | null;
}): string {
    const repoPart = options.repoId != null ? String(options.repoId) : "unknown";
    const urlPart = normalizeBaseUrl(options.baseUrl);
    const branchPart = options.branch || "main";
    return `${repoPart}:${urlPart}:${branchPart}`;
}

export function getCachedDiscovery(
    cache: DiscoveryCacheEntry | null | undefined,
    cacheKey: string
): DiscoveryCacheEntry | null {
    if (!cache || cache.cacheKey !== cacheKey) {
        return null;
    }
    return cache;
}

export function buildDiscoveryCacheEntry(options: {
    cacheKey: string;
    targetUrl: string;
    effectiveUrl: string;
    environmentType: "deployed" | "localhost";
    domSummary: DomSummary;
}): DiscoveryCacheEntry {
    return {
        cacheKey: options.cacheKey,
        targetUrl: options.targetUrl,
        effectiveUrl: options.effectiveUrl,
        environmentType: options.environmentType,
        domSummary: options.domSummary,
        discoveredAt: new Date().toISOString(),
    };
}

export function summarizeDomForPrompt(domSummary: DomSummary): string {
    const compact = {
        currentUrl: domSummary.currentUrl,
        finalUrl: domSummary.finalUrl,
        title: domSummary.title,
        metaDescription: domSummary.metaDescription,
        navigation: domSummary.navigation.slice(0, 30),
        buttons: domSummary.buttons.slice(0, 40),
        forms: domSummary.forms.slice(0, 10),
        headings: domSummary.headings.slice(0, 25),
        dialogs: domSummary.dialogs.slice(0, 10),
        tabs: domSummary.tabs.slice(0, 15),
        dropdowns: domSummary.dropdowns.slice(0, 10),
        tables: domSummary.tables.slice(0, 10),
        cards: domSummary.cards.slice(0, 15),
        routes: domSummary.routes.slice(0, 30),
        loginDiscovery: domSummary.loginDiscovery,
        accessibility: domSummary.accessibility.slice(0, 20),
        loadingStates: domSummary.loadingStates,
        errorStates: domSummary.errorStates,
        emptyStates: domSummary.emptyStates,
        visibleComponents: domSummary.visibleComponents.slice(0, 30),
    };

    return JSON.stringify(compact, null, 2);
}
