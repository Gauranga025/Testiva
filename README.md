<div align="center">

# Testiva

**Autonomous AI-Powered Software Testing Platform**

*Stop writing tests. Start shipping with confidence.*

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Browserbase](https://img.shields.io/badge/Browserbase-Cloud_Browser-orange?style=flat-square)](https://www.browserbase.com/)
[![Playwright](https://img.shields.io/badge/Playwright-1.60-green?style=flat-square&logo=playwright)](https://playwright.dev/)
[![AI Powered](https://img.shields.io/badge/AI-Gemini_2.5_Flash_%7C_Llama_3.3-purple?style=flat-square)](https://deepmind.google/technologies/gemini/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)](https://github.com/Gauranga025/Testiva/actions)

</div>

---

![Testiva Banner](docs/banner.png)

---

## What Is Testiva?

Testiva is an autonomous AI-powered end-to-end testing platform that connects to your GitHub repository, understands your application's architecture, discovers your live UI in real-time, generates Playwright scripts, executes them in a cloud browser (Browserbase), and delivers a full failure analysis — all without you writing a single line of test code.

### The Problem with Existing Approaches

**Traditional Playwright** requires you to write, maintain, and fix hundreds of selectors. When your UI changes, your tests break. Every selector is a maintenance liability.

**Naive AI testing** (throwing your codebase at an LLM and asking it to generate tests) fails because LLMs hallucinate selectors, invent routes that don't exist, and generate scripts against a codebase they can't actually see running.

Testiva solves both problems with two systems that don't exist anywhere else:

- **Repository Intelligence** — static analysis of your `package.json`, file structure, authentication provider, ORM, routing type, API patterns, and architecture, assembled into a structured context the AI actually understands.
- **Application Intelligence** — a live Browserbase session that visits your running app, scans every nav item, button, form, dialog, dropdown, route, accessibility node, and heading, and returns a `DomSummary` the AI can use to generate selectors that are guaranteed to exist.

The result is a system where the AI generates Playwright scripts grounded in what your application *actually* is, not what it imagines it to be.

---

## Key Features

### AI Intelligence

**Repository Intelligence**
Testiva parses your `package.json` and directory tree to detect framework, version, authentication provider, database, ORM, routing type (App Router vs Pages Router), middleware, API architecture, business modules, and architecture pattern (MVC, clean-architecture, monolith). This structured context replaces raw codebase prompting.

**Application Intelligence (UI Discovery)**
Before generating any script, Testiva opens a live Browserbase session against your running application and performs DOM scanning: navigation items, all buttons with their roles and aria-labels, every form with its fields and submit targets, dialogs, tabs, dropdowns, headings, routes, loading states, error states, and login page detection. Everything is stored in a `DomSummary` and used verbatim in prompts.

**AI Context Engine**
The `AIContextEngine` merges environment context, repository intelligence, UI discovery, the execution goal, and the specific test case into a single structured `AIContext` object. This is serialized using a deterministic format and injected into every AI call — eliminating prompt drift.

**Intelligent Test Planning**
The test generation API accepts your repository information, calls the AI with your `RepositoryIntelligence` as context, and returns typed test cases that include `title`, `description`, `type`, `priority`, `targetRoute`, `targetFiles`, and `expectedResult`. No guesswork.

**AI Playwright Generation**
The prompt builder assembles the full `AIContext` and asks the AI to write a Playwright script body scoped to a specific test case. The script is compiled via `new Function()` before execution to catch syntax errors early.

**Multi-Model AI with Automatic Fallback**
Testiva uses Gemini 2.5 Flash as its primary model for both structured JSON and free-text generation. If Gemini fails after 3 retries with exponential backoff (2s → 4s → 8s), it automatically falls back to Llama 3.3 70B Versatile via Groq. Every response is tagged with the provider that produced it.

**Repository Memory**
The `RepositoryMemoryService` persists execution knowledge across runs: successful selectors with confidence scores, failed selectors to avoid, repaired selectors, login flows, navigation patterns, route metadata, form selectors, and working scripts. Memory is keyed by repository hash and invalidated intelligently when the DOM changes.

---

### Autonomous Testing

**Browserbase Cloud Execution**
All test execution happens in Browserbase cloud browsers connected via CDP (Chrome DevTools Protocol). Testiva creates a session with `recordSession: true` and `logSession: true`, connects Playwright over the CDP URL, executes the compiled script, and stores the session URL and recording URL. Sessions are cleaned up via a `CleanupManager` that handles prioritized teardown.

**Localhost Testing via Cloudflare Tunnel**
Testing localhost is normally impossible from a cloud browser. Testiva solves this automatically: when it detects a `localhost` or `127.0.0.1` base URL, it spawns `cloudflared tunnel --url <localUrl>` as a child process, parses the `trycloudflare.com` URL from stdout, verifies the tunnel is reachable with a HEAD request, rewrites the generated Playwright script to use the tunnel URL, and cleans up the tunnel after execution.

**Production Deployment Support**
For deployed applications, Testiva skips the tunnel stage entirely and targets your production or staging URL directly.

**Environment Intelligence**
The environment layer detects whether you're targeting a deployed app or localhost, normalizes the base URL, builds full route URLs from relative paths, and threads the effective URL through the entire pipeline. The test case's `targetRoute` is always resolved against the correct base.

**Intelligent Self-Healing**
When a test fails with a UI-related error (broken selector, navigation failure, playwright error), the `SelfHealingService` checks the failure category and, if retryable, generates a repaired script and re-executes it. After a successful repair, the working selector is recorded in Repository Memory. Failed selectors are also recorded to prevent future use.

**AI Failure Analysis**
The `FailureAnalysisService` collects a complete `FailureContext` on every failure: browser state, visual state (screenshot, recording URL), console logs (info/warn/error/exceptions), network logs (failed requests, HTTP errors, redirects, API responses with timing), Playwright context (failed step with step number, action, selector, expected, actual, error, line), and the full execution timeline. From this, it produces a `FailureReport` with root cause, confidence score (0–100), severity, category, affected feature, broken selector, suggested selector, suggested fix, retry recommendation, related repository files, related routes, and related APIs.

---

### QA Features

**Coverage Analysis**
The `AnalyticsEngine` tracks route coverage, API coverage, accessibility score, and visual regression score across every execution. The Repository Memory service maintains a `CoverageHistoryEntry` time series to show coverage trends.

**API Testing**
The `APIDiscoveryService` discovers API endpoints from three sources: repository intelligence (detecting `app/api/` route handlers), UI discovery (network requests observed during DOM scanning), and static analysis of business module paths. The `APIExecutionService` then runs authenticated or public HTTP requests against each endpoint.

**Accessibility Auditing**
The `AccessibilityAuditService` checks WCAG 2.1 AA compliance using the live `DomSummary`: heading hierarchy correctness, form label coverage, button accessibility, aria-label presence, and screen reader compatibility. Reports include a WCAG score, accessibility score, screen reader compatibility score, and a list of `AccessibilityViolation` objects with selector, impact, WCAG level, and help URL.

**Visual Regression Testing**
The `VisualRegressionService` captures baseline screenshots via `page.screenshot()` and compares new screenshots pixel-by-pixel. Each comparison records difference percentage, pass/fail against a configurable threshold, and viewport metadata. Reports include an overall score, per-comparison results, and AI-generated recommendations.

**Commit Impact Analysis**
The `CommitImpactService` accepts a list of `GitChange` objects (file path + change type), maps changed files to affected components, routes, APIs, and business modules via Repository Intelligence, calculates a priority score, and returns a `TestImpact` with the set of affected test suites and a runtime savings estimate. This prevents running the full test suite on every commit.

---

### Engineering

**Structured Logging**
Every log line is prefixed with a typed `LogPrefix`: `[SYSTEM]`, `[AI]`, `[BROWSER]`, `[PLAYWRIGHT]`, `[NETWORK]`, `[ASSERT]`, `[ERROR]`, `[ENVIRONMENT]`, `[HEALTH]`, `[TUNNEL]`, `[DISCOVERY]`, `[CLEANUP]`, `[BROWSERBASE]`, `[CLOUDFLARE]`, `[FAILURE]`, `[SELF_HEAL]`, `[MEMORY]`, `[RECOVERY]`, `[ACCESSIBILITY]`, `[API]`, `[VISUAL]`, `[IMPACT]`, `[ANALYTICS]`, `[PERFORMANCE]`. Every execution returns its full structured log array.

**Production Hardening**
Typed error codes via `ExecutionErrorCode`, `AbortController`-based fetch timeouts, CDP connection timeouts, script execution timeouts (`DEFAULT_EXECUTION_TIMEOUT_MS = 120,000`), DOM recovery via page reload on first failure, and exponential backoff on AI provider calls.

**Cleanup Manager**
The `CleanupManager` maintains a priority-ordered list of resources (tunnels at priority 100, Browserbase sessions at 90, browsers at 80, custom at 50) and ensures they are released in order even when errors occur during execution.

**Execution State Machine**
The `ExecutionStateMachine` enforces valid state transitions across the pipeline: `idle → initializing → health_checks → environment_discovery → tunnel_creation → repository_analysis → ui_discovery → dom_summary → playwright_generation → execution → assertions → cleanup → completed`. Invalid transitions throw typed errors.

**Health Checks**
Before every execution, Testiva runs a preflight battery: database connectivity (SQL ping), Browserbase session creation, target URL reachability, GitHub token validity (if needed), AI provider API key presence, and `cloudflared` availability (if localhost). Each check is timed and returns a `HealthCheckItem` with status, message, and duration.

**Diagnostics**
The `ExecutionDiagnostics` class records timestamped metrics (performance, resource, network, system) and events across the execution lifecycle. These are returned with the execution result for debugging.

**Resource Lifecycle**
Browserbase sessions have full lifecycle management via `BrowserbaseLifecycleManager`. Cloudflare tunnels have full lifecycle management via `CloudflareLifecycleManager`. Both are registered with the `CleanupManager` and released in order.

**UI Discovery Cache**
`DomSummary` results are cached per repository, base URL, and branch. The cache key is `repoId:normalizedUrl:branch`. On subsequent runs, if the cache key matches, the UI Discovery and DOM Summary stages are skipped entirely — saving one full Browserbase session per execution.

**Repository Intelligence Cache**
Analyzed `RepositoryIntelligence` is persisted to the `repositories` database table (`repository_intelligence_cache` column as `jsonb`). It is invalidated when the repository hash changes (derived from `package.json` + file tree + `.env` content).

---

## Architecture

```
GitHub Repository
        │
        ▼
┌─────────────────────────────────┐
│      Repository Intelligence    │ ← package.json · file tree · env vars
│   Framework · Auth · DB · ORM   │   routing · middleware · API · modules
│   architecture pattern          │   cached in PostgreSQL (jsonb)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      Environment Intelligence   │ ← localhost vs deployed detection
│   Cloudflare Tunnel (if local)  │   URL normalization · tunnel lifecycle
│   URL rewriting for scripts     │   verifyTunnelReachable() HEAD check
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Application Intelligence    │ ← live Browserbase session
│   UI Discovery · DOM Summary    │   nav · buttons · forms · routes
│   accessibility · login detect  │   cached per repo + URL + branch
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│        AI Context Engine        │ ← merges all above + test case
│   AIContext → serialized prompt │   environment · repository · uiDiscovery
│   Memory-Aware Prompt Builder   │   executionGoal · testCase · instructions
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     AI Playwright Generation    │ ← Gemini 2.5 Flash (primary)
│   Script compilation check      │   Llama 3.3 70B via Groq (fallback)
│   3 retries + exponential back  │   exponential backoff · typed result
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    Browserbase Cloud Execution  │ ← CDP over chromium.connectOverCDP()
│   recordSession · logSession    │   script execution timeout 120s
│   assert() helper · console     │   DOM reload recovery on first error
└────────────────┬────────────────┘
                 │
          ┌──────┴──────┐
          │   success?  │
     ┌────┘             └────┐
     ▼ yes                   ▼ no
┌──────────┐      ┌─────────────────────┐
│Analytics │      │   AI Failure        │
│Coverage  │      │   Analysis          │
│Memory    │      │ FailureContext →     │
│update    │      │ FailureReport        │
└──────────┘      │ rootCause · severity│
                  │ brokenSelector      │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   Self-Healing      │
                  │  repaired script?   │
                  │  retry execution    │
                  │  record in Memory   │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  Repository Memory  │
                  │  selector history   │
                  │  login flows        │
                  │  nav patterns       │
                  │  success rates      │
                  └─────────────────────┘
```

---

## Execution Pipeline

Every test execution passes through a typed state machine with 13 stages. Each stage is tracked in the UI as a `PipelineStage` with status `pending | active | completed | failed | skipped`.

### Stage 1: Health Checks
`health_checks` — Testiva runs a preflight battery: SQL ping to verify database connectivity, Browserbase SDK connection test, target URL reachability (HEAD with 12s timeout), GitHub token validation, AI provider key presence check, and `cloudflared` binary check (if localhost). Any hard failure aborts the pipeline.

### Stage 2: Environment Discovery
`environment_discovery` — The base URL is normalized (`normalizeBaseUrl()`). The environment type is resolved: if it contains `localhost` or `127.0.0.1`, it's `"localhost"`; otherwise `"deployed"`. For deployed environments, the effective URL equals the base URL and the pipeline skips tunnel creation.

### Stage 3: Tunnel Creation
`tunnel_creation` — Only runs for localhost targets. Testiva spawns `cloudflared tunnel --url <localUrl>`, parses the `trycloudflare.com` URL from stdout/stderr using a regex pattern, and verifies the tunnel is reachable with a HEAD request. The tunnel handle is registered with the `CleanupManager`. This stage is marked `skipped` for deployed targets.

### Stage 4: Repository Analysis
`repository_analysis` — If a cached `RepositoryIntelligence` exists in the database and the repository hash hasn't changed, it's returned from cache. Otherwise, `RepositoryIntelligenceService.analyzeRepository()` is called with the fetched `package.json`, file list, code samples, and `.env` content. The result is stored in the database.

### Stage 5: UI Discovery
`ui_discovery` — If a valid `DiscoveryCacheEntry` exists for this repo + URL + branch combination, it's returned from cache. Otherwise, a new Browserbase session is created (without recording), Playwright navigates to the target URL, and `scanPageUi()` extracts the full DOM summary. The cache entry is persisted to the database.

### Stage 6: DOM Summary
`dom_summary` — The `DomSummary` is finalized and serialized via `summarizeDomForPrompt()` into a compact JSON representation capped at reasonable slice sizes (30 nav items, 40 buttons, 10 forms, etc.) to avoid prompt token overflow.

### Stage 7: Playwright Generation
`playwright_generation` — The `AIContextEngine` builds the full `AIContext`. The `PromptBuilders.buildPlaywrightPrompt()` method assembles the final prompt, including any Repository Memory hits (login flows, navigation patterns, known selectors). The prompt is sent to `generateText()`. The returned script body is wrapped and compiled via `new Function()` to catch syntax errors before execution.

### Stage 8: Execution
`execution` — `runBrowserbaseScript()` creates a new Browserbase session (with `recordSession: true`), connects Playwright over CDP, and runs the compiled script. On first failure, the page is reloaded and the script is retried once before reporting failure. Session URLs and recording URLs are captured.

### Stage 9: Assertions
`assertions` — The `assert(condition, message)` helper is available inside every generated script. Failed assertions throw errors that are caught by the execution runner. A final `[ASSERT] All assertions passed` log line confirms success.

### Stage 10–12: Failure Analysis & Self-Healing
On failure, `FailureAnalysisService.collectExecutionSnapshot()` collects browser state, visual state, console logs, and network logs. `analyzeFailure()` produces a `FailureReport`. If the category is retryable (`ui_change`, `navigation`, `playwright`), `SelfHealingService.attemptSelfHealing()` generates a repaired script and executes it. Results are recorded in Repository Memory.

### Stage 13: Cleanup
`cleanup` — The `CleanupManager.cleanupAll()` releases resources in priority order: tunnel → Browserbase session → browser → custom. All cleanups run even if individual ones fail.

---

## Repository Intelligence

Repository Intelligence is Testiva's static analysis layer. It answers the question: *"What kind of application am I testing?"*

### What It Extracts

**From `package.json`:**
- Framework name, version, and type (frontend / fullstack / backend)
- All dependencies categorized by role: authentication, ORM, database, validation, forms, styling, components
- Package manager detection (npm / yarn / pnpm / bun)

**From directory structure:**
- Routing type: `app-router` (detected via `app/**/page.*`) or `pages-router` (via `pages/**/index.*`)
- Middleware presence (any `middleware.*` file)
- API architecture: `route-handlers` (via `app/api/**/route.*`) or `api-routes` (via `pages/api/`)
- Business modules: `lib`, `components`, `hooks`, `services`, `utils`, `contexts`, `store`
- Architecture pattern: `clean-architecture`, `mvc`, or `monolith` inferred from module combinations

**From code files:**
- Authentication provider (Clerk, NextAuth, JWT)
- Form library (react-hook-form, formik)
- Validation library (zod, yup)
- Database type (PostgreSQL, MySQL, SQLite)
- ORM (Prisma, Drizzle)

**From environment files:**
- Environment variable names with inferred descriptions and required status

### Why This Improves AI Quality

Without Repository Intelligence, the AI must guess that your app uses Clerk for auth, App Router for routing, and Drizzle for database access. With it, the AI knows exactly which auth provider to expect login redirects from, which route patterns to follow, and how forms are validated — without reading a single line of your source code.

The intelligence is hashed and cached. When you change your `package.json` or add a new route, the hash changes and the cache is invalidated automatically.

---

## Application Intelligence

Application Intelligence is Testiva's live UI analysis layer. It answers: *"What does the application actually look like right now?"*

### What It Discovers

Testiva opens a Browserbase session, navigates to your application, and extracts:

| Category | What's Captured |
|---|---|
| Navigation | Text, href, role, visibility for every nav/sidebar element |
| Buttons | Text, role, aria-label, disabled state, data-testid |
| Forms | Action, method, all fields (name, type, label, placeholder, required, isEmail, isPassword), submit buttons |
| Routes | All `<a href>` values found in navigation, formatted as route memories |
| Headings | Level (h1–h6), text, visibility |
| Dialogs | Role, title, visibility |
| Tabs | Text, selected state, role |
| Dropdowns | Text, selected value, available options |
| Accessibility | aria-label, aria-describedby, aria-live, aria-hidden for interactive elements |
| Loading States | Spinner / skeleton / progress / text detection |
| Error States | Inline / banner / modal error detection |
| Login Detection | Email field, password field, and submit button identification |

### Caching

UI Discovery results are cached as `DiscoveryCacheEntry` in the `repositories` table (`ui_discovery_cache` column, `jsonb`). The cache key is `repoId:normalizedUrl:branch`. On cache hit, the UI Discovery and DOM Summary stages are skipped, saving approximately 15–30 seconds per execution.

---

## AI Context Engine

The `AIContextEngine` is the bridge between all intelligence sources and the AI models. It eliminates ad-hoc prompt construction by assembling a single `AIContext` object from five structured inputs.

### AIContext Structure

```typescript
type AIContext = {
  environment: {
    type: "deployed" | "localhost";
    baseUrl: string;
    effectiveUrl: string;  // tunnel URL if localhost
    isLocalhost: boolean;
  };
  repository: RepositoryIntelligence; // framework, auth, DB, ORM, routing...
  uiDiscovery: DomSummary;            // all nav, buttons, forms, routes...
  executionGoal: {
    type: "test_execution" | "test_generation" | "failure_analysis" | "coverage_analysis" | "repair";
    targetRoute: string;
    expectedBehavior: string;
    priority: "critical" | "high" | "medium" | "low";
  };
  testCase: {
    id: number;
    title: string;
    description: string;
    targetRoute: string;
    expectedResult: string;
    targetFiles: string[];
    repoOwner: string;
    repoName: string;
    branch: string;
  };
  globalInstructions?: string;  // per-repo project instructions
  runtimeInstructions?: string; // per-run overrides
  generatedAt: string;
};
```

### Serialization

`serializeForAI()` produces a structured markdown document with labeled sections (`## ENVIRONMENT`, `## REPOSITORY INTELLIGENCE`, `## UI DISCOVERY`, `## EXECUTION GOAL`, `## TEST CASE`, `## GLOBAL PROJECT INSTRUCTIONS`, `## RUNTIME INSTRUCTIONS`). `buildCompactJSON()` produces a token-efficient JSON variant for contexts where brevity matters.

---

## Browserbase Integration

Testiva uses Browserbase as its cloud browser infrastructure. All test execution and UI discovery happens in Browserbase sessions — never on the server running the Next.js application.

### Session Lifecycle

**Creation:** `bb.sessions.create({ projectId, timeout, browserSettings: { recordSession: true, logSession: true } })`

**Connection:** `chromium.connectOverCDP(session.connectUrl)` with a 30s timeout. Creates a standard Playwright `Browser` and `Page` object.

**Execution:** The compiled test script runs with access to `page`, `assert()`, and a `console` shim that routes logs to the structured log array.

**Recording:** Every execution session is recorded. The recording URL follows the pattern `https://browserbase.com/sessions/{sessionId}`. Session URLs and recording URLs are stored in the `test_cases` table.

**Cleanup:** `browser.close()` followed by `bb.sessions.update(sessionId, { status: "REQUEST_RELEASE" })`. Both are registered with the `CleanupManager` to ensure release even on error.

### UI Discovery Sessions

UI Discovery runs in a separate Browserbase session without recording (`recordSession: false`) to reduce noise and cost. The session is always released after discovery completes.

---

## Localhost Testing

Testing a locally running application from a cloud browser is a fundamentally hard problem. Testiva solves it with an integrated Cloudflare Tunnel pipeline.

### Why Localhost Is Difficult

Cloud browsers (like Browserbase) run in data centers. They cannot reach `localhost:3000` on your laptop. Naive solutions (ngrok manual setup, VPN, SSH tunnels) require configuration outside the test run and are fragile.

### How Testiva Solves It

1. Detects `localhost` or `127.0.0.1` in the base URL
2. Verifies `cloudflared` is installed and on PATH (`cloudflared --version`)
3. Spawns `cloudflared tunnel --url http://localhost:3000` as a child process
4. Parses the `trycloudflare.com` public URL from stdout/stderr using a regex (45s timeout)
5. Sends a HEAD request to the public URL to verify it's reachable (15s timeout)
6. Rewrites the generated Playwright script to replace all local URL references with the tunnel URL using `rewriteScriptForEnvironment()`
7. Registers the tunnel's `close()` function with the `CleanupManager` at priority 100
8. After execution, kills the `cloudflared` process and releases the tunnel

The entire tunnel lifecycle is transparent — you just set your target domain to `http://localhost:3000` in the repository settings.

### Security

Cloudflare Tunnels use TLS and are ephemeral — they're created and destroyed per execution. The `trycloudflare.com` domain is only active during the test run.

---

## AI Failure Analysis

When a test fails, Testiva does not simply report "test failed." It runs a complete post-mortem.

### FailureContext

The `FailureContext` captures everything that was true at the moment of failure:

```typescript
interface FailureContext {
  aiContext: AIContext;                    // full execution context
  repositoryIntelligence: RepositoryIntelligence;
  domSummary: DomSummary | null;          // what was on the page
  accessibilityTree: AccessibilityNode[];
  screenshot: string;                     // base64
  browserbaseRecording: string | null;    // recording URL
  browserbaseSessionUrl: string | null;
  networkLogs: {
    failedRequests: NetworkRequest[];
    httpErrors: NetworkRequest[];
    redirects: NetworkRequest[];
    apiResponses: NetworkRequest[];       // with timing waterfall
    networkTiming: NetworkTiming;
  };
  consoleLogs: {
    logs: ConsoleLog[];
    warnings: ConsoleLog[];
    errors: ConsoleLog[];
    unhandledExceptions: ConsoleLog[];
  };
  failedStep: {
    stepNumber: number;
    action: string;
    selector: string;
    expected: string;
    actual: string;
    error: string;
    line: number;
  };
  generatedScript: string;
  timeline: ExecutionTimeline;
  browserState: BrowserState;
  playwrightContext: PlaywrightContext;
}
```

### FailureReport

From the `FailureContext`, the service produces:

| Field | Description |
|---|---|
| `rootCause` | AI-generated root cause explanation |
| `confidenceScore` | 0–100 confidence in the root cause |
| `severity` | `critical` / `high` / `medium` / `low` |
| `category` | `ui_change` / `authentication` / `navigation` / `api_failure` / `network` / `environment` / `playwright` / `ai_generation` / `repository` / `infrastructure` |
| `affectedFeature` | Human-readable feature description |
| `brokenSelector` | The CSS selector that failed |
| `suggestedSelector` | AI-suggested replacement selector |
| `suggestedFix` | Step-by-step fix recommendation |
| `retryRecommended` | Whether self-healing should attempt a retry |
| `relatedRepositoryFiles` | Source files likely responsible |
| `relatedRoutes` | Routes involved in the failure |
| `relatedApis` | APIs that may have contributed |
| `executiveSummary` | Non-technical summary for stakeholders |

### Failure Categories and Retry Logic

| Category | Retryable | Reason |
|---|---|---|
| `ui_change` | ✅ | Selector changed, AI can generate a new one |
| `navigation` | ✅ | Route redirect changed, recoverable |
| `playwright` | ✅ | Script error, may be fixable |
| `authentication` | ❌ | Auth misconfiguration, must be fixed manually |
| `api_failure` | ❌ | Backend issue, retrying won't help |
| `infrastructure` | ❌ | Environment issue, requires investigation |

### Self-Healing Flow

1. `FailureAnalysisService.analyzeFailure()` produces `FailureReport`
2. `SelfHealingService.isRetryable()` checks `retryRecommended` and `category`
3. `generateRepairedScript()` builds a repair prompt with `buildRepairPrompt()` and calls the AI
4. The repaired script is compiled and executed in a new Browserbase session
5. On success: the working selector is recorded in Repository Memory with `recordRepairedSelector()`
6. On failure: the broken selector is recorded with `recordFailedSelector()` to prevent future use

---

## Folder Structure

```
Testiva/
├── app/                          # Next.js App Router
│   ├── api/                      # API route handlers
│   │   ├── generate-test-cases/  # POST: AI test case generation
│   │   ├── test-cases/
│   │   │   ├── route.tsx         # GET/POST: test case CRUD
│   │   │   ├── run/route.ts      # POST: trigger execution pipeline
│   │   │   └── settings/route.ts # PATCH: per-test settings
│   │   ├── github/
│   │   │   ├── route.ts          # GitHub OAuth initiation
│   │   │   ├── callback/route.ts # OAuth callback + token exchange
│   │   │   ├── repos/route.ts    # GET: list user repositories
│   │   │   └── token/route.ts    # GET: retrieve stored token
│   │   ├── user-repo/
│   │   │   ├── route.ts          # GET/POST: user repository management
│   │   │   └── settings/route.ts # PATCH: repo target URL + instructions
│   │   ├── users/route.tsx       # GET/POST: user management
│   │   ├── checkout/stripe/      # POST: Stripe checkout session
│   │   ├── webhooks/stripe/      # POST: Stripe webhook handler
│   │   └── feedback/route.ts     # POST: user feedback
│   ├── workspace/                # Main application workspace (protected)
│   ├── sign-in/                  # Clerk sign-in page
│   ├── sign-up/                  # Clerk sign-up page
│   ├── pricing/                  # Pricing page
│   ├── support/                  # Support page
│   ├── feedback/                 # Feedback page
│   ├── layout.tsx                # Root layout with ClerkProvider
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
│
├── components/
│   ├── custom/                   # Application-specific components
│   │   ├── WorkspaceBody.tsx     # Main workspace container
│   │   ├── WorkspaceHeader.tsx   # Workspace header
│   │   ├── UserRepoList.tsx      # Repository selector
│   │   ├── TestCaseList.tsx      # Test case list view
│   │   ├── TestExecutionModal.tsx # Live execution viewer with pipeline stages
│   │   ├── TestCaseSettingDialog.tsx # Per-test configuration
│   │   ├── RepoDialog.tsx        # Repository connection dialog
│   │   ├── RepoSettings.tsx      # Repository target URL + instructions
│   │   └── EmptyWorkspace.tsx    # Empty state
│   ├── landing/                  # Landing page components
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── DashboardPreview.tsx
│   │   ├── Stats.tsx
│   │   ├── Testimonials.tsx
│   │   ├── CTA.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── ui/                       # shadcn/ui primitives
│
├── lib/
│   ├── ai/
│   │   ├── provider.ts           # Gemini 2.5 Flash + Groq fallback
│   │   ├── ai-context.ts         # AIContext type + AIContextEngine
│   │   ├── repository-intelligence.ts # RepositoryIntelligenceService
│   │   └── prompt-builders.ts    # Memory-aware prompt construction
│   ├── execution/
│   │   ├── browserbase-runner.ts # Core script execution via CDP
│   │   ├── browserbase-lifecycle.ts # Session lifecycle manager
│   │   ├── browser-session.ts    # Page creation + listeners
│   │   ├── cloudflare-lifecycle.ts # Tunnel lifecycle manager
│   │   ├── tunnel.ts             # Cloudflare tunnel creation + verification
│   │   ├── environment.ts        # Environment discovery + URL mapping
│   │   ├── environment-utils.ts  # URL normalization + type detection
│   │   ├── ui-discovery.ts       # Live DOM scanning via Browserbase
│   │   ├── discovery-cache.ts    # DomSummary cache utilities
│   │   ├── pipeline-stages.ts    # Pipeline stage definitions + transitions
│   │   ├── state-machine.ts      # ExecutionStateMachine
│   │   ├── failure-analysis.ts   # FailureContext + FailureReport
│   │   ├── self-healing.ts       # Script repair + retry
│   │   ├── repository-memory.ts  # Cross-execution knowledge persistence
│   │   ├── cleanup-manager.ts    # Priority-based resource cleanup
│   │   ├── health-checks.ts      # Preflight battery
│   │   ├── health-manager.ts     # Health state management
│   │   ├── retry-policy.ts       # Configurable retry with backoff
│   │   ├── timeout-manager.ts    # Centralized timeout configuration
│   │   ├── diagnostics.ts        # Execution metrics + events
│   │   ├── logger.ts             # Structured log formatting
│   │   ├── errors.ts             # Typed error codes
│   │   ├── local-server-verifier.ts # Localhost reachability check
│   │   ├── url-validator.ts      # URL normalization + validation
│   │   └── types.ts              # Shared execution types
│   ├── analytics/
│   │   └── analytics-engine.ts   # Execution metrics + analytics reports
│   ├── accessibility/
│   │   └── accessibility-audit.ts # WCAG 2.1 AA audit service
│   ├── api-testing/
│   │   ├── api-discovery.ts      # Multi-source API endpoint discovery
│   │   └── api-execution.ts      # API test execution
│   ├── visual-regression/
│   │   └── visual-regression.ts  # Screenshot baseline + comparison
│   ├── git-impact/
│   │   └── commit-impact.ts      # Commit → affected test mapping
│   ├── stripe.ts                 # Stripe client
│   └── utils.ts                  # Utility functions
│
├── db/
│   ├── index.ts                  # Drizzle + Neon connection
│   └── schema.ts                 # users · repositories · test_cases tables
│
├── context/
│   └── UserDetailContext.tsx     # Global user state
│
├── drizzle/                      # Migration files
├── middleware.ts                 # Clerk auth middleware (protects /workspace)
├── proxy.ts                      # Clerk proxy middleware
├── next.config.ts                # Next.js configuration
├── drizzle.config.ts             # Drizzle Kit configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies + scripts
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js | 15 | Full-stack React framework with App Router |
| **Language** | TypeScript | 5.8 | End-to-end type safety |
| **Styling** | Tailwind CSS | 4.1 | Utility-first CSS |
| **UI Components** | Radix UI + shadcn/ui | — | Accessible component primitives |
| **Animation** | Framer Motion | 12.40 | UI transitions |
| **Authentication** | Clerk | 6.39 | OAuth, JWT, middleware protection |
| **Database** | Neon PostgreSQL | serverless | Serverless Postgres via `@neondatabase/serverless` |
| **ORM** | Drizzle | 0.44 | Type-safe SQL with migration support |
| **Primary AI** | Google Gemini 2.5 Flash | — | Structured JSON + free-text generation |
| **Fallback AI** | Llama 3.3 70B (Groq) | — | Automatic fallback with JSON mode |
| **Browser Infra** | Browserbase | 2.12 | Cloud browser sessions with recording |
| **Browser Automation** | Playwright Core | 1.60 | CDP-based page control |
| **Tunnel** | Cloudflare (`cloudflared`) | — | Localhost → public HTTPS |
| **Payments** | Stripe | 18.1 | Subscription and credits |
| **Email** | Resend | 6.16 | Transactional email |
| **HTTP Client** | Axios | 1.18 | API requests |
| **Deployment** | Vercel | — | Edge-optimized Next.js deployment |

---

## Screenshots

**Dashboard**
![Dashboard](docs/screenshots/dashboard.png)

**Repository Connection**
![Repository](docs/screenshots/repository.png)

**Test Execution Pipeline**
![Execution](docs/screenshots/execution.png)

**Analytics**
![Analytics](docs/screenshots/analytics.png)

**AI Failure Analysis**
![Failure Analysis](docs/screenshots/failure-analysis.png)

**Coverage Report**
![Coverage](docs/screenshots/coverage.png)

**Browserbase Recording**
![Recording](docs/screenshots/browserbase-recording.png)

---

## Installation

### Requirements

- Node.js 18+
- `cloudflared` CLI ([download](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)) — required for localhost testing
- A Browserbase account ([browserbase.com](https://www.browserbase.com/))
- A Neon PostgreSQL database ([neon.tech](https://neon.tech/))
- A Clerk account ([clerk.com](https://clerk.com/))
- A Google AI (Gemini) API key
- A Groq API key

### Clone and Install

```bash
git clone https://github.com/Gauranga025/Testiva.git
cd Testiva
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@host/database

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# AI Providers
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...

# Browserbase
BROWSERBASE_API_KEY=bb_live_...
BROWSERBASE_PROJECT_ID=...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (optional)
RESEND_API_KEY=re_...
```

### Database Setup

```bash
# Generate migrations from schema
npm run db:generate

# Push schema to database
npm run db:push

# Optional: open Drizzle Studio
npm run db:studio
```

### Development

```bash
npm run dev
```

The application runs at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run start
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk public key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | Clerk sign-in route (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | Clerk sign-up route (`/sign-up`) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `GROQ_API_KEY` | ✅ | Groq API key for Llama fallback |
| `BROWSERBASE_API_KEY` | ✅ | Browserbase API key |
| `BROWSERBASE_PROJECT_ID` | ✅ | Browserbase project ID |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth app client secret |
| `GITHUB_REDIRECT_URI` | ✅ | GitHub OAuth callback URL |
| `STRIPE_SECRET_KEY` | ❌ | Stripe secret key (for billing) |
| `STRIPE_WEBHOOK_SECRET` | ❌ | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ❌ | Stripe public key |
| `RESEND_API_KEY` | ❌ | Resend email API key |

---

## Running Locally

### Localhost Application Testing

If you want to test an application running on your local machine:

1. Ensure `cloudflared` is installed and available on your PATH
2. Start your local application (e.g., `npm run dev` in your project)
3. In Testiva, set the repository's **Target Domain** to `http://localhost:3000` (or your port)
4. When you run a test, Testiva will automatically create a Cloudflare Tunnel and route Browserbase through it

> **Tip:** You do not need to configure the tunnel manually. Testiva handles the full lifecycle — creation, verification, URL rewriting, and teardown.

### Deployed Application Testing

1. Deploy your application to any hosting provider
2. Set the repository's **Target Domain** to your deployed URL (e.g., `https://myapp.vercel.app`)
3. Run tests normally — no tunnel is created

### Repository Connection

1. Sign in with your Clerk account
2. Click **Connect Repository** and complete GitHub OAuth
3. Select the repository you want to test
4. Set the **Target Domain** (your app's URL)
5. Optionally add **Global Instructions** (project-specific context for the AI)

### Running a Test

1. Click **Generate Test Cases** on your repository
2. Review the AI-generated test cases (title, description, type, priority, target route)
3. Click **Run** on any test case
4. Watch the pipeline stages progress in the execution modal
5. View the Browserbase recording URL on completion
6. If the test fails, review the failure analysis report

---

## Usage Guide

### 1. Connect Your GitHub Repository

Navigate to the workspace, click **Connect Repository**, and authorize Testiva to access your GitHub account. Select a repository from the list. Testiva stores the GitHub token securely and uses it only to fetch repository metadata and file contents for Repository Intelligence.

### 2. Configure Target Domain

In **Repository Settings**, set the **Target Domain** to where your application runs:
- For local development: `http://localhost:3000`
- For staging: `https://staging.yourdomain.com`
- For production: `https://yourdomain.com`

You can also add **Global Project Instructions** — project-specific context that is injected into every AI prompt (e.g., "This app uses a dark mode toggle in the top-right corner" or "Authentication requires test@example.com / password123").

### 3. Generate Test Cases

Click **Generate Test Cases**. Testiva fetches your `package.json` and file structure from GitHub, runs `RepositoryIntelligenceService.analyzeRepository()`, and sends the result to Gemini 2.5 Flash with a prompt to generate typed test cases. You receive test cases with title, description, type (functional / regression / accessibility / api / visual), priority, target route, target files, and expected result.

### 4. Run a Test

Click **Run** on any test case. The execution modal opens and shows the 10-stage pipeline in real time. Logs stream from each stage. When execution completes, you see:
- ✅ / ❌ status
- Browserbase session URL (live session viewer)
- Browserbase recording URL (full playback of what the browser did)
- Structured execution logs

### 5. View the Failure Analysis

If a test fails, the failure analysis card shows:
- Root cause explanation
- Confidence score
- Failure category and severity
- The exact selector that broke
- A suggested replacement selector
- A step-by-step fix recommendation
- Whether self-healing was attempted and whether it succeeded

### 6. Watch Browserbase Recordings

Every execution with `recordSession: true` produces a full browser recording at `https://browserbase.com/sessions/{sessionId}`. You can watch exactly what Playwright did, including clicks, navigation, form fills, and the moment of failure.

---

## Performance Optimizations

### UI Discovery Cache

The most expensive part of every execution is running a full Browserbase session just to discover the UI. Testiva caches the `DomSummary` per `repoId:baseUrl:branch`. If your application hasn't changed (same URL, same branch), the discovery session is skipped entirely on subsequent runs, saving 15–30 seconds per test.

### Repository Intelligence Cache

`RepositoryIntelligence` is cached in the `repositories` table as `jsonb`. The cache key is a base64 hash of `package.json + file list + env content`. If the hash matches, the GitHub API calls and analysis are skipped.

### Prompt Token Optimization

The DOM summary injected into prompts is capped at slice sizes to avoid token overflow: 20 nav items, 30 buttons, 5 forms, 20 routes, 15 accessibility nodes, 10 dropdowns. The compact JSON serialization removes whitespace and omits null fields.

### AI Provider Caching

Gemini is tried first. On success, the result is returned immediately. Only on failure (after 3 retries) is the Groq fallback activated. This minimizes API cost for healthy executions.

### Timeout Hierarchy

The `TimeoutManager` maintains separate timeouts for each phase:
- CDP connection: 30s
- Script execution: 120s
- Tunnel creation: 45s
- Tunnel verification: 15s
- URL reachability: 12s
- UI discovery: 90s

Aggressive timeouts prevent stalled sessions from consuming Browserbase credits.

### Cleanup Manager Priority

Resources are released in priority order to minimize billing:
1. Cloudflare Tunnel (priority 100) — stops immediately
2. Browserbase sessions (priority 90) — released via `REQUEST_RELEASE`
3. Browser connections (priority 80) — CDP disconnected
4. Custom resources (priority 50)

---

## Future Roadmap

> Only items with a clear implementation path are listed.

**Multi-branch testing** — Run tests across feature branches automatically on pull request creation via GitHub webhook integration.

**Persistent Repository Memory** — Currently `RepositoryMemoryService` is in-memory and resets on server restart. Persisting the memory to the database would allow selector knowledge to accumulate across deploys.

**Parallel execution** — Run multiple test cases concurrently using multiple Browserbase sessions, with a configurable concurrency limit.

**AI-assisted test case editing** — Allow users to refine AI-generated test cases with a chat interface before execution.

**Visual regression baselines** — Persist screenshot baselines in object storage (S3/R2) and surface comparison diffs in the UI.

**GitHub Actions integration** — Trigger Testiva executions from CI pipelines via a webhook or GitHub Action.

**Commit-triggered testing** — Connect the `CommitImpactService` to GitHub webhooks to automatically run the affected test subset on every push.

---

## Why Testiva?

| Concern | Traditional Playwright | Naive AI Testing | Testiva |
|---|---|---|---|
| Selector maintenance | Manual — breaks on UI changes | Hallucinated — may not exist | Grounded in live DOM scan |
| Framework awareness | You write framework-specific code | LLM guesses | Repository Intelligence extracts it |
| Authentication handling | You write login helpers | LLM guesses the flow | Login detection from UI Discovery |
| Route knowledge | You hardcode routes | LLM invents routes | Routes extracted from live navigation |
| Localhost testing | Works natively | Cloud browsers can't reach it | Automatic Cloudflare Tunnel |
| Failure diagnosis | Read the error, guess the cause | N/A | Full FailureContext + AI root cause |
| Test recovery | Rewrite manually | N/A | Self-Healing with repaired script |
| Knowledge retention | None | None | Repository Memory across runs |
| Script recording | No built-in video | N/A | Every run recorded via Browserbase |
| Coverage tracking | Manual configuration | N/A | AnalyticsEngine tracks automatically |

---

## Contributing

Contributions are welcome. Please follow these guidelines.

### Getting Started

```bash
git clone https://github.com/Gauranga025/Testiva.git
cd Testiva
npm install
cp .env.example .env.local
# Fill in your environment variables
npm run dev
```

### Branch Naming

- `feat/your-feature-name` — new features
- `fix/issue-description` — bug fixes
- `refactor/area-of-change` — refactoring
- `docs/what-you-documented` — documentation

### Code Style

- TypeScript strict mode is enabled
- All new modules in `lib/` should export a class with typed public methods
- All new execution stages must be added to `PipelineStageId` in `types.ts` and to `STATE_TRANSITIONS` in `state-machine.ts`
- All log lines must use `formatLogLine(prefix, message)` with a valid `LogPrefix`
- New AI prompts must be added as static methods to `PromptBuilders`

### Pull Requests

1. Fork the repository
2. Create a feature branch from `master`
3. Make your changes with tests where applicable
4. Run `npm run lint` and `npm run build` to verify
5. Open a pull request with a clear description of the change and why it's needed

### Reporting Issues

Please include:
- The test case title and description
- The repository type (Next.js / React / etc.)
- The environment (localhost / deployed)
- The full execution log from the UI
- The Browserbase recording URL if available

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with [Browserbase](https://www.browserbase.com/) · [Playwright](https://playwright.dev/) · [Next.js](https://nextjs.org/) · [Gemini](https://deepmind.google/technologies/gemini/)

[Live Demo](https://testiva-azure.vercel.app) · [Report a Bug](https://github.com/Gauranga025/Testiva/issues) · [Request a Feature](https://github.com/Gauranga025/Testiva/issues)

</div>
