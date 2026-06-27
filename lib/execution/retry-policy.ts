/**
 * Retry Policy Service for resilient execution.
 */

export type RetryConfig = {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
        "TIMEOUT",
        "TUNNEL_TIMEOUT",
        "SCRIPT_TIMEOUT",
        "BROWSERBASE_CDP_CONNECT_FAILED",
        "NETWORK_ERROR",
    ],
};

export class RetryPolicy {
    constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        context: string,
        onError?: (attempt: number, error: Error) => void
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                if (!this.isRetryable(lastError)) {
                    throw lastError;
                }

                if (attempt === this.config.maxAttempts) {
                    throw lastError;
                }

                if (onError) {
                    onError(attempt, lastError);
                }

                const delay = this.calculateDelay(attempt);
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    private isRetryable(error: Error): boolean {
        const errorMessage = error.message;
        return this.config.retryableErrors.some((pattern) =>
            errorMessage.includes(pattern)
        );
    }

    private calculateDelay(attempt: number): number {
        const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
        return Math.min(delay, this.config.maxDelayMs);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    withConfig(config: Partial<RetryConfig>): RetryPolicy {
        return new RetryPolicy({ ...this.config, ...config });
    }
}
