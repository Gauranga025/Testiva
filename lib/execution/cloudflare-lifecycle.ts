/**
 * Cloudflare Lifecycle Manager for tunnel management.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { formatLogLine } from "./logger";
import { createExecutionError, ExecutionErrorCode } from "./errors";
import { TimeoutManager } from "./timeout-manager";

const TUNNEL_URL_PATTERN =
    /https:\/\/[a-z0-9-]+\.(?:trycloudflare\.com|ngrok-free\.app|ngrok\.io|ngrok\.app)[^\s]*/i;

export type CloudflareTunnel = {
    id: string;
    localUrl: string;
    publicUrl: string;
    process: ChildProcessWithoutNullStreams;
};

export class CloudflareLifecycleManager {
    private tunnels: Map<string, CloudflareTunnel> = new Map();
    private logs: string[];
    private timeoutManager: TimeoutManager;

    constructor(logs: string[], timeoutManager?: TimeoutManager) {
        this.logs = logs;
        this.timeoutManager = timeoutManager || new TimeoutManager();
    }

    async createTunnel(localUrl: string): Promise<CloudflareTunnel> {
        this.logs.push(formatLogLine("[CLOUDFLARE]", "Creating Cloudflare tunnel..."));

        const tunnelId = `tunnel_${Date.now()}_${Math.random()}`;

        try {
            await this.verifyCloudflaredAvailable();
        } catch (error) {
            throw error;
        }

        const proc = spawn("cloudflared", ["tunnel", "--url", localUrl], {
            shell: process.platform === "win32",
            stdio: "pipe",
        });

        const publicUrl = await this.waitForTunnelUrl(proc);

        const tunnel: CloudflareTunnel = {
            id: tunnelId,
            localUrl,
            publicUrl,
            process: proc,
        };

        this.tunnels.set(tunnelId, tunnel);
        this.logs.push(formatLogLine("[CLOUDFLARE]", `Tunnel created: ${tunnelId}`));
        this.logs.push(formatLogLine("[CLOUDFLARE]", `Public URL: ${publicUrl}`));

        return tunnel;
    }

    private async waitForTunnelUrl(proc: ChildProcessWithoutNullStreams): Promise<string> {
        return new Promise((resolve, reject) => {
            let settled = false;
            const chunks: string[] = [];

            const finish = (fn: () => void) => {
                if (settled) return;
                settled = true;
                fn();
            };

            const tryResolve = (text: string) => {
                const match = text.match(TUNNEL_URL_PATTERN);
                if (match) {
                    finish(() => resolve(match[0].replace(/[.,]$/, "")));
                }
            };

            const onData = (data: Buffer) => {
                const text = data.toString();
                chunks.push(text);
                tryResolve(chunks.join(""));
            };

            proc.stdout.on("data", onData);
            proc.stderr.on("data", onData);

            proc.on("error", (err) => {
                finish(() => reject(err));
            });

            proc.on("exit", (code) => {
                if (!settled) {
                    finish(() =>
                        reject(
                            new Error(
                                `Cloudflare tunnel exited with code ${code ?? "unknown"} before URL was ready`
                            )
                        )
                    );
                }
            });

            const timer = setTimeout(() => {
                finish(() =>
                    reject(
                        createExecutionError(
                            ExecutionErrorCode.TUNNEL_TIMEOUT,
                            `Cloudflare tunnel timed out after ${this.timeoutManager.getTimeout("tunnelCreation")}ms`
                        )
                    )
                );
            }, this.timeoutManager.getTimeout("tunnelCreation"));
        });
    }

    async verifyTunnelReachable(publicUrl: string): Promise<void> {
        this.logs.push(formatLogLine("[CLOUDFLARE]", "Verifying tunnel connectivity..."));

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutManager.getTimeout("tunnelVerification"));

        try {
            let response: Response;
            try {
                response = await fetch(publicUrl, {
                    method: "HEAD",
                    signal: controller.signal,
                    redirect: "follow",
                });
            } catch {
                response = await fetch(publicUrl, {
                    method: "GET",
                    signal: controller.signal,
                    redirect: "follow",
                });
            }

            if (response.status >= 500) {
                throw createExecutionError(
                    ExecutionErrorCode.TUNNEL_VERIFICATION_FAILED,
                    `Tunnel URL returned server error ${response.status}`,
                    { publicUrl, status: response.status }
                );
            }

            this.logs.push(
                formatLogLine(
                    "[CLOUDFLARE]",
                    `Tunnel verified — public URL reachable (${response.status})`
                )
            );
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw createExecutionError(
                    ExecutionErrorCode.TUNNEL_VERIFICATION_FAILED,
                    `Tunnel verification timed out after ${this.timeoutManager.getTimeout("tunnelVerification")}ms`,
                    { publicUrl }
                );
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    async closeTunnel(tunnelId: string): Promise<void> {
        const tunnel = this.tunnels.get(tunnelId);
        if (!tunnel) {
            this.logs.push(formatLogLine("[CLOUDFLARE]", `Tunnel ${tunnelId} not found, skipping cleanup`));
            return;
        }

        try {
            this.logs.push(formatLogLine("[CLOUDFLARE]", `Closing tunnel ${tunnelId}...`));
            tunnel.process.kill("SIGTERM");
            this.logs.push(formatLogLine("[CLOUDFLARE]", `Tunnel ${tunnelId} closed`));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logs.push(
                formatLogLine(
                    "[CLOUDFLARE]",
                    `Failed to close tunnel ${tunnelId}: ${message}`
                )
            );
        } finally {
            this.tunnels.delete(tunnelId);
        }
    }

    async cleanupAll(): Promise<void> {
        this.logs.push(formatLogLine("[CLOUDFLARE]", "Cleaning up all tunnels..."));

        const tunnelIds = Array.from(this.tunnels.keys());

        for (const tunnelId of tunnelIds) {
            await this.closeTunnel(tunnelId);
        }

        this.logs.push(formatLogLine("[CLOUDFLARE]", "All tunnels cleaned up"));
    }

    getTunnel(tunnelId: string): CloudflareTunnel | undefined {
        return this.tunnels.get(tunnelId);
    }

    getActiveTunnelCount(): number {
        return this.tunnels.size;
    }

    async verifyCloudflaredAvailable(): Promise<string> {
        return new Promise((resolve, reject) => {
            const proc = spawn("cloudflared", ["--version"], {
                shell: process.platform === "win32",
                stdio: ["ignore", "pipe", "pipe"],
            });

            let output = "";
            proc.stdout.on("data", (data: Buffer) => {
                output += data.toString();
            });
            proc.stderr.on("data", (data: Buffer) => {
                output += data.toString();
            });

            proc.on("error", () => {
                reject(
                    createExecutionError(
                        ExecutionErrorCode.CLOUDFLARED_NOT_AVAILABLE,
                        "cloudflared is not installed or not on PATH. Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
                    )
                );
            });

            proc.on("exit", (code) => {
                if (code === 0) {
                    const version = output.trim().split("\n")[0] || "cloudflared available";
                    resolve(version);
                } else {
                    reject(
                        createExecutionError(
                            ExecutionErrorCode.CLOUDFLARED_NOT_AVAILABLE,
                            "cloudflared --version failed — tunnel executable unavailable"
                        )
                    );
                }
            });
        });
    }
}
