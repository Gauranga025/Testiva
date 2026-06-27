import { Browserbase } from "@browserbasehq/sdk";
import { chromium, type Browser, type Page } from "playwright-core";
import { formatLogLine } from "./logger";
import type { DomSummary } from "./types";
import {
    attachPageListeners,
    createBrowserbasePage,
    releaseBrowserSession,
    withTimeout,
} from "./browser-session";

const DISCOVERY_TIMEOUT_MS = 90_000;
const CDP_CONNECT_TIMEOUT_MS = 30_000;

export async function runUiDiscovery(options: {
    bb: Browserbase;
    projectId: string;
    targetUrl: string;
    logs: string[];
}): Promise<DomSummary> {
    const { bb, projectId, targetUrl, logs } = options;

    logs.push(formatLogLine("[DISCOVERY]", `Navigating to ${targetUrl}`));
    logs.push(formatLogLine("[DISCOVERY]", "Scanning navigation"));

    let session: { id: string; connectUrl: string } | null = null;
    let browser: Browser | null = null;

    try {
        session = await bb.sessions.create({
            projectId,
            timeout: 180,
            browserSettings: {
                recordSession: false,
                logSession: true,
            },
        });

        logs.push(formatLogLine("[DISCOVERY]", `Discovery session: ${session.id}`));

        browser = await withTimeout(
            chromium.connectOverCDP(session.connectUrl),
            CDP_CONNECT_TIMEOUT_MS,
            "Discovery CDP connection"
        );

        const page = await createBrowserbasePage(browser);
        attachPageListeners(page, logs, { quiet: true });

        const domSummary = await withTimeout(
            scanPageUi(page, targetUrl, logs),
            DISCOVERY_TIMEOUT_MS,
            "UI discovery"
        );

        logs.push(formatLogLine("[DISCOVERY]", "DOM summary generated"));
        return domSummary;
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch {
                /* ignore */
            }
        }
        if (session?.id) {
            await releaseBrowserSession(bb, session.id, logs);
        }
    }
}

async function scanPageUi(page: Page, targetUrl: string, logs: string[]): Promise<DomSummary> {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    const currentUrl = targetUrl;
    const finalUrl = page.url();
    const title = await page.title();

    const metaDescription = await page
        .locator('meta[name="description"]')
        .getAttribute("content")
        .catch(() => null);

    logs.push(formatLogLine("[DISCOVERY]", "Scanning forms"));
    logs.push(formatLogLine("[DISCOVERY]", "Scanning buttons"));

    const extracted = await page.evaluate(() => {
        const isVisible = (el: Element): boolean => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
                style.visibility !== "hidden" &&
                style.display !== "none" &&
                rect.width > 0 &&
                rect.height > 0
            );
        };

        const textOf = (el: Element): string =>
            (el.textContent || "").replace(/\s+/g, " ").trim();

        const testId = (el: Element): string | null =>
            el.getAttribute("data-testid") ||
            el.getAttribute("data-test-id") ||
            null;

        const navigation: Array<{
            text: string;
            href: string | null;
            role: string;
            visible: boolean;
        }> = [];

        const navRoots = document.querySelectorAll("nav, [role='navigation'], aside");
        navRoots.forEach((root) => {
            root.querySelectorAll("a, button, [role='link'], [role='menuitem']").forEach((el) => {
                const text = textOf(el);
                if (!text) return;
                navigation.push({
                    text: text.slice(0, 120),
                    href: el instanceof HTMLAnchorElement ? el.href : null,
                    role: el.getAttribute("role") || el.tagName.toLowerCase(),
                    visible: isVisible(el),
                });
            });
        });

        const buttons: Array<{
            text: string;
            role: string;
            ariaLabel: string | null;
            visible: boolean;
            disabled: boolean;
            testId: string | null;
        }> = [];

        document
            .querySelectorAll("button, [role='button'], input[type='submit'], input[type='button']")
            .forEach((el) => {
                const text =
                    textOf(el) ||
                    el.getAttribute("aria-label") ||
                    el.getAttribute("value") ||
                    "";
                if (!text) return;
                buttons.push({
                    text: text.slice(0, 120),
                    role: el.getAttribute("role") || "button",
                    ariaLabel: el.getAttribute("aria-label"),
                    visible: isVisible(el),
                    disabled:
                        el instanceof HTMLButtonElement
                            ? el.disabled
                            : el.getAttribute("aria-disabled") === "true",
                    testId: testId(el),
                });
            });

        const forms: Array<{
            action: string | null;
            fields: Array<{
                name: string | null;
                type: string;
                label: string | null;
                placeholder: string | null;
                required: boolean;
                isEmail: boolean;
                isPassword: boolean;
                isSearch: boolean;
                testId: string | null;
            }>;
            submitButtons: typeof buttons;
        }> = [];

        document.querySelectorAll("form").forEach((form) => {
            const fields: (typeof forms)[0]["fields"] = [];
            const submitButtons: typeof buttons = [];

            form.querySelectorAll("input, textarea, select").forEach((el) => {
                if (!(el instanceof HTMLElement)) return;
                const input = el as HTMLInputElement;
                const type = (input.type || input.tagName.toLowerCase()).toLowerCase();
                const id = input.id;
                let label: string | null = null;
                if (id) {
                    const labelEl = form.querySelector(`label[for="${CSS.escape(id)}"]`);
                    if (labelEl) label = textOf(labelEl);
                }
                if (!label) {
                    const parentLabel = input.closest("label");
                    if (parentLabel) label = textOf(parentLabel);
                }

                fields.push({
                    name: input.name || input.id || null,
                    type,
                    label,
                    placeholder: input.getAttribute("placeholder"),
                    required: input.required || input.getAttribute("aria-required") === "true",
                    isEmail: type === "email" || /email/i.test(input.name || input.id || ""),
                    isPassword: type === "password",
                    isSearch: type === "search" || /search/i.test(input.name || input.placeholder || ""),
                    testId: testId(input),
                });
            });

            form
                .querySelectorAll("button, input[type='submit'], [role='button']")
                .forEach((el) => {
                    const text =
                        textOf(el) ||
                        el.getAttribute("aria-label") ||
                        el.getAttribute("value") ||
                        "";
                    if (!text) return;
                    submitButtons.push({
                        text: text.slice(0, 120),
                        role: el.getAttribute("role") || "button",
                        ariaLabel: el.getAttribute("aria-label"),
                        visible: isVisible(el),
                        disabled:
                            el instanceof HTMLButtonElement
                                ? el.disabled
                                : el.getAttribute("aria-disabled") === "true",
                        testId: testId(el),
                    });
                });

            forms.push({
                action: form.getAttribute("action"),
                fields,
                submitButtons,
            });
        });

        const headings: Array<{ level: number; text: string; visible: boolean }> = [];
        document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
            const text = textOf(el);
            if (!text) return;
            const tag = el.tagName.toLowerCase();
            headings.push({
                level: Number(tag.replace("h", "")) || 1,
                text: text.slice(0, 200),
                visible: isVisible(el),
            });
        });

        const dialogs: Array<{ role: string; title: string | null; visible: boolean }> = [];
        document
            .querySelectorAll("[role='dialog'], [role='alertdialog'], dialog, .modal, [aria-modal='true']")
            .forEach((el) => {
                const titleEl =
                    el.querySelector("[role='heading'], h1, h2, h3, .modal-title") ||
                    el.querySelector("[aria-labelledby]");
                dialogs.push({
                    role: el.getAttribute("role") || "dialog",
                    title: titleEl ? textOf(titleEl).slice(0, 120) : null,
                    visible: isVisible(el),
                });
            });

        const tabs: Array<{ text: string; selected: boolean; role: string }> = [];
        document.querySelectorAll("[role='tab']").forEach((el) => {
            const text = textOf(el);
            if (!text) return;
            tabs.push({
                text: text.slice(0, 120),
                selected: el.getAttribute("aria-selected") === "true",
                role: "tab",
            });
        });

        const dropdowns: Array<{ text: string; selected: boolean; role: string; options: string[] }> = [];
        document.querySelectorAll("select, [role='combobox'], [role='listbox']").forEach((el) => {
            const text = textOf(el) || el.getAttribute("aria-label") || "";
            if (!text) return;
            const options: string[] = [];
            if (el.tagName === "SELECT") {
                (el as HTMLSelectElement).querySelectorAll("option").forEach((opt) => {
                    if (opt.text) options.push(opt.text.slice(0, 80));
                });
            }
            dropdowns.push({
                text: text.slice(0, 120),
                selected: el.getAttribute("aria-expanded") === "true",
                role: el.getAttribute("role") || "combobox",
                options: options.slice(0, 20),
            });
        });

        const accessibility: Array<{ role: string; ariaLabel: string | null; ariaDescribedBy: string | null; ariaLive: string | null; ariaHidden: boolean }> = [];
        document.querySelectorAll("[role], [aria-label], [aria-describedby], [aria-live], [aria-hidden]").forEach((el) => {
            const role = el.getAttribute("role") || el.tagName.toLowerCase();
            const ariaLabel = el.getAttribute("aria-label");
            const ariaDescribedBy = el.getAttribute("aria-describedby");
            const ariaLive = el.getAttribute("aria-live");
            const ariaHidden = el.getAttribute("aria-hidden") === "true";
            
            if (role || ariaLabel || ariaDescribedBy || ariaLive) {
                accessibility.push({
                    role,
                    ariaLabel,
                    ariaDescribedBy,
                    ariaLive,
                    ariaHidden,
                });
            }
        });

        const loadingStates: Array<{ present: boolean; type: "spinner" | "skeleton" | "progress" | "text" | "none"; text: string | null }> = [];
        const loadingElements = document.querySelectorAll(".loading, .spinner, .skeleton, [role='status'][aria-busy='true'], .progress");
        if (loadingElements.length > 0) {
            const el = loadingElements[0];
            const text = textOf(el) || el.getAttribute("aria-label") || null;
            let type: "spinner" | "skeleton" | "progress" | "text" | "none" = "text";
            if (el.classList.contains("spinner")) type = "spinner";
            else if (el.classList.contains("skeleton")) type = "skeleton";
            else if (el.classList.contains("progress")) type = "progress";
            loadingStates.push({ present: true, type, text });
        } else {
            loadingStates.push({ present: false, type: "none", text: null });
        }

        const errorStates: Array<{ present: boolean; message: string | null; type: "inline" | "banner" | "modal" | "none" }> = [];
        const errorElements = document.querySelectorAll(".error, .error-message, [role='alert'], .alert-error");
        if (errorElements.length > 0) {
            const el = errorElements[0];
            const message = textOf(el) || el.getAttribute("aria-label") || null;
            let type: "inline" | "banner" | "modal" | "none" = "inline";
            if (el.classList.contains("banner")) type = "banner";
            else if (el.getAttribute("role") === "dialog") type = "modal";
            errorStates.push({ present: true, message, type });
        } else {
            errorStates.push({ present: false, message: null, type: "none" });
        }

        const emptyStates: Array<{ present: boolean; message: string | null; actionText: string | null }> = [];
        const emptyElements = document.querySelectorAll(".empty, .no-data, .empty-state, [data-empty='true']");
        if (emptyElements.length > 0) {
            const el = emptyElements[0];
            const message = textOf(el) || null;
            const actionButton = el.querySelector("button, a");
            const actionText = actionButton ? textOf(actionButton) || null : null;
            emptyStates.push({ present: true, message, actionText });
        } else {
            emptyStates.push({ present: false, message: null, actionText: null });
        }

        const visibleComponents: Array<{ tagName: string; role: string; text: string | null; visible: boolean; interactive: boolean }> = [];
        document.querySelectorAll("button, a, input, select, textarea, [role='button'], [role='link'], [role='textbox']").forEach((el) => {
            const tagName = el.tagName.toLowerCase();
            const role = el.getAttribute("role") || tagName;
            const text = textOf(el) || el.getAttribute("aria-label") || el.getAttribute("placeholder") || null;
            const visible = isVisible(el);
            const interactive = ["button", "a", "input", "select", "textarea"].includes(tagName) || 
                              ["button", "link", "textbox", "combobox"].includes(role || "");
            
            if (visible && (text || interactive)) {
                visibleComponents.push({
                    tagName,
                    role,
                    text: text ? text.slice(0, 100) : null,
                    visible,
                    interactive,
                });
            }
        });

        const tables: Array<{
            headers: string[];
            rowCount: number;
            hasPagination: boolean;
            actionButtons: string[];
        }> = [];

        document.querySelectorAll("table").forEach((table) => {
            const headers: string[] = [];
            table.querySelectorAll("thead th, tr:first-child th").forEach((th) => {
                const text = textOf(th);
                if (text) headers.push(text.slice(0, 80));
            });

            const rowCount = table.querySelectorAll("tbody tr, tr").length;
            const hasPagination = !!table
                .closest("section, div")
                ?.querySelector("[aria-label*='pagination' i], .pagination, nav[aria-label*='page' i]");

            const actionButtons: string[] = [];
            table.querySelectorAll("button, a, [role='button']").forEach((el) => {
                const text = textOf(el);
                if (text) actionButtons.push(text.slice(0, 80));
            });

            tables.push({ headers, rowCount, hasPagination, actionButtons: actionButtons.slice(0, 10) });
        });

        const cards: Array<{ title: string | null; text: string; role: string | null }> = [];
        document
            .querySelectorAll("[class*='card' i], [role='article'], [data-testid*='card' i]")
            .forEach((el) => {
                const titleEl = el.querySelector("h1, h2, h3, h4, [class*='title' i]");
                const text = textOf(el).slice(0, 240);
                if (!text) return;
                cards.push({
                    title: titleEl ? textOf(titleEl).slice(0, 120) : null,
                    text,
                    role: el.getAttribute("role"),
                });
            });

        const routeMap = new Map<string, { path: string; label: string; source: "navigation" | "link" | "redirect" }>();
        const origin = window.location.origin;

        document.querySelectorAll("a[href]").forEach((el) => {
            if (!(el instanceof HTMLAnchorElement)) return;
            const href = el.href;
            if (!href.startsWith(origin)) return;
            const path = new URL(href).pathname;
            if (path === "/" || path.length < 2) return;
            const label = textOf(el).slice(0, 120) || path;
            if (!routeMap.has(path)) {
                routeMap.set(path, { path, label, source: "link" });
            }
        });

        navigation.forEach((item) => {
            if (!item.href) return;
            try {
                const path = new URL(item.href).pathname;
                if (!routeMap.has(path)) {
                    routeMap.set(path, { path, label: item.text, source: "navigation" });
                }
            } catch {
                /* ignore invalid href */
            }
        });

        try {
            const finalPath = new URL(window.location.href).pathname;
            routeMap.set(finalPath, {
                path: finalPath,
                label: document.title || finalPath,
                source: "redirect",
            });
        } catch {
            /* ignore */
        }

        const allFields = forms.flatMap((f) => f.fields);
        const passwordField = allFields.find((f) => f.isPassword) || null;
        const emailField = allFields.find((f) => f.isEmail) || null;
        const usernameField =
            allFields.find(
                (f) =>
                    !f.isPassword &&
                    !f.isEmail &&
                    /user(name)?|login|account/i.test(
                        `${f.name || ""} ${f.label || ""} ${f.placeholder || ""}`
                    )
            ) || null;

        const submitButton =
            forms.flatMap((f) => f.submitButtons).find((b) => b.visible && !b.disabled) ||
            buttons.find(
                (b) =>
                    b.visible &&
                    !b.disabled &&
                    /sign in|log in|login|submit|continue|next/i.test(b.text)
            ) ||
            null;

        const looksLikeLogin =
            !!passwordField ||
            /login|signin|sign-in|auth/i.test(window.location.pathname);

        const loginDiscovery = looksLikeLogin
            ? {
                  pageUrl: window.location.href,
                  emailField,
                  usernameField,
                  passwordField,
                  submitButton,
                  redirectHint: null as string | null,
              }
            : null;

        return {
            navigation,
            buttons,
            forms,
            headings,
            dialogs,
            tabs,
            dropdowns: dropdowns.slice(0, 15),
            tables,
            cards: cards.slice(0, 20),
            routes: Array.from(routeMap.values()).slice(0, 40),
            loginDiscovery,
            accessibility: accessibility.slice(0, 30),
            loadingStates,
            errorStates,
            emptyStates,
            visibleComponents: visibleComponents.slice(0, 50),
        };
    });

    return {
        currentUrl,
        finalUrl,
        title,
        metaDescription,
        ...extracted,
    };
}
