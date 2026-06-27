/**
 * Timeout Manager for centralized timeout handling.
 */

export type TimeoutConfig = {
    cdpConnect: number;
    tunnelCreation: number;
    tunnelVerification: number;
    scriptExecution: number;
    uiDiscovery: number;
    pageLoad: number;
    networkIdle: number;
    default: number;
};

export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
    cdpConnect: 30_000,
    tunnelCreation: 45_000,
    tunnelVerification: 15_000,
    scriptExecution: 120_000,
    uiDiscovery: 90_000,
    pageLoad: 30_000,
    networkIdle: 15_000,
    default: 30_000,
};

export class TimeoutManager {
    private activeTimers: Map<string, NodeJS.Timeout> = new Map();
    private config: TimeoutConfig;

    constructor(config: Partial<TimeoutConfig> = {}) {
        this.config = { ...DEFAULT_TIMEOUT_CONFIG, ...config };
    }

    getTimeout(key: keyof TimeoutConfig): number {
        return this.config[key] || this.config.default;
    }

    withTimeout<T>(
        promise: Promise<T>,
        key: keyof TimeoutConfig,
        label?: string
    ): Promise<T> {
        const timeoutMs = this.getTimeout(key);
        return this.withTimeoutMs(promise, timeoutMs, label);
    }

    withTimeoutMs<T>(
        promise: Promise<T>,
        timeoutMs: number,
        label?: string
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const timerId = `timeout_${Date.now()}_${Math.random()}`;
            
            const timer = setTimeout(() => {
                this.activeTimers.delete(timerId);
                reject(new Error(`${label || "Operation"} timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            this.activeTimers.set(timerId, timer);

            promise
                .then((value) => {
                    clearTimeout(timer);
                    this.activeTimers.delete(timerId);
                    resolve(value);
                })
                .catch((error) => {
                    clearTimeout(timer);
                    this.activeTimers.delete(timerId);
                    reject(error);
                });
        });
    }

    clearAll(): void {
        for (const [id, timer] of this.activeTimers) {
            clearTimeout(timer);
        }
        this.activeTimers.clear();
    }

    getActiveTimerCount(): number {
        return this.activeTimers.size;
    }

    withConfig(config: Partial<TimeoutConfig>): TimeoutManager {
        return new TimeoutManager({ ...this.config, ...config });
    }
}
