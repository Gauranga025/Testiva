/**
 * Structured execution logging with consistent prefixes for production debugging.
 */

export type LogPrefix =
    | "[SYSTEM]"
    | "[AI]"
    | "[BROWSER]"
    | "[PLAYWRIGHT]"
    | "[NETWORK]"
    | "[ASSERT]"
    | "[ERROR]"
    | "[ENVIRONMENT]"
    | "[HEALTH]"
    | "[TUNNEL]"
    | "[DISCOVERY]"
    | "[CLEANUP]"
    | "[BROWSERBASE]"
    | "[CLOUDFLARE]"
    | "[FAILURE]"
    | "[SELF_HEAL]"
    | "[MEMORY]"
    | "[RECOVERY]"
    | "[ACCESSIBILITY]"
    | "[API]"
    | "[VISUAL]"
    | "[IMPACT]"
    | "[ANALYTICS]"
    | "[PERFORMANCE]"
    | "[OPTIMIZATION]";

export function formatLogLine(prefix: LogPrefix, message: string): string {
    return `${prefix} ${message}`;
}

export function safeStringify(value: unknown): string {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message;
    try {
        return JSON.stringify(value, (_key, v) => {
            if (typeof v === "bigint") return v.toString();
            return v;
        });
    } catch {
        return String(value);
    }
}

export function createExecutionLogger(logs: string[]) {
    const push = (prefix: LogPrefix, message: string) => {
        logs.push(formatLogLine(prefix, message));
    };

    const consoleShim = {
        log: (...args: unknown[]) =>
            push("[PLAYWRIGHT]", args.map(safeStringify).join(" ")),
        error: (...args: unknown[]) =>
            push("[ERROR]", args.map(safeStringify).join(" ")),
        warn: (...args: unknown[]) =>
            push("[PLAYWRIGHT]", `WARN: ${args.map(safeStringify).join(" ")}`),
        info: (...args: unknown[]) =>
            push("[PLAYWRIGHT]", args.map(safeStringify).join(" ")),
    };

    return { push, consoleShim };
}

export type ScriptConsole = {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
};

export type RecoveryHelper = (
    hints: {
        role?: string;
        name?: string;
        text?: string;
        label?: string;
        placeholder?: string;
    }
) => Promise<boolean>;

export function compilePlaywrightScript(scriptText: string): {
    runFn: (
        page: unknown,
        assert: (c: boolean, m?: string) => void,
        console: ScriptConsole,
        recover?: RecoveryHelper
    ) => Promise<void>;
} {
    const trimmed = scriptText.trim();
    if (!trimmed) {
        throw new Error("Script is empty");
    }

    const cleaned = trimmed
        .replace(/^```(?:javascript|js)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

    try {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
            ...args: string[]
        ) => (
            page: unknown,
            assert: (c: boolean, m?: string) => void,
            console: ScriptConsole,
            recover?: RecoveryHelper
        ) => Promise<void>;

        const runFn = new AsyncFunction("page", "assert", "console", "recover", cleaned);
        return { runFn };
    } catch (err) {
        throw new Error(
            `Script compilation failed: ${err instanceof Error ? err.message : String(err)}`
        );
    }
}
