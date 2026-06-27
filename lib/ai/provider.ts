/**
 * lib/ai/provider.ts
 *
 * Single-responsibility AI provider abstraction for Testiva.
 *
 * Responsibilities:
 *  - Gemini 2.5 Flash as primary (structured JSON + free-text)
 *  - GPT-4.1 Mini as automatic fallback
 *  - 3 retries with exponential backoff on Gemini
 *  - Consistent logging across every call
 *  - Two public surfaces:
 *      generateStructured()  → for JSON-schema responses (test-case generation)
 *      generateText()        → for free-text responses (Playwright script generation)
 *
 * API contracts of the two callers are NOT changed — callers receive the
 * same string/object shapes they did before.
 */

import { GoogleGenAI, Type } from "@google/genai";
import Groq from "groq-sdk";

// ─── Clients (instantiated once at module load) ───────────────────────────────

const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_MODEL  = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_RETRIES   = 3;
const BASE_DELAY_MS = 2000; // doubles each attempt: 2 s → 4 s → 8 s

// ─── Types ────────────────────────────────────────────────────────────────────

/** Which provider actually produced a response. Attached to every result so
 *  callers can log / surface it without digging into provider internals. */
export type AIProvider = "gemini" | "groq";

export interface AITextResult {
    text:     string;
    provider: AIProvider;
}

export interface AIStructuredResult<T = unknown> {
    data:     T;
    provider: AIProvider;
}

/**
 * Schema shape accepted by Gemini's responseSchema field.
 * Mirrors the SchemaUnion type from @google/genai without importing it directly,
 * so callers don't couple to the SDK's internal type names.
 */
export interface GeminiSchema {
    type:        Type;
    properties?: Record<string, GeminiSchema>;
    items?:      GeminiSchema;
    enum?:       string[];
    required?:   string[];
    nullable?:   boolean;
    description?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function log(
    level: "INFO" | "WARN" | "ERROR",
    provider: string,
    attempt: number | null,
    message: string,
    extra?: Record<string, unknown>,
) {
    const ts      = new Date().toISOString();
    const attempt_ = attempt !== null ? ` attempt=${attempt}` : "";
    const extra_   = extra ? " " + JSON.stringify(extra) : "";
    console.log(`[AI:${level}] ts=${ts} provider=${provider}${attempt_} ${message}${extra_}`);
}

async function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
    // attempt 1 → 2 s, attempt 2 → 4 s, attempt 3 → 8 s
    return BASE_DELAY_MS * Math.pow(2, attempt - 1);
}

function isRetryable(err: unknown): boolean {
    // Retry on rate-limit (429), server errors (5xx), and network failures.
    // Do NOT retry on 4xx auth/bad-request errors.
    const status = (err as { status?: number })?.status;
    if (status === undefined) return true;  // network / unknown → retry
    return status === 429 || status >= 500;
}

// ─── Gemini: free-text ────────────────────────────────────────────────────────

async function geminiText(prompt: string): Promise<string> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            log("INFO", "gemini", attempt, "generateText start", { model: GEMINI_MODEL });

            const response = await gemini.models.generateContent({
                model:    GEMINI_MODEL,
                contents: prompt,
            });

            const text = response.text ?? "";
            if (!text) throw new Error("Gemini returned empty text");

            log("INFO", "gemini", attempt, "generateText success", { chars: text.length });
            return text;

        } catch (err) {
            lastError = err;
            const retriable = isRetryable(err);
            log(
                retriable ? "WARN" : "ERROR",
                "gemini",
                attempt,
                `generateText failed — ${retriable ? "will retry" : "non-retriable"}`,
                { error: String(err) },
            );

            if (!retriable || attempt === MAX_RETRIES) break;
            await sleep(backoffMs(attempt));
        }
    }

    throw lastError;
}

// ─── Gemini: structured JSON ──────────────────────────────────────────────────

async function geminiStructured(
    prompt: string,
    schema: GeminiSchema,
): Promise<unknown> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            log("INFO", "gemini", attempt, "generateStructured start", { model: GEMINI_MODEL });

            const response = await gemini.models.generateContent({
                model:    GEMINI_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema:   schema,
                },
            });

            const raw = response.text ?? "";
            if (!raw) throw new Error("Gemini returned empty structured response");

            const parsed = JSON.parse(raw);
            log("INFO", "gemini", attempt, "generateStructured success");
            return parsed;

        } catch (err) {
            lastError = err;
            const retriable = isRetryable(err);
            log(
                retriable ? "WARN" : "ERROR",
                "gemini",
                attempt,
                `generateStructured failed — ${retriable ? "will retry" : "non-retriable"}`,
                { error: String(err) },
            );

            if (!retriable || attempt === MAX_RETRIES) break;
            await sleep(backoffMs(attempt));
        }
    }

    throw lastError;
}

// ─── OpenAI fallback: free-text ───────────────────────────────────────────────

async function groqText(prompt: string): Promise<string> {
    log("INFO", "groq", null, "generateText start (fallback)", {
        model: GROQ_MODEL,
    });

    try {
        const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const text = completion.choices[0]?.message?.content ?? "";

        if (!text) {
            throw new Error("Groq returned empty content");
        }

        log("INFO", "groq", null, "generateText success", {
            chars: text.length,
            finish_reason: completion.choices[0]?.finish_reason,
        });

        return text;
    } catch (err) {
        log("ERROR", "groq", null, "generateText failed", {
            error: String(err),
        });

        throw err;
    }
}

// ─── OpenAI fallback: structured JSON ────────────────────────────────────────
// GPT-4.1 Mini supports JSON mode but not Gemini's responseSchema format.
// We ask for JSON via the system prompt and parse the response ourselves.

async function groqStructured(prompt: string): Promise<unknown> {
    log("INFO", "groq", null, "generateStructured start (fallback)", {
        model: GROQ_MODEL,
    });

    try {
        const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,

            messages: [
                {
                    role: "system",
                    content:
                        "Return ONLY valid JSON matching the schema described by the user. No markdown. No explanation.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],

            response_format: {
                type: "json_object",
            },
        });

        const raw = completion.choices[0]?.message?.content ?? "";

        if (!raw) {
            throw new Error("Groq returned empty JSON");
        }

        const parsed = JSON.parse(raw);

        log("INFO", "groq", null, "generateStructured success");

        return parsed;
    } catch (err) {
        log("ERROR", "groq", null, "generateStructured failed", {
            error: String(err),
        });

        throw err;
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * generateText
 *
 * Produces a free-text completion (e.g. a Playwright script).
 * Tries Gemini 2.5 Flash with up to MAX_RETRIES + exponential backoff,
 * then falls back to GPT-4.1 Mini automatically.
 *
 * The returned string has the same shape as `response.text` did previously,
 * so callers need zero changes beyond switching to this function.
 */
export async function generateText(prompt: string): Promise<AITextResult> {
    try {
        const text = await geminiText(prompt);
        return { text, provider: "gemini" };
    } catch (geminiErr) {
        log("WARN", "gemini", null, "all retries exhausted — activating OpenAI fallback", {
            error: String(geminiErr),
        });

        try {
            const text = await groqText(prompt);
return {
    text,
    provider: "groq",
};
        } catch (groqErr) {
            log("ERROR", "groq", null, "fallback also failed", { error: String(groqErr) });
            // Re-throw the OpenAI error; callers already handle this shape.
            throw groqErr;
        }
    }
}

/**
 * generateStructured
 *
 * Produces a JSON-parsed object validated by a Gemini schema.
 * Falls back to GPT-4.1 Mini in JSON mode when Gemini is unavailable.
 *
 * `schema` is only used for Gemini; the OpenAI path uses a system prompt
 * instruction to produce the same JSON shape.
 *
 * @param prompt  Full prompt text sent to the model
 * @param schema  Gemini responseSchema object (ignored by OpenAI path)
 */
export async function generateStructured<T = unknown>(
    prompt:    string,
    schema:    GeminiSchema,
): Promise<AIStructuredResult<T>> {
    try {
        const data = await geminiStructured(prompt, schema) as T;
        return { data, provider: "gemini" };
    } catch (geminiErr) {
        log("WARN", "gemini", null, "all retries exhausted — activating Groq fallback", {
            error: String(geminiErr),
        });

        try {
            const data = await groqStructured(prompt) as T;
            return { data, provider: "groq" };
        } catch (groqErr) {
    log("ERROR", "groq", null, "fallback also failed", {
        error: String(groqErr),
    });
    throw groqErr;
}
    }
}

// Re-export Type so routes can build schemas without importing @google/genai directly.
export { Type };