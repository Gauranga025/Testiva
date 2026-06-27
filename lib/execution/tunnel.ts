import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { formatLogLine } from "./logger";

const TUNNEL_VERIFY_TIMEOUT_MS = 15_000;

export type TunnelHandle = {
    publicUrl: string;
    provider: "cloudflare" | "ngrok";
    close: () => Promise<void>;
};

const TUNNEL_URL_PATTERN =
    /https:\/\/[a-z0-9-]+\.(?:trycloudflare\.com|ngrok-free\.app|ngrok\.io|ngrok\.app)[^\s]*/i;

const TUNNEL_START_TIMEOUT_MS = 45_000;

async function waitForTunnelUrl(
    proc: ChildProcessWithoutNullStreams,
    provider: "cloudflare" | "ngrok",
    logs: string[]
): Promise<string> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const chunks: string[] = [];

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
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
                            `${provider} tunnel exited with code ${code ?? "unknown"} before URL was ready`
                        )
                    )
                );
            }
        });

        const timer = setTimeout(() => {
            finish(() =>
                reject(new Error(`${provider} tunnel timed out after ${TUNNEL_START_TIMEOUT_MS}ms`))
            );
        }, TUNNEL_START_TIMEOUT_MS);
    });
}

async function createCloudflareTunnel(localUrl: string, logs: string[]): Promise<TunnelHandle> {
    logs.push(formatLogLine("[TUNNEL]", "Creating Cloudflare Tunnel"));

    const proc = spawn("cloudflared", ["tunnel", "--url", localUrl], {
        shell: process.platform === "win32",
        stdio: "pipe",
    });

    const publicUrl = await waitForTunnelUrl(proc, "cloudflare", logs);

    return {
        publicUrl,
        provider: "cloudflare",
        close: async () => {
            logs.push(formatLogLine("[TUNNEL]", "Closing Cloudflare Tunnel"));
            proc.kill("SIGTERM");
            logs.push(formatLogLine("[TUNNEL]", "Tunnel closed"));
        },
    };
}

export function verifyCloudflaredAvailable(): Promise<string> {
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
                new Error(
                    "cloudflared is not installed or not on PATH. Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
                )
            );
        });

        proc.on("exit", (code) => {
            if (code === 0) {
                const version = output.trim().split("\n")[0] || "cloudflared available";
                resolve(version);
            } else {
                reject(new Error("cloudflared --version failed — tunnel executable unavailable"));
            }
        });
    });
}

export async function verifyTunnelReachable(
    publicUrl: string,
    logs: string[]
): Promise<void> {
    logs.push(formatLogLine("[TUNNEL]", "Verifying tunnel connectivity..."));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TUNNEL_VERIFY_TIMEOUT_MS);

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
            throw new Error(`Tunnel URL returned server error ${response.status}`);
        }

        logs.push(
            formatLogLine(
                "[TUNNEL]",
                `Tunnel verified — public URL reachable (${response.status})`
            )
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Tunnel verification failed: ${message}`);
    } finally {
        clearTimeout(timer);
    }
}

export async function createTunnel(localUrl: string, logs: string[]): Promise<TunnelHandle> {
    try {
        return await createCloudflareTunnel(localUrl, logs);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logs.push(formatLogLine("[TUNNEL]", `Cloudflare tunnel failed: ${message}`));
        throw new Error(`Tunnel creation failed: ${message}`);
    }
}
