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
        const errorChunks: string[] = [];

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
            console.log(`[TUNNEL] ${provider} stdout:`, text.trim());
            tryResolve(chunks.join(""));
        };

        const onErrorData = (data: Buffer) => {
            const text = data.toString();
            errorChunks.push(text);
            console.log(`[TUNNEL] ${provider} stderr:`, text.trim());
        };

        proc.stdout.on("data", onData);
        proc.stderr.on("data", onErrorData);

        proc.on("error", (err) => {
            console.log(`[TUNNEL] ${provider} process error:`, err);
            finish(() => reject(err));
        });

        proc.on("exit", (code) => {
            if (!settled) {
                const errorOutput = errorChunks.join("");
                console.log(`[TUNNEL] ${provider} exited with code ${code}. Error output:`, errorOutput);
                finish(() =>
                    reject(
                        new Error(
                            `${provider} tunnel exited with code ${code ?? "unknown"} before URL was ready${errorOutput ? `. Error: ${errorOutput}` : ''}`
                        )
                    )
                );
            }
        });

        const timer = setTimeout(() => {
            console.log(`[TUNNEL] ${provider} tunnel timed out after ${TUNNEL_START_TIMEOUT_MS}ms`);
            finish(() =>
                reject(new Error(`${provider} tunnel timed out after ${TUNNEL_START_TIMEOUT_MS}ms`))
            );
        }, TUNNEL_START_TIMEOUT_MS);
    });
}

async function createCloudflareTunnel(localUrl: string, logs: string[]): Promise<TunnelHandle> {
    const maxRetries = 3;
    const baseDelayMs = 5000; // 5 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[TUNNEL] Creating Cloudflare Tunnel for: ${localUrl} (attempt ${attempt}/${maxRetries})`);
        logs.push(formatLogLine("[TUNNEL]", `Creating Cloudflare Tunnel (attempt ${attempt}/${maxRetries})`));

        const proc = spawn("cloudflared", ["tunnel", "--url", localUrl], {
            shell: process.platform === "win32",
            stdio: "pipe",
        });

        try {
            const publicUrl = await waitForTunnelUrl(proc, "cloudflare", logs);
            console.log('[TUNNEL] Tunnel URL generated:', publicUrl);
            logs.push(formatLogLine("[TUNNEL]", `Tunnel URL generated: ${publicUrl}`));

            // Wait for tunnel to become operational
            console.log('[TUNNEL] Waiting 3 seconds for tunnel to become operational...');
            logs.push(formatLogLine("[TUNNEL]", "Waiting for tunnel to become operational..."));
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log('[TUNNEL] Tunnel operational delay complete');
            logs.push(formatLogLine("[TUNNEL]", "Tunnel operational delay complete"));

            return {
                publicUrl,
                provider: "cloudflare",
                close: async () => {
                    console.log('[TUNNEL] Closing Cloudflare Tunnel');
                    logs.push(formatLogLine("[TUNNEL]", "Closing Cloudflare Tunnel"));
                    proc.kill("SIGTERM");
                    console.log('[TUNNEL] Tunnel closed');
                    logs.push(formatLogLine("[TUNNEL]", "Tunnel closed"));
                },
            };
        } catch (error) {
            console.log(`[TUNNEL] Tunnel creation attempt ${attempt} failed:`, error);
            proc.kill("SIGTERM");
            
            // Check if it's a rate limit error (429)
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isRateLimit = errorMessage.includes("429") || errorMessage.includes("Too Many Requests");
            
            if (attempt < maxRetries && isRateLimit) {
                const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
                console.log(`[TUNNEL] Rate limit detected. Waiting ${delayMs}ms before retry...`);
                logs.push(formatLogLine("[TUNNEL]", `Rate limit detected. Retrying in ${delayMs}ms...`));
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                throw error;
            }
        }
    }
    
    throw new Error("Failed to create Cloudflare tunnel after maximum retries");
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
    console.log('[TUNNEL] Verifying tunnel connectivity...');
    console.log('[TUNNEL] Target URL:', publicUrl);
    logs.push(formatLogLine("[TUNNEL]", "Verifying tunnel connectivity..."));
    logs.push(formatLogLine("[TUNNEL]", `Target URL: ${publicUrl}`));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TUNNEL_VERIFY_TIMEOUT_MS);

    try {
        let response: Response;
        try {
            console.log('[TUNNEL] Attempting HEAD request...');
            logs.push(formatLogLine("[TUNNEL]", "Attempting HEAD request..."));
            response = await fetch(publicUrl, {
                method: "HEAD",
                signal: controller.signal,
                redirect: "follow",
            });
            console.log('[TUNNEL] HEAD request completed - status:', response.status);
            logs.push(formatLogLine("[TUNNEL]", `HEAD request completed - status: ${response.status}`));
        } catch (headError) {
            console.log('[TUNNEL] HEAD request failed:', headError instanceof Error ? headError.message : String(headError));
            logs.push(formatLogLine("[TUNNEL]", `HEAD request failed: ${headError instanceof Error ? headError.message : String(headError)}`));
            console.log('[TUNNEL] Attempting GET request as fallback...');
            logs.push(formatLogLine("[TUNNEL]", "Attempting GET request as fallback..."));
            response = await fetch(publicUrl, {
                method: "GET",
                signal: controller.signal,
                redirect: "follow",
            });
            console.log('[TUNNEL] GET request completed - status:', response.status);
            logs.push(formatLogLine("[TUNNEL]", `GET request completed - status: ${response.status}`));
        }

        if (response.status >= 500) {
            throw new Error(`Tunnel URL returned server error ${response.status}`);
        }

        console.log('[TUNNEL] Tunnel verified - public URL reachable');
        logs.push(
            formatLogLine(
                "[TUNNEL]",
                `Tunnel verified — public URL reachable (${response.status})`
            )
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log('[TUNNEL] Tunnel verification error:', message);
        console.log('[TUNNEL] Error details:', error instanceof Error ? error.stack : String(error));
        logs.push(formatLogLine("[TUNNEL]", `Tunnel verification error: ${message}`));
        logs.push(formatLogLine("[TUNNEL]", `Error details: ${error instanceof Error ? error.stack : String(error)}`));
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
