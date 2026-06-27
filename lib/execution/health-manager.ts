/**
 * Health Manager for centralized health checking.
 */

import { formatLogLine } from "./logger";
import { createExecutionError, ExecutionErrorCode } from "./errors";
import type { HealthCheckItem, HealthReport } from "./types";
import { TimeoutManager } from "./timeout-manager";

export type HealthCheckFn = () => Promise<string>;

export type HealthCheckDefinition = {
    id: string;
    label: string;
    check: HealthCheckFn;
    required: boolean;
};

export class HealthManager {
    private checks: Map<string, HealthCheckDefinition> = new Map();
    private logs: string[];
    private timeoutManager: TimeoutManager;

    constructor(logs: string[], timeoutManager?: TimeoutManager) {
        this.logs = logs;
        this.timeoutManager = timeoutManager || new TimeoutManager();
    }

    registerCheck(definition: HealthCheckDefinition): void {
        this.checks.set(definition.id, definition);
    }

    registerCheckById(
        id: string,
        label: string,
        check: HealthCheckFn,
        required: boolean = true
    ): void {
        this.registerCheck({ id, label, check, required });
    }

    unregisterCheck(id: string): void {
        this.checks.delete(id);
    }

    async runCheck(id: string): Promise<HealthCheckItem> {
        const definition = this.checks.get(id);
        if (!definition) {
            throw createExecutionError(
                ExecutionErrorCode.INTERNAL_ERROR,
                `Health check ${id} not found`
            );
        }

        const start = Date.now();
        try {
            const message = await this.timeoutManager.withTimeoutMs(
                definition.check(),
                12000,
                `Health check ${id}`
            );
            return {
                id,
                label: definition.label,
                status: "passed",
                message,
                durationMs: Date.now() - start,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                id,
                label: definition.label,
                status: "failed",
                message,
                durationMs: Date.now() - start,
            };
        }
    }

    async runAllChecks(): Promise<HealthReport> {
        this.logs.push(formatLogLine("[HEALTH]", "Running health checks..."));

        const checks: HealthCheckItem[] = [];
        const checkIds = Array.from(this.checks.keys());

        for (const id of checkIds) {
            const result = await this.runCheck(id);
            checks.push(result);
        }

        for (const check of checks) {
            const statusLabel =
                check.status === "passed"
                    ? "OK"
                    : check.status === "skipped"
                      ? "SKIP"
                      : "FAIL";
            this.logs.push(
                formatLogLine(
                    "[HEALTH]",
                    `${check.label}: ${statusLabel} — ${check.message}`
                )
            );
        }

        const requiredChecks = checks.filter((c) => {
            const definition = this.checks.get(c.id);
            return definition?.required ?? true;
        });

        const ok = requiredChecks.every((check) => check.status === "passed");

        if (!ok) {
            const failed = checks.filter((check) => check.status === "failed");
            this.logs.push(
                formatLogLine(
                    "[HEALTH]",
                    `Health checks failed — ${failed.length} check(s) did not pass`
                )
            );
        } else {
            this.logs.push(formatLogLine("[HEALTH]", "All health checks passed"));
        }

        return {
            ok,
            environmentType: "deployed",
            checks,
        };
    }

    async runRequiredChecks(): Promise<HealthReport> {
        this.logs.push(formatLogLine("[HEALTH]", "Running required health checks..."));

        const checks: HealthCheckItem[] = [];
        const checkIds = Array.from(this.checks.keys());

        for (const id of checkIds) {
            const definition = this.checks.get(id);
            if (!definition?.required) continue;

            const result = await this.runCheck(id);
            checks.push(result);
        }

        for (const check of checks) {
            const statusLabel =
                check.status === "passed"
                    ? "OK"
                    : check.status === "skipped"
                      ? "SKIP"
                      : "FAIL";
            this.logs.push(
                formatLogLine(
                    "[HEALTH]",
                    `${check.label}: ${statusLabel} — ${check.message}`
                )
            );
        }

        const ok = checks.every((check) => check.status === "passed");

        if (!ok) {
            const failed = checks.filter((check) => check.status === "failed");
            this.logs.push(
                formatLogLine(
                    "[HEALTH]",
                    `Required health checks failed — ${failed.length} check(s) did not pass`
                )
            );
        } else {
            this.logs.push(formatLogLine("[HEALTH]", "All required health checks passed"));
        }

        return {
            ok,
            environmentType: "deployed",
            checks,
        };
    }

    getCheckCount(): number {
        return this.checks.size;
    }

    clearChecks(): void {
        this.checks.clear();
    }
}
