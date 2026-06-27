/**
 * Local Server Verification Service for localhost stability.
 */

import { formatLogLine } from "./logger";
import { createExecutionError, ExecutionErrorCode } from "./errors";
import { TimeoutManager } from "./timeout-manager";

export class LocalServerVerifier {
    private logs: string[];
    private timeoutManager: TimeoutManager;

    constructor(logs: string[], timeoutManager?: TimeoutManager) {
        this.logs = logs;
        this.timeoutManager = timeoutManager || new TimeoutManager();
    }

    async verify(url: string): Promise<void> {
        this.logs.push(formatLogLine("[ENVIRONMENT]", "Verifying local server accessibility..."));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutManager.getTimeout("tunnelVerification"));

        try {
            let response: Response;
            
            try {
                response = await fetch(url, {
                    method: "HEAD",
                    signal: controller.signal,
                    redirect: "follow",
                });
            } catch {
                response = await fetch(url, {
                    method: "GET",
                    signal: controller.signal,
                    redirect: "follow",
                });
            }

            if (response.status >= 500) {
                throw createExecutionError(
                    ExecutionErrorCode.LOCALHOST_UNREACHABLE,
                    `Local server returned HTTP ${response.status}`,
                    { url, status: response.status }
                );
            }

            this.logs.push(
                formatLogLine(
                    "[ENVIRONMENT]",
                    `Local server verified — reachable (${response.status})`
                )
            );
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw createExecutionError(
                    ExecutionErrorCode.LOCALHOST_UNREACHABLE,
                    `Local server verification timed out after ${this.timeoutManager.getTimeout("tunnelVerification")}ms`,
                    { url }
                );
            }
            
            if (error instanceof Error) {
                throw createExecutionError(
                    ExecutionErrorCode.LOCALHOST_UNREACHABLE,
                    `Local server verification failed: ${error.message}`,
                    { url }
                );
            }
            
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    async verifyWithRetry(url: string, maxAttempts: number = 3): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await this.verify(url);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                if (attempt === maxAttempts) {
                    throw lastError;
                }

                this.logs.push(
                    formatLogLine(
                        "[ENVIRONMENT]",
                        `Local server verification attempt ${attempt}/${maxAttempts} failed, retrying...`
                    )
                );

                await this.sleep(1000 * attempt);
            }
        }

        throw lastError;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
