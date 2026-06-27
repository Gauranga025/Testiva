import { Browserbase } from "@browserbasehq/sdk";
import { type Browser, type Page } from "playwright-core";
import { createExecutionLogger, formatLogLine } from "./logger";

const DEFAULT_PAGE_TIMEOUT_MS = 30_000;

export async function createBrowserbasePage(browser: Browser): Promise<Page> {
    const context = browser.contexts()[0];
    if (!context) {
        throw new Error("No browser context available from Browserbase session");
    }

    const page = context.pages()[0] ?? (await context.newPage());
    page.setDefaultTimeout(DEFAULT_PAGE_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(DEFAULT_PAGE_TIMEOUT_MS);
    return page;
}

export function attachPageListeners(
    page: Page,
    logs: string[],
    options?: { quiet?: boolean }
) {
    const { push } = createExecutionLogger(logs);

    page.on("console", (msg) => {
        if (options?.quiet && msg.type() === "log") return;
        push("[BROWSER]", `[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
        push("[BROWSER]", `Page error: ${err.message}`);
    });

    page.on("requestfailed", (request) => {
        const failure = request.failure();
        push(
            "[NETWORK]",
            `Request failed: ${request.method()} ${request.url()} — ${
                failure?.errorText ?? "unknown error"
            }`
        );
    });

    page.on("response", (response) => {
        const status = response.status();
        if (status >= 400) {
            push("[NETWORK]", `HTTP ${status} ${response.request().method()} ${response.url()}`);
        }
    });
}

export async function releaseBrowserSession(
    bb: Browserbase,
    sessionId: string,
    logs: string[]
) {
    try {
        await bb.sessions.update(sessionId, { status: "REQUEST_RELEASE" });
        logs.push(formatLogLine("[SYSTEM]", `Browserbase session ${sessionId} released`));
    } catch (err) {
        logs.push(
            formatLogLine(
                "[ERROR]",
                `Failed to release Browserbase session ${sessionId}: ${
                    err instanceof Error ? err.message : String(err)
                }`
            )
        );
    }
}

export function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    label: string
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);

        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

export function sessionUrls(sessionId: string) {
    const url = `https://www.browserbase.com/sessions/${sessionId}`;
    return { sessionUrl: url, recordingUrl: url };
}

export function createRecoveryHelper(logs: string[]) {
    const { push } = createExecutionLogger(logs);

    return async function recoverInteraction(
        page: Page,
        hints: {
            role?: string;
            name?: string;
            text?: string;
            label?: string;
            placeholder?: string;
        }
    ): Promise<boolean> {
        push("[PLAYWRIGHT]", "Attempting intelligent selector recovery (one retry)...");

        const candidates: Array<{ role: string; name: string }> = [];

        if (hints.role && hints.name) {
            candidates.push({ role: hints.role, name: hints.name });
        }
        if (hints.text) {
            candidates.push({ role: "button", name: hints.text });
            candidates.push({ role: "link", name: hints.text });
            candidates.push({ role: "heading", name: hints.text });
        }
        if (hints.label) {
            candidates.push({ role: "textbox", name: hints.label });
        }

        for (const candidate of candidates) {
            try {
                const locator = page.getByRole(candidate.role as Parameters<Page["getByRole"]>[0], {
                    name: new RegExp(escapeRegex(candidate.name), "i"),
                });
                if (await locator.first().isVisible({ timeout: 2000 })) {
                    await locator.first().click({ timeout: 5000 }).catch(async () => {
                        await locator.first().fill(candidate.name);
                    });
                    push(
                        "[PLAYWRIGHT]",
                        `Recovery succeeded via getByRole('${candidate.role}', { name: '${candidate.name}' })`
                    );
                    return true;
                }
            } catch {
                /* try next candidate */
            }
        }

        if (hints.placeholder) {
            try {
                const locator = page.getByPlaceholder(new RegExp(escapeRegex(hints.placeholder), "i"));
                if (await locator.first().isVisible({ timeout: 2000 })) {
                    push("[PLAYWRIGHT]", "Recovery succeeded via getByPlaceholder");
                    return true;
                }
            } catch {
                /* ignore */
            }
        }

        push("[PLAYWRIGHT]", "Recovery attempt failed — no matching element found");
        return false;
    };
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
