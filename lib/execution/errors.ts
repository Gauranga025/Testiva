/**
 * Structured execution errors for production-grade error handling.
 */

export enum ExecutionErrorCode {
    // Environment errors
    INVALID_URL = "INVALID_URL",
    LOCALHOST_UNREACHABLE = "LOCALHOST_UNREACHABLE",
    DEPLOYED_URL_UNREACHABLE = "DEPLOYED_URL_UNREACHABLE",
    
    // Tunnel errors
    TUNNEL_CREATION_FAILED = "TUNNEL_CREATION_FAILED",
    TUNNEL_VERIFICATION_FAILED = "TUNNEL_VERIFICATION_FAILED",
    TUNNEL_TIMEOUT = "TUNNEL_TIMEOUT",
    CLOUDFLARED_NOT_AVAILABLE = "CLOUDFLARED_NOT_AVAILABLE",
    
    // Browserbase errors
    BROWSERBASE_API_ERROR = "BROWSERBASE_API_ERROR",
    BROWSERBASE_SESSION_CREATE_FAILED = "BROWSERBASE_SESSION_CREATE_FAILED",
    BROWSERBASE_CDP_CONNECT_FAILED = "BROWSERBASE_CDP_CONNECT_FAILED",
    BROWSERBASE_SESSION_RELEASE_FAILED = "BROWSERBASE_SESSION_RELEASE_FAILED",
    
    // Script errors
    SCRIPT_COMPILATION_FAILED = "SCRIPT_COMPILATION_FAILED",
    SCRIPT_EXECUTION_FAILED = "SCRIPT_EXECUTION_FAILED",
    SCRIPT_TIMEOUT = "SCRIPT_TIMEOUT",
    ASSERTION_FAILED = "ASSERTION_FAILED",
    
    // AI errors
    AI_GENERATION_FAILED = "AI_GENERATION_FAILED",
    AI_PROVIDER_UNAVAILABLE = "AI_PROVIDER_UNAVAILABLE",
    
    // Database errors
    DATABASE_ERROR = "DATABASE_ERROR",
    
    // GitHub errors
    GITHUB_TOKEN_INVALID = "GITHUB_TOKEN_INVALID",
    GITHUB_API_ERROR = "GITHUB_API_ERROR",
    
    // System errors
    TIMEOUT = "TIMEOUT",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    CLEANUP_FAILED = "CLEANUP_FAILED",
}

export class ExecutionError extends Error {
    constructor(
        public code: ExecutionErrorCode,
        message: string,
        public context?: Record<string, unknown>,
        public cause?: Error
    ) {
        super(message);
        this.name = "ExecutionError";
    }
    
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            context: this.context,
            cause: this.cause?.message,
        };
    }
}

export function isExecutionError(error: unknown): error is ExecutionError {
    return error instanceof ExecutionError;
}

export function createExecutionError(
    code: ExecutionErrorCode,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error
): ExecutionError {
    return new ExecutionError(code, message, context, cause);
}
