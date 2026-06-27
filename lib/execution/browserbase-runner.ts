import { Browserbase } from "@browserbasehq/sdk";
import { chromium, type Browser } from "playwright-core";
import {
    compilePlaywrightScript,
    createExecutionLogger,
    formatLogLine,
} from "./logger";
import {
    attachPageListeners,
    createBrowserbasePage,
    createRecoveryHelper,
    releaseBrowserSession,
    sessionUrls,
    withTimeout,
} from "./browser-session";

const DEFAULT_EXECUTION_TIMEOUT_MS = 120_000;
const CDP_CONNECT_TIMEOUT_MS = 30_000;

export type ExecutionOutcome = {
    success: boolean;
    logs: string[];
    sessionId: string | null;
    sessionUrl: string | null;
    recordingUrl: string | null;
    error?: string;
};

async function cleanupBrowser(browser: Browser | null, logs: string[]) {
    if (!browser) return;
    try {
        await browser.close();
        logs.push(formatLogLine("[SYSTEM]", "Playwright browser connection closed"));
    } catch (err) {
        logs.push(
            formatLogLine(
                "[ERROR]",
                `Browser close failed: ${err instanceof Error ? err.message : String(err)}`
            )
        );
    }
}

export async function runBrowserbaseScript(options: {
    bb: Browserbase;
    projectId: string;
    scriptText: string;
    executionTimeoutMs?: number;
}): Promise<ExecutionOutcome> {
    const logs: string[] = [];
    const { push, consoleShim } = createExecutionLogger(logs);
    const timeoutMs = options.executionTimeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;

    let session: { id: string; connectUrl: string } | null = null;
    let browser: Browser | null = null;

    push("[SYSTEM]", "Validating Playwright script...");
    const { runFn } = compilePlaywrightScript(options.scriptText);
    push("[SYSTEM]", "Script compiled successfully");

    try {
        push("[PLAYWRIGHT]", "Executing test script in Browserbase cloud browser...");
        push("[SYSTEM]", "Creating Browserbase cloud session...");
        session = await options.bb.sessions.create({
            projectId: options.projectId,
            timeout: Math.ceil(timeoutMs / 1000) + 60,
            browserSettings: {
                recordSession: true,
                logSession: true,
            },
        });

        const { sessionUrl, recordingUrl } = sessionUrls(session.id);
        push("[SYSTEM]", `Browserbase session created: ${session.id}`);
        push("[SYSTEM]", `Session URL: ${sessionUrl}`);
        push("[SYSTEM]", `Recording URL: ${recordingUrl}`);

        push("[SYSTEM]", "Connecting Playwright over CDP...");
        browser = await withTimeout(
            chromium.connectOverCDP(session.connectUrl),
            CDP_CONNECT_TIMEOUT_MS,
            "CDP connection"
        );

        const page = await createBrowserbasePage(browser);
        attachPageListeners(page, logs);
        push("[SYSTEM]", "Connected to Browserbase cloud browser, executing script...");

        const assertHelper = (condition: boolean, message?: string) => {
            if (!condition) {
                const msg = message || "Assertion failed";
                push("[ASSERT]", `Failed: ${msg}`);
                throw new Error(msg);
            }
        };

        const recoverBound = createRecoveryHelper(logs);
        const recoverHelper = (hints: Parameters<typeof recoverBound>[1]) =>
            recoverBound(page, hints);

        const executeOnce = () =>
            withTimeout(
                runFn(page, assertHelper, consoleShim, recoverHelper),
                timeoutMs,
                "Script execution"
            );

        try {
            await executeOnce();
        } catch (firstErr) {
            const firstMessage =
                firstErr instanceof Error ? firstErr.message : String(firstErr);
            push("[PLAYWRIGHT]", `Execution error: ${firstMessage}`);
            push("[DISCOVERY]", "Refreshing DOM context for one recovery attempt...");

            try {
                await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
                await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
                push("[PLAYWRIGHT]", "Retrying script execution after DOM refresh...");
                await executeOnce();
            } catch (retryErr) {
                throw retryErr instanceof Error ? retryErr : new Error(String(retryErr));
            }
        }

        push("[ASSERT]", "All assertions passed");
        push("[SYSTEM]", "Script execution completed successfully");

        return {
            success: true,
            logs,
            sessionId: session.id,
            sessionUrl,
            recordingUrl,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        push("[ERROR]", `Script execution failed: ${message}`);

        return {
            success: false,
            logs,
            sessionId: session?.id ?? null,
            sessionUrl: session ? sessionUrls(session.id).sessionUrl : null,
            recordingUrl: session ? sessionUrls(session.id).recordingUrl : null,
            error: message,
        };
    } finally {
        await cleanupBrowser(browser, logs);
        if (session?.id) {
            await releaseBrowserSession(options.bb, session.id, logs);
        }
    }
}
