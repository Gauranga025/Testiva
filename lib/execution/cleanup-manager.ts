/**
 * Cleanup Manager for centralized resource cleanup.
 */

import { formatLogLine } from "./logger";

export type CleanupResource = {
    type: "tunnel" | "browserbase_session" | "browser" | "custom";
    id: string;
    cleanup: () => Promise<void>;
    priority: number;
};

export class CleanupManager {
    private resources: CleanupResource[] = [];
    private logs: string[] = [];

    constructor(logs: string[] = []) {
        this.logs = logs;
    }

    register(resource: CleanupResource): void {
        this.resources.push(resource);
        this.resources.sort((a, b) => b.priority - a.priority);
    }

    registerTunnel(id: string, cleanup: () => Promise<void>): void {
        this.register({
            type: "tunnel",
            id,
            cleanup,
            priority: 100,
        });
    }

    registerBrowserbaseSession(id: string, cleanup: () => Promise<void>): void {
        this.register({
            type: "browserbase_session",
            id,
            cleanup,
            priority: 90,
        });
    }

    registerBrowser(id: string, cleanup: () => Promise<void>): void {
        this.register({
            type: "browser",
            id,
            cleanup,
            priority: 80,
        });
    }

    registerCustom(id: string, cleanup: () => Promise<void>, priority: number = 50): void {
        this.register({
            type: "custom",
            id,
            cleanup,
            priority,
        });
    }

    async cleanupAll(): Promise<void> {
        this.logs.push(formatLogLine("[CLEANUP]", "Starting resource cleanup..."));

        for (const resource of this.resources) {
            try {
                this.logs.push(
                    formatLogLine(
                        `[CLEANUP]`,
                        `Cleaning up ${resource.type}: ${resource.id}`
                    )
                );
                await resource.cleanup();
                this.logs.push(
                    formatLogLine(
                        `[CLEANUP]`,
                        `Cleaned up ${resource.type}: ${resource.id}`
                    )
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logs.push(
                    formatLogLine(
                        `[CLEANUP]`,
                        `Failed to clean up ${resource.type} ${resource.id}: ${message}`
                    )
                );
            }
        }

        this.resources = [];
        this.logs.push(formatLogLine("[CLEANUP]", "Resource cleanup completed"));
    }

    async cleanupType(type: CleanupResource["type"]): Promise<void> {
        const toCleanup = this.resources.filter((r) => r.type === type);
        
        for (const resource of toCleanup) {
            try {
                this.logs.push(
                    formatLogLine(
                        `[CLEANUP]`,
                        `Cleaning up ${resource.type}: ${resource.id}`
                    )
                );
                await resource.cleanup();
                this.resources = this.resources.filter((r) => r.id !== resource.id);
                this.logs.push(
                    formatLogLine(
                        `[CLEANUP]`,
                        `Cleaned up ${resource.type}: ${resource.id}`
                    )
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logs.push(
                    formatLogLine(
                        `[CLEANUP]`,
                        `Failed to clean up ${resource.type} ${resource.id}: ${message}`
                    )
                );
            }
        }
    }

    getResourceCount(): number {
        return this.resources.length;
    }

    getResourceCountByType(type: CleanupResource["type"]): number {
        return this.resources.filter((r) => r.type === type).length;
    }

    clearRegistrations(): void {
        this.resources = [];
    }
}
