/**
 * Browserbase Lifecycle Manager for session management.
 */

import { Browserbase } from "@browserbasehq/sdk";
import { type Browser } from "playwright-core";
import { formatLogLine } from "./logger";
import { createExecutionError, ExecutionErrorCode } from "./errors";
import { TimeoutManager } from "./timeout-manager";

export type BrowserbaseSession = {
    id: string;
    connectUrl: string;
    browser: Browser | null;
};

export class BrowserbaseLifecycleManager {
    private sessions: Map<string, BrowserbaseSession> = new Map();
    private bb: Browserbase;
    private projectId: string;
    private logs: string[];
    private timeoutManager: TimeoutManager;

    constructor(
        bb: Browserbase,
        projectId: string,
        logs: string[],
        timeoutManager?: TimeoutManager
    ) {
        this.bb = bb;
        this.projectId = projectId;
        this.logs = logs;
        this.timeoutManager = timeoutManager || new TimeoutManager();
    }

    async createSession(timeoutOverride?: number): Promise<BrowserbaseSession> {
        this.logs.push(formatLogLine("[BROWSERBASE]", "Creating Browserbase session..."));

        const timeout = timeoutOverride || this.timeoutManager.getTimeout("scriptExecution");

        try {
            const session = await this.timeoutManager.withTimeoutMs(
                this.bb.sessions.create({
                    projectId: this.projectId,
                    timeout: Math.ceil(timeout / 1000) + 60,
                    browserSettings: {
                        recordSession: true,
                        logSession: true,
                    },
                }),
                this.timeoutManager.getTimeout("cdpConnect"),
                "Browserbase session creation"
            );

            const sessionData: BrowserbaseSession = {
                id: session.id,
                connectUrl: session.connectUrl,
                browser: null,
            };

            this.sessions.set(session.id, sessionData);
            this.logs.push(formatLogLine("[BROWSERBASE]", `Session created: ${session.id}`));

            return sessionData;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw createExecutionError(
                ExecutionErrorCode.BROWSERBASE_SESSION_CREATE_FAILED,
                `Failed to create Browserbase session: ${message}`,
                { projectId: this.projectId },
                error instanceof Error ? error : undefined
            );
        }
    }

    async connectBrowser(sessionId: string, browser: Browser): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw createExecutionError(
                ExecutionErrorCode.BROWSERBASE_SESSION_CREATE_FAILED,
                `Session ${sessionId} not found`
            );
        }

        session.browser = browser;
        this.logs.push(formatLogLine("[BROWSERBASE]", `Browser connected to session ${sessionId}`));
    }

    async releaseSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            this.logs.push(formatLogLine("[BROWSERBASE]", `Session ${sessionId} not found, skipping release`));
            return;
        }

        try {
            await this.bb.sessions.update(sessionId, { status: "REQUEST_RELEASE" });
            this.logs.push(formatLogLine("[BROWSERBASE]", `Session ${sessionId} released`));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logs.push(
                formatLogLine(
                    "[BROWSERBASE]",
                    `Failed to release session ${sessionId}: ${message}`
                )
            );
            throw createExecutionError(
                ExecutionErrorCode.BROWSERBASE_SESSION_RELEASE_FAILED,
                `Failed to release Browserbase session ${sessionId}: ${message}`,
                { sessionId },
                error instanceof Error ? error : undefined
            );
        } finally {
            this.sessions.delete(sessionId);
        }
    }

    async closeBrowser(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session?.browser) {
            return;
        }

        try {
            await session.browser.close();
            this.logs.push(formatLogLine("[BROWSERBASE]", `Browser closed for session ${sessionId}`));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logs.push(
                formatLogLine(
                    "[BROWSERBASE]",
                    `Failed to close browser for session ${sessionId}: ${message}`
                )
            );
        } finally {
            if (session) {
                session.browser = null;
            }
        }
    }

    async cleanupSession(sessionId: string): Promise<void> {
        await this.closeBrowser(sessionId);
        await this.releaseSession(sessionId);
    }

    async cleanupAll(): Promise<void> {
        this.logs.push(formatLogLine("[BROWSERBASE]", "Cleaning up all sessions..."));

        const sessionIds = Array.from(this.sessions.keys());

        for (const sessionId of sessionIds) {
            await this.cleanupSession(sessionId);
        }

        this.logs.push(formatLogLine("[BROWSERBASE]", "All sessions cleaned up"));
    }

    getSession(sessionId: string): BrowserbaseSession | undefined {
        return this.sessions.get(sessionId);
    }

    getActiveSessionCount(): number {
        return this.sessions.size;
    }

    sessionUrls(sessionId: string): { sessionUrl: string; recordingUrl: string } {
        const url = `https://www.browserbase.com/sessions/${sessionId}`;
        return { sessionUrl: url, recordingUrl: url };
    }
}
