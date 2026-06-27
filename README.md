<p align="center">
  <img src="public/TestivaLogo.png" width="180" alt="TestivaLogo.png" />
</p>

<h1 align="center">Testiva</h1>

<p align="center">
  <strong>AI-Powered Autonomous Software Testing Platform</strong><br/>
  <sub>Stop writing tests. Start shipping with confidence.</sub>
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://playwright.dev/"><img src="https://img.shields.io/badge/Playwright-1.60-2EAD33?style=flat-square&logo=playwright&logoColor=white" alt="Playwright" /></a>
  <a href="https://www.browserbase.com/"><img src="https://img.shields.io/badge/Browserbase-Cloud_Browser-F97316?style=flat-square" alt="Browserbase" /></a>
  <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/AI-Gemini_2.5_Flash_%7C_Llama_3.3-8B5CF6?style=flat-square" alt="AI Powered" /></a>
  <a href="https://orm.drizzle.team/"><img src="https://img.shields.io/badge/Drizzle-0.44-C5F74F?style=flat-square&logoColor=black" alt="Drizzle" /></a>
  <a href="https://neon.tech/"><img src="https://img.shields.io/badge/Neon-PostgreSQL-00E5B0?style=flat-square" alt="Neon" /></a>
  <a href="https://clerk.com/"><img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square" alt="Clerk" /></a>
  <a href="https://github.com/Gauranga025/Testiva/actions"><img src="https://img.shields.io/badge/Build-Passing-22C55E?style=flat-square" alt="Build" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-EAB308?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="https://testiva-azure.vercel.app"><strong>Live Demo</strong></a> ·
  <a href="https://github.com/Gauranga025/Testiva/issues">Report a Bug</a> ·
  <a href="https://github.com/Gauranga025/Testiva/issues">Request a Feature</a>
</p>

---

## What Is Testiva?

Testiva is an **autonomous AI-powered end-to-end testing platform** that connects to your GitHub repository, understands your application's architecture, discovers your live UI in real time, generates Playwright scripts, executes them in a cloud browser (Browserbase), and delivers full failure analysis — all without you writing a single line of test code.

### The Problem with Existing Approaches

**Traditional Playwright** requires you to write, maintain, and fix hundreds of selectors. When your UI changes, your tests break. Every selector is a maintenance liability.

**Naive AI testing** fails because LLMs hallucinate selectors, invent routes that don't exist, and generate scripts against a codebase they can't actually see running.

### Why Testiva Is Different

Testiva solves both problems with two systems that don't exist in any other testing tool:

| | Traditional Playwright | Naive AI Testing | **Testiva** |
|---|---|---|---|
| Selector maintenance | Manual — breaks on UI changes | Hallucinated | **Grounded in live DOM scan** |
| Framework awareness | You write framework-specific code | LLM guesses | **Repository Intelligence extracts it** |
| Authentication handling | You write login helpers | LLM guesses the flow | **Login detection from UI Discovery** |
| Route knowledge | You hardcode routes | LLM invents routes | **Routes extracted from live navigation** |
| Localhost testing | Works natively | Cloud browsers can't reach it | **Automatic Cloudflare Tunnel** |
| Failure diagnosis | Read the error, guess the cause | N/A | **Full FailureContext + AI root cause** |
| Test recovery | Rewrite manually | N/A | **Self-Healing with repaired script** |
| Knowledge retention | None | None | **Repository Memory across runs** |
| Script recording | No built-in video | N/A | **Every run recorded via Browserbase** |
| Coverage tracking | Manual configuration | N/A | **AnalyticsEngine tracks automatically** |

**Repository Intelligence** performs static analysis of your `package.json`, file structure, auth provider, ORM, routing type, API patterns, and architecture — assembling them into structured context the AI actually understands.

**Application Intelligence** opens a live Browserbase session against your running application, scans every nav item, button, form, dialog, dropdown, route, and accessibility node, and returns a `DomSummary` the AI uses to generate selectors that are *guaranteed to exist*.

---

## Screenshots

<details>
<summary><strong>Dashboard & Workspace</strong></summary>

| Landing Page | Dashboard |
|---|---|
| ![Landing Page](public/HomePage.png) | ![Dashboard](public/ConnectedRepo.png) |

</details>

<details>
<summary><strong>Repository & Test Generation</strong></summary>

| Repository Selection | Test Case Generation |
|---|---|
| ![Repository Selection](public/GenerateTestCases.png) | ![Test Generation](public/TestCasesGenerated.png) |

</details>

<details>
<summary><strong>Execution & Intelligence</strong></summary>

| Run Test Cases | TestCasesRunning |
|---|---|
| ![Failure Analysis](public/RunSelectedTC.png) | ![AI Context](public/TestCasesRunning.png) |

| Pass and Failed | Repository Intelligence |
|---|---|
| ![Repository Intelligence](public/TestCasesRunning.png) | ![Environment](public/Int.png) |

</details>

<details>
<summary><strong>Support and Feedback</strong></summary>

| Support Testiva | Help Shape Testiva |
|---|---|
| ![Coverage](public/SupportandFeedback.png) | ![Analytics](public/HelpShapeTestiva.png) |


</details>

---

## Architecture

Testiva is structured as a seven-layer pipeline. Each layer feeds into the next, with caching and fallbacks at every stage.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INPUT LAYER                                                            │
│  GitHub Repository · Target URL · Test Case · Global Instructions      │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  ENVIRONMENT INTELLIGENCE    │
                    │  localhost vs deployed        │
                    │  URL normalization            │
                    │  Cloudflare Tunnel lifecycle  │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  REPOSITORY INTELLIGENCE     │
                    │  Framework · Auth · DB · ORM  │
                    │  Routing · APIs · Modules     │
                    │  Cached in PostgreSQL (jsonb) │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  APPLICATION INTELLIGENCE    │
                    │  Live Browserbase session     │
                    │  DOM scan: nav · forms ·      │
                    │  buttons · routes · a11y      │
                    │  Cached per repo+URL+branch   │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  AI CONTEXT ENGINE           │
                    │  Merges all above + goal      │
                    │  AIContext → prompt           │
                    │  Memory-aware builder         │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  GENERATION LAYER            │
                    │  Gemini 2.5 Flash (primary)   │
                    │  Llama 3.3 70B / Groq (fallback)│
                    │  Syntax check via new Function│
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  EXECUTION LAYER             │
                    │  Browserbase + Playwright CDP │
                    │  recordSession · logSession   │
                    │  120s timeout · DOM recovery  │
                    └──────┬───────────────┬───────┘
                           │               │
                    ✅ Success        ❌ Failure
                           │               │
              ┌────────────▼───┐   ┌───────▼──────────────┐
              │ ANALYTICS      │   │ FAILURE ANALYSIS      │
              │ Coverage       │   │ FailureContext →       │
              │ Memory update  │   │ FailureReport          │
              │ Performance    │   │ rootCause · confidence │
              └────────────────┘   │ severity · category    │
                                   └───────┬───────────────┘
                                           │
                                   ┌───────▼───────────────┐
                                   │  SELF-HEALING          │
                                   │  repaired script        │
                                   │  retry execution        │
                                   │  record in Memory       │
                                   └───────────────────────┘
```

---

## Diagrams

### Complete Execution Pipeline

```mermaid
flowchart TD
    A([▶ Run Test]) --> B[Health Checks]
    B --> C[Environment Discovery]
    C --> D{Localhost?}
    D -- Yes --> E[Create Cloudflare Tunnel]
    D -- No --> F[Use Base URL]
    E --> G[Verify Tunnel Reachable]
    G --> H[Repository Analysis]
    F --> H
    H --> I{Cache Hit?}
    I -- Yes --> J[Load Cached Intelligence]
    I -- No --> K[Analyze Repository]
    K --> L[Cache Intelligence]
    L --> J
    J --> M[UI Discovery]
    M --> N{Cache Hit?}
    N -- Yes --> O[Load Cached DomSummary]
    N -- No --> P[Open Browserbase Session]
    P --> Q[Scan Live DOM]
    Q --> R[Cache DomSummary]
    R --> O
    O --> S[Build AIContext]
    S --> T[Generate Playwright Script]
    T --> U[Compile via new Function]
    U --> V[Browserbase Execution]
    V --> W{Success?}
    W -- Yes --> X[Assertions Pass]
    W -- No --> Y[Collect FailureContext]
    X --> Z[Update Repository Memory]
    Y --> AA[AI Failure Analysis]
    AA --> AB{Retryable?}
    AB -- Yes --> AC[Generate Repaired Script]
    AC --> AD[Retry Execution]
    AD --> AE{Healed?}
    AE -- Yes --> Z
    AE -- No --> AF[Record Failed Selector]
    AB -- No --> AF
    Z --> AG[Analytics Engine]
    AF --> AG
    AG --> AH[Cleanup: Tunnel → Session → Browser]
    AH --> AI([✅ Done])

    style A fill:#6366f1,color:#fff
    style AI fill:#22c55e,color:#fff
    style W fill:#f59e0b,color:#fff
    style AB fill:#f59e0b,color:#fff
    style AE fill:#f59e0b,color:#fff
```

---

### Overall System Architecture

```mermaid
graph LR
    subgraph Input["🔵 Input Layer"]
        GH[GitHub Repository]
        URL[Target URL]
        TC[Test Case]
        GI[Global Instructions]
    end

    subgraph Intelligence["🟣 Intelligence Layer"]
        RI[Repository Intelligence<br/>framework · auth · DB · ORM<br/>routing · APIs · modules]
        EI[Environment Intelligence<br/>localhost detection<br/>URL normalization]
        AI_App[Application Intelligence<br/>live DOM scan<br/>nav · forms · routes]
    end

    subgraph Context["🟡 AI Context Engine"]
        ACE[AIContextEngine<br/>merges all inputs<br/>→ AIContext]
        PB[PromptBuilders<br/>memory-aware<br/>serialization]
    end

    subgraph Generation["🟠 Generation Layer"]
        GEM[Gemini 2.5 Flash<br/>primary model]
        GROQ[Llama 3.3 / Groq<br/>automatic fallback]
        COMP[Script Compiler<br/>new Function check]
    end

    subgraph Execution["🔴 Execution Layer"]
        BB[Browserbase<br/>cloud browser]
        PW[Playwright CDP<br/>page control]
        CF[Cloudflare Tunnel<br/>localhost bridge]
    end

    subgraph Analysis["🟢 Analysis Layer"]
        FA[Failure Analysis<br/>FailureContext →<br/>FailureReport]
        SH[Self-Healing<br/>repaired script<br/>retry]
        RM[Repository Memory<br/>selector history<br/>login flows]
    end

    subgraph Analytics["⚪ Analytics Layer"]
        AE[Analytics Engine<br/>coverage · performance<br/>metrics · trends]
    end

    Input --> Intelligence
    Intelligence --> Context
    Context --> Generation
    Generation --> Execution
    Execution --> Analysis
    Execution --> Analytics
    Analysis --> RM
    RM --> Context
```

---

### Repository Intelligence Pipeline

```mermaid
flowchart TD
    REPO([GitHub Repository]) --> PJ[Parse package.json]
    REPO --> DT[Scan Directory Tree]
    REPO --> CS[Sample Code Files]
    REPO --> EV[Read .env Content]

    PJ --> FD[Framework Detection<br/>Next.js · React · Express]
    PJ --> DD[Dependency Detection<br/>auth · ORM · validation · forms]
    DT --> RD[Routing Detection<br/>App Router vs Pages Router]
    DT --> AD[API Architecture<br/>route-handlers vs api-routes]
    DT --> MD[Business Module Detection<br/>lib · services · hooks · store]
    CS --> AP[Auth Provider Detection<br/>Clerk · NextAuth · JWT]
    CS --> FL[Form Library Detection<br/>react-hook-form · formik]
    EV --> ENV[Environment Variable<br/>Mapping]

    FD --> RI[RepositoryIntelligence]
    DD --> RI
    RD --> RI
    AD --> RI
    MD --> RI
    AP --> RI
    FL --> RI
    ENV --> RI

    RI --> HASH{Hash Changed?}
    HASH -- No --> CACHE[(PostgreSQL Cache<br/>jsonb)]
    HASH -- Yes --> INVALIDATE[Invalidate + Reanalyze]
    INVALIDATE --> CACHE

    CACHE --> ACE[AI Context Engine]

    style REPO fill:#6366f1,color:#fff
    style RI fill:#8b5cf6,color:#fff
    style ACE fill:#f59e0b,color:#fff
```

---

### AI Context Engine

```mermaid
flowchart LR
    subgraph Inputs["Structured Inputs"]
        ENV_I[Environment\ntype · baseUrl · effectiveUrl]
        REPO_I[Repository Intelligence\nframework · auth · DB · ORM]
        UI_I[UI Discovery\nnav · buttons · forms · routes]
        GOAL_I[Execution Goal\ntype · targetRoute · behavior]
        TC_I[Test Case\ntitle · description · expectedResult]
        MEM_I[Repository Memory\nknown selectors · login flows]
    end

    subgraph Engine["AIContextEngine"]
        BUILD[buildContext]
        SER[serializeForAI\nstructured markdown]
        CJSON[buildCompactJSON\ntoken-efficient]
    end

    subgraph Providers["AI Providers"]
        GEM[Gemini 2.5 Flash\nretry × 3, backoff 2→4→8s]
        GROQ[Llama 3.3 / Groq\nauto-fallback]
    end

    subgraph Output["Generated Artifacts"]
        PW_OUT[Playwright Script]
        TC_OUT[Test Cases JSON]
        FA_OUT[Failure Analysis]
        REP_OUT[Repaired Script]
    end

    Inputs --> ENGINE
    Engine --> Providers
    Providers --> Output

    style BUILD fill:#6366f1,color:#fff
    style GEM fill:#4285f4,color:#fff
    style GROQ fill:#f97316,color:#fff
```

---

### Localhost Architecture

```mermaid
sequenceDiagram
    participant DEV as Developer Machine<br/>localhost:3000
    participant TIV as Testiva Server
    participant CF as cloudflared process
    participant BB as Browserbase<br/>Cloud Browser
    participant PW as Playwright CDP

    TIV->>TIV: detect localhost in base URL
    TIV->>CF: spawn cloudflared tunnel --url http://localhost:3000
    CF-->>TIV: trycloudflare.com/xxxxx URL (stdout parse)
    TIV->>CF: HEAD request to verify reachability (15s timeout)
    CF-->>TIV: 200 OK (tunnel confirmed)
    TIV->>TIV: rewriteScriptForEnvironment() ← replace localhost → tunnel URL
    TIV->>BB: create session (recordSession: true)
    BB-->>TIV: sessionId + connectUrl (CDP)
    TIV->>PW: chromium.connectOverCDP(connectUrl)
    PW->>CF: navigate to trycloudflare.com/xxxxx
    CF->>DEV: proxy to localhost:3000
    DEV-->>CF: HTML response
    CF-->>PW: page loaded
    PW->>PW: execute Playwright script
    PW-->>TIV: execution result
    TIV->>BB: REQUEST_RELEASE session
    TIV->>CF: process.kill() — tunnel destroyed
```

---

### Browserbase Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Creating : bb.sessions.create()
    Creating --> Connected : chromium.connectOverCDP()
    Connected --> Executing : run compiled script
    Executing --> Asserting : assertions pass
    Executing --> Failed : error thrown
    Asserting --> Collecting : capture artifacts
    Failed --> Collecting : capture FailureContext
    Collecting --> Releasing : bb.sessions.update(REQUEST_RELEASE)
    Releasing --> [*] : browser.close()

    state Connected {
        Page : page object
        Listener : network + console listeners
        Timeout : 120s execution timeout
    }
    state Collecting {
        Screenshot : base64 screenshot
        URL : session URL + recording URL
        Logs : structured log array
    }
```

---

### AI Failure Analysis Pipeline

```mermaid
flowchart TD
    FAIL([Execution Failure]) --> FC[Collect FailureContext]

    FC --> SS[Screenshot\nbase64]
    FC --> DOM_F[DOM State\naccessibility tree]
    FC --> CON[Console Logs\ninfo · warn · error · exceptions]
    FC --> NET[Network Logs\nfailed · httpErrors · redirects\nAPI responses + timing]
    FC --> STEP[Failed Step\naction · selector · expected\nactual · error · line]
    FC --> TL[Execution Timeline]

    SS --> AI_FA[AI Failure Analysis\nGemini 2.5 Flash]
    DOM_F --> AI_FA
    CON --> AI_FA
    NET --> AI_FA
    STEP --> AI_FA
    TL --> AI_FA

    AI_FA --> FR[FailureReport]
    FR --> RC[rootCause]
    FR --> CS[confidenceScore 0-100]
    FR --> SEV[severity: critical / high / medium / low]
    FR --> CAT[category: ui_change / auth / navigation\napi_failure / network / playwright]
    FR --> BS[brokenSelector]
    FR --> SS2[suggestedSelector]
    FR --> SF[suggestedFix]
    FR --> RR{retryRecommended?}

    RR -- Yes --> SH_F[Self-Healing\ngenerateRepairedScript]
    RR -- No --> MEM_F[Record Failed Selector\nin Repository Memory]
    SH_F --> RETRY[Re-Execute in\nNew Browserbase Session]
    RETRY --> SUCCESS_F{Healed?}
    SUCCESS_F -- Yes --> GOOD[Record Working Selector\nin Repository Memory]
    SUCCESS_F -- No --> MEM_F

    style FAIL fill:#ef4444,color:#fff
    style FR fill:#8b5cf6,color:#fff
    style RR fill:#f59e0b,color:#fff
```

---

### Repository Memory Flow

```mermaid
flowchart LR
    subgraph Execution["Test Execution"]
        E1[Successful Selectors\nwith confidence scores]
        E2[Failed Selectors\nto avoid]
        E3[Repaired Selectors]
        E4[Login Flows\ndetected]
        E5[Navigation Patterns]
        E6[Coverage History]
    end

    subgraph Memory["RepositoryMemoryService\nkey: SHA256(repoId)"]
        M1[(selectorHistory)]
        M2[(loginFlows)]
        M3[(navPatterns)]
        M4[(routeMetadata)]
        M5[(formSelectors)]
        M6[(workingScripts)]
        M7[(coverageHistory)]
    end

    subgraph Future["Future Executions"]
        F1[AI Prompt\ninjection]
        F2[Self-Healing\nhints]
        F3[Coverage\ntrends]
    end

    Execution --> Memory
    Memory --> Future

    style Memory fill:#1e293b,color:#94a3b8
```

---

### Analytics Flow

```mermaid
flowchart TD
    EXEC([Test Execution]) --> AE[Analytics Engine]
    AE --> ROUTE[Route Coverage\n% of routes tested]
    AE --> API_C[API Coverage\n% of endpoints hit]
    AE --> A11Y[Accessibility Score\nWCAG 2.1 AA]
    AE --> VR[Visual Regression\npixel diff %]
    AE --> PERF[Performance Metrics\ntimestamped events]
    AE --> FAIL_M[Failure Metrics\ncategory distribution]

    ROUTE --> DASH[Analytics Dashboard]
    API_C --> DASH
    A11Y --> DASH
    VR --> DASH
    PERF --> DASH
    FAIL_M --> DASH

    DASH --> TREND[Coverage Trends\ntime series]
    DASH --> REPORT[Execution Reports]
    DASH --> HEALTH[Repository Health Score]
```

---

## Features

### AI Intelligence

**Repository Intelligence** parses your `package.json` and directory tree to extract framework, version, auth provider, database, ORM, routing type (App Router vs Pages Router), middleware, API architecture, business modules, and architecture pattern (MVC, clean-architecture, monolith). This structured context replaces raw codebase prompting entirely.

**Application Intelligence (UI Discovery)** opens a live Browserbase session and performs deep DOM scanning: navigation items, all buttons with roles and aria-labels, every form with fields and submit targets, dialogs, tabs, dropdowns, headings, routes, loading states, error states, and login page detection. Everything is stored in a typed `DomSummary`.

**AI Context Engine** merges environment context, repository intelligence, UI discovery, execution goal, and test case into a single deterministic `AIContext` object. Serialized with labeled sections and injected into every AI call — eliminating prompt drift.

**Multi-Model AI with Automatic Fallback** uses Gemini 2.5 Flash as its primary model. If Gemini fails after 3 retries with exponential backoff (2s → 4s → 8s), it automatically switches to Llama 3.3 70B Versatile via Groq. Every response is tagged with the provider that produced it.

### Execution Engine

**Browserbase Cloud Execution** runs all test scripts in cloud browsers connected via CDP (Chrome DevTools Protocol). Sessions use `recordSession: true` and `logSession: true`. The compiled script runs with full Playwright `page` access and a `console` shim that routes to the structured log array.

**Localhost Testing via Cloudflare Tunnel** automatically bridges cloud browsers to your `localhost` application. When a local URL is detected, Testiva spawns `cloudflared tunnel --url <localUrl>`, parses the public URL, verifies reachability, rewrites the generated script, and tears down the tunnel post-execution. Zero manual configuration.

**Execution State Machine** enforces valid transitions across 13 pipeline stages: `idle → initializing → health_checks → environment_discovery → tunnel_creation → repository_analysis → ui_discovery → dom_summary → playwright_generation → execution → assertions → cleanup → completed`. Invalid transitions throw typed errors.

**Script Compilation Check** wraps the generated script body in `new Function()` before execution to catch syntax errors early, before a Browserbase session is even opened.

### Failure Recovery

**AI Failure Analysis** collects a complete `FailureContext` on every failure: screenshot, DOM state, accessibility tree, console logs (info/warn/error/exceptions), network logs (failed requests, HTTP errors, redirects, API responses with timing), failed step details, and execution timeline. Produces a `FailureReport` with root cause, confidence score (0–100), severity, and suggested fix.

**Intelligent Self-Healing** checks if the failure category is retryable (`ui_change`, `navigation`, `playwright`). If so, it builds a repair prompt from the `FailureReport`, generates a repaired script, executes it in a new session, and records the result in Repository Memory.

**Repository Memory** persists selector knowledge across runs: successful selectors with confidence scores, failed selectors to avoid, repaired selectors, login flows, navigation patterns, route metadata, form selectors, and working scripts.

### Developer Experience

**Health Checks** run a preflight battery before every execution: SQL ping, Browserbase session creation test, target URL reachability, GitHub token validity, AI provider key presence, and `cloudflared` availability. Any hard failure aborts with a clear typed error.

**Structured Logging** prefixes every log line with a typed `LogPrefix`: `[SYSTEM]`, `[AI]`, `[BROWSER]`, `[PLAYWRIGHT]`, `[NETWORK]`, `[ASSERT]`, `[ERROR]`, `[ENVIRONMENT]`, `[HEALTH]`, `[TUNNEL]`, `[DISCOVERY]`, `[CLEANUP]`, `[BROWSERBASE]`, `[CLOUDFLARE]`, `[FAILURE]`, `[SELF_HEAL]`, `[MEMORY]`, and more.

**Cleanup Manager** maintains a priority-ordered teardown list: tunnels (priority 100), Browserbase sessions (90), browsers (80), custom resources (50). All cleanups run even if individual ones fail.

### Analytics

**Coverage Analysis** tracks route coverage, API coverage, accessibility score, and visual regression score across every execution. Repository Memory maintains a `CoverageHistoryEntry` time series to show coverage trends over time.

**Accessibility Auditing** checks WCAG 2.1 AA compliance using the live `DomSummary`: heading hierarchy, form label coverage, button accessibility, aria-label presence, and screen reader compatibility. Reports include a WCAG score and `AccessibilityViolation` objects with selector, impact, and WCAG level.

**Visual Regression Testing** captures baseline screenshots via `page.screenshot()` and compares new screenshots pixel-by-pixel. Reports include difference percentage, pass/fail against a configurable threshold, and AI-generated recommendations.

**Commit Impact Analysis** maps changed files to affected components, routes, APIs, and business modules via Repository Intelligence. Returns the affected test subset and a runtime savings estimate — preventing full suite reruns on every commit.

### Infrastructure

**Production Hardening** covers typed error codes (`ExecutionErrorCode`), `AbortController`-based fetch timeouts, CDP connection timeouts, script execution timeouts (120s default), DOM recovery via page reload on first failure, and exponential backoff on all AI provider calls.

**Timeout Hierarchy** via `TimeoutManager`: CDP connection 30s, script execution 120s, tunnel creation 45s, tunnel verification 15s, URL reachability 12s, UI discovery 90s.

---

## Execution Pipeline

Every test passes through a **13-stage typed state machine**. Each stage reports `pending | active | completed | failed | skipped` in real time.

| # | Stage | Description |
|---|---|---|
| 1 | `health_checks` | SQL ping · Browserbase test · URL reachability · token validation · AI key check · cloudflared check |
| 2 | `environment_discovery` | Base URL normalization · localhost vs deployed detection · effective URL resolution |
| 3 | `tunnel_creation` | Spawn `cloudflared` · parse public URL · verify reachability · register with CleanupManager *(skipped for deployed)* |
| 4 | `repository_analysis` | Fetch `package.json` + file tree · run `RepositoryIntelligenceService` · cache in PostgreSQL |
| 5 | `ui_discovery` | Open Browserbase session (no recording) · `scanPageUi()` · extract full DOM summary |
| 6 | `dom_summary` | Serialize `DomSummary` via `summarizeDomForPrompt()` · cap slice sizes for token efficiency |
| 7 | `playwright_generation` | Build `AIContext` · run `PromptBuilders.buildPlaywrightPrompt()` · call Gemini/Groq · compile result |
| 8 | `execution` | Create Browserbase session (with recording) · connect via CDP · run compiled script |
| 9 | `assertions` | Evaluate `assert()` calls · log `[ASSERT] All assertions passed` on success |
| 10 | `failure_analysis` | Collect `FailureContext` · call `FailureAnalysisService.analyzeFailure()` → `FailureReport` |
| 11 | `self_healing` | Check `retryRecommended` · generate repaired script · re-execute in new session |
| 12 | `memory_update` | Record selector outcomes in `RepositoryMemoryService` · update coverage history |
| 13 | `cleanup` | Release tunnel (priority 100) → Browserbase session (90) → browser (80) in order |

---

## Repository Intelligence

Repository Intelligence answers: *"What kind of application am I testing?"*

### What It Extracts

**From `package.json`:** framework name, version, type (frontend / fullstack / backend), all dependencies categorized by role (auth, ORM, database, validation, forms, styling, components), and package manager (npm / yarn / pnpm / bun).

**From directory structure:** routing type (`app-router` vs `pages-router`), middleware presence, API architecture (`route-handlers` vs `api-routes`), business modules (`lib`, `components`, `hooks`, `services`, `utils`, `contexts`, `store`), and architecture pattern (`clean-architecture`, `mvc`, `monolith`).

**From code files:** auth provider (Clerk, NextAuth, JWT), form library (react-hook-form, formik), validation library (zod, yup), database type (PostgreSQL, MySQL, SQLite), ORM (Prisma, Drizzle).

**From environment files:** environment variable names with inferred descriptions and required status.

### Why Structured Intelligence Beats Raw Prompting

Without Repository Intelligence, the AI guesses that your app uses Clerk for auth, App Router for routing, and Drizzle for database access. With it, the AI knows exactly which auth provider to expect login redirects from, which route patterns to follow, and how forms are validated — without reading a single line of source code.

The intelligence is hashed and cached. Changing `package.json` or adding a route invalidates the cache automatically.

---

## Application Intelligence

Application Intelligence answers: *"What does the application actually look like right now?"*

Testiva opens a Browserbase session, navigates to your application, and extracts:

| Category | What Is Captured |
|---|---|
| Navigation | Text, href, role, visibility for every nav/sidebar element |
| Buttons | Text, role, aria-label, disabled state, data-testid |
| Forms | Action, method, all fields (name, type, label, placeholder, required, isEmail, isPassword), submit buttons |
| Routes | All `<a href>` values in navigation, formatted as route memories |
| Headings | Level (h1–h6), text, visibility |
| Dialogs | Role, title, visibility |
| Tabs | Text, selected state, role |
| Dropdowns | Text, selected value, available options |
| Accessibility | aria-label, aria-describedby, aria-live, aria-hidden |
| Loading States | Spinner / skeleton / progress / text detection |
| Error States | Inline / banner / modal error detection |
| Login Detection | Email field, password field, submit button identification |

Results are cached as `DiscoveryCacheEntry` in PostgreSQL. Cache key: `repoId:normalizedUrl:branch`. On hit, the entire UI Discovery and DOM Summary stages are skipped, saving 15–30 seconds per execution.

---

## AI Context Engine

The `AIContextEngine` bridges all intelligence sources and the AI models. It assembles a single `AIContext` object from five structured inputs and serializes it deterministically for every prompt.

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

`serializeForAI()` produces a structured markdown document with labeled sections: `## ENVIRONMENT`, `## REPOSITORY INTELLIGENCE`, `## UI DISCOVERY`, `## EXECUTION GOAL`, `## TEST CASE`, `## GLOBAL PROJECT INSTRUCTIONS`, `## RUNTIME INSTRUCTIONS`.

`buildCompactJSON()` produces a token-efficient JSON variant for token-constrained contexts.

---

## Browserbase Integration

All test execution and UI discovery happen in Browserbase sessions — never on the server running the Next.js application.

### Session Lifecycle

**Creation:** `bb.sessions.create({ projectId, timeout, browserSettings: { recordSession: true, logSession: true } })`

**Connection:** `chromium.connectOverCDP(session.connectUrl)` with a 30s timeout. Creates standard Playwright `Browser` and `Page` objects.

**Execution:** Compiled test script runs with access to `page`, `assert()`, and a `console` shim that routes logs to the structured log array.

**Recording:** Every execution session is recorded. The recording URL follows the pattern `https://browserbase.com/sessions/{sessionId}`. Session and recording URLs are persisted to the `test_cases` table.

**Cleanup:** `browser.close()` followed by `bb.sessions.update(sessionId, { status: "REQUEST_RELEASE" })`. Both are registered with the `CleanupManager` for guaranteed release even on error.

**UI Discovery Sessions** run in separate Browserbase sessions without recording (`recordSession: false`) to reduce noise and cost.

---

## Localhost Testing

Testing a locally running application from a cloud browser is a fundamentally hard problem. Testiva solves it with an integrated Cloudflare Tunnel pipeline.

### Why Localhost Is Difficult

Cloud browsers run in data centers. They cannot reach `localhost:3000` on your laptop. Naive solutions (ngrok manual setup, VPN, SSH tunnels) require out-of-band configuration and are fragile.

### How Testiva Solves It

1. Detects `localhost` or `127.0.0.1` in the base URL
2. Verifies `cloudflared` is installed and on PATH (`cloudflared --version`)
3. Spawns `cloudflared tunnel --url http://localhost:3000` as a child process
4. Parses the `trycloudflare.com` public URL from stdout/stderr with a regex (45s timeout)
5. Sends a HEAD request to the public URL to verify reachability (15s timeout)
6. Rewrites the generated Playwright script via `rewriteScriptForEnvironment()` — replacing all local URL references with the tunnel URL
7. Registers the tunnel's `close()` function with the `CleanupManager` at priority 100
8. After execution, kills the `cloudflared` process and releases the session

The entire tunnel lifecycle is transparent. You just set your target domain to `http://localhost:3000` in repository settings.

> Cloudflare Tunnels use TLS and are ephemeral — created and destroyed per execution. The `trycloudflare.com` domain is only active for the duration of the test run.

---

## AI Failure Analysis

When a test fails, Testiva runs a complete post-mortem — not just "test failed."

### FailureContext

```typescript
interface FailureContext {
  aiContext: AIContext;
  repositoryIntelligence: RepositoryIntelligence;
  domSummary: DomSummary | null;
  accessibilityTree: AccessibilityNode[];
  screenshot: string;                     // base64
  browserbaseRecording: string | null;
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

### FailureReport Fields

| Field | Description |
|---|---|
| `rootCause` | AI-generated root cause explanation |
| `confidenceScore` | 0–100 confidence in the diagnosis |
| `severity` | `critical` / `high` / `medium` / `low` |
| `category` | `ui_change` · `authentication` · `navigation` · `api_failure` · `network` · `environment` · `playwright` · `ai_generation` · `repository` · `infrastructure` |
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
| `ui_change` | ✅ | Selector changed — AI can generate a replacement |
| `navigation` | ✅ | Route redirect changed — recoverable |
| `playwright` | ✅ | Script error — may be fixable via repair prompt |
| `authentication` | ❌ | Auth misconfiguration — must be fixed manually |
| `api_failure` | ❌ | Backend issue — retrying won't help |
| `infrastructure` | ❌ | Environment issue — requires investigation |

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
│   ├── workspace/                # Main application workspace (Clerk protected)
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
│   │   ├── TestExecutionModal.tsx # Live execution viewer + pipeline stages
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
│   │   ├── browser-session.ts    # Page creation + event listeners
│   │   ├── cloudflare-lifecycle.ts # Tunnel lifecycle manager
│   │   ├── tunnel.ts             # Tunnel creation + verification
│   │   ├── environment.ts        # Environment discovery + URL mapping
│   │   ├── environment-utils.ts  # URL normalization + type detection
│   │   ├── ui-discovery.ts       # Live DOM scanning via Browserbase
│   │   ├── discovery-cache.ts    # DomSummary cache utilities
│   │   ├── pipeline-stages.ts    # Stage definitions + transitions
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
├── tsconfig.json                 # TypeScript configuration (strict mode)
└── package.json                  # Dependencies + scripts
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15 | Full-stack React framework with App Router |
| TypeScript | 5.8 | End-to-end type safety with strict mode |
| Tailwind CSS | 4.1 | Utility-first CSS |
| Radix UI + shadcn/ui | — | Accessible component primitives |
| Framer Motion | 12.40 | UI transitions and animations |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Next.js API Routes | 15 | Server-side API handlers |
| Axios | 1.18 | HTTP client for external API calls |
| Resend | 6.16 | Transactional email |

### Database

| Technology | Version | Purpose |
|---|---|---|
| Neon PostgreSQL | serverless | Serverless Postgres (`@neondatabase/serverless`) |
| Drizzle ORM | 0.44 | Type-safe SQL with migration support |

### AI

| Technology | Role | Purpose |
|---|---|---|
| Google Gemini 2.5 Flash | Primary | Structured JSON + free-text generation |
| Llama 3.3 70B via Groq | Fallback | Automatic fallback with JSON mode |

### Infrastructure

| Technology | Version | Purpose |
|---|---|---|
| Browserbase | 2.12 | Cloud browser sessions with recording |
| Playwright Core | 1.60 | CDP-based page control |
| Cloudflare (`cloudflared`) | — | Localhost → public HTTPS tunnel |
| Vercel | — | Edge-optimized deployment |

### Authentication & Payments

| Technology | Version | Purpose |
|---|---|---|
| Clerk | 6.39 | OAuth, JWT, middleware protection |
| Stripe | 18.1 | Subscription and credits |

---

## Performance Optimizations

**UI Discovery Cache** skips the most expensive part of every execution — running a full Browserbase session to discover the UI. The `DomSummary` is cached per `repoId:baseUrl:branch`. On subsequent runs with no application changes, the discovery stage is skipped entirely, saving 15–30 seconds per test.

**Repository Intelligence Cache** stores analyzed `RepositoryIntelligence` in the `repositories` table as `jsonb`. The cache key is a base64 hash of `package.json + file list + env content`. Cache hits skip all GitHub API calls and analysis.

**Prompt Token Optimization** caps the DOM summary slice sizes injected into prompts: 20 nav items, 30 buttons, 5 forms, 20 routes, 15 accessibility nodes, 10 dropdowns. The compact JSON serialization removes whitespace and omits null fields.

**AI Provider Caching** tries Gemini first and returns immediately on success. The Groq fallback is only activated on failure after 3 retries, minimizing API cost for healthy executions.

**Timeout Hierarchy** via `TimeoutManager` prevents stalled sessions from consuming Browserbase credits:

| Phase | Timeout |
|---|---|
| CDP connection | 30s |
| Script execution | 120s |
| Tunnel creation | 45s |
| Tunnel verification | 15s |
| URL reachability | 12s |
| UI discovery | 90s |

**Cleanup Manager Priority** releases resources in order to minimize billing: Cloudflare Tunnel (100) → Browserbase session (90) → Browser connection (80) → Custom resources (50).

---

## Installation

### Requirements

- Node.js 18+
- `cloudflared` CLI ([download](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)) — required only for localhost testing
- A [Browserbase](https://www.browserbase.com/) account
- A [Neon PostgreSQL](https://neon.tech/) database
- A [Clerk](https://clerk.com/) account
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)
- A [Groq](https://console.groq.com/) API key

### Clone and Install

```bash
git clone https://github.com/Gauranga025/Testiva.git
cd Testiva/testiva
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

# Stripe (optional — for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (optional — for email)
RESEND_API_KEY=re_...
```

### Environment Variables Reference

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
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (for billing) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe public key |
| `RESEND_API_KEY` | ✅ | Resend email API key |

### Database Setup

```bash
# Generate migration files from schema
npm run db:generate

# Push schema to Neon PostgreSQL
npm run db:push

# Optional: open Drizzle Studio
npm run db:studio
```

### GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → **New OAuth App**
2. Set the **Authorization callback URL** to `http://localhost:3000/api/github/callback` (or your deployed URL)
3. Copy the `Client ID` and `Client Secret` into `.env.local`

### Run Locally

```bash
npm run dev
# → http://localhost:3000
```

### Production Build

```bash
npm run build
npm run start
```

---

## Usage Guide

### 1 — Connect Your GitHub Repository

Sign in with your Clerk account. Click **Connect Repository** in the workspace and authorize Testiva to access your GitHub account via OAuth. Select the repository you want to test from the list.

### 2 — Configure Target Domain

In **Repository Settings**, set the **Target Domain** to where your application runs:

```
Local development:  http://localhost:3000
Staging:            https://staging.yourdomain.com
Production:         https://yourdomain.com
```

You can also add **Global Project Instructions** — project-specific context injected into every AI prompt (e.g., `"This app uses a dark mode toggle in the top-right corner"` or `"Auth requires test@example.com / password123"`).

### 3 — Generate Test Cases

Click **Generate Test Cases**. Testiva fetches your `package.json` and file structure from GitHub, runs `RepositoryIntelligenceService.analyzeRepository()`, and sends the result to Gemini 2.5 Flash. You receive typed test cases with title, description, type, priority, target route, target files, and expected result.

### 4 — Run a Test

Click **Run** on any test case. The execution modal shows the pipeline stages in real time. On completion you see:

- ✅ / ❌ status with structured logs
- Browserbase session URL (live session viewer)
- Browserbase recording URL (full browser playback)
- Per-stage timing and diagnostics

### 5 — Review Failure Analysis

If a test fails, the failure card shows: root cause explanation, confidence score, failure category, severity, the exact broken selector, a suggested replacement, a step-by-step fix, and whether self-healing was attempted.

### 6 — Watch Browserbase Recordings

Every execution produces a full browser recording at `https://browserbase.com/sessions/{sessionId}`. Watch exactly what Playwright did: clicks, navigation, form fills, and the precise moment of failure.

---

## Roadmap

| Status | Feature |
|---|---|
| ✅ Implemented | Repository Intelligence with PostgreSQL cache |
| ✅ Implemented | Application Intelligence via Browserbase DOM scan |
| ✅ Implemented | AI Context Engine with deterministic serialization |
| ✅ Implemented | Gemini 2.5 Flash + Llama 3.3 fallback |
| ✅ Implemented | Browserbase cloud execution with recording |
| ✅ Implemented | Cloudflare Tunnel for localhost testing |
| ✅ Implemented | 13-stage typed execution state machine |
| ✅ Implemented | AI Failure Analysis with full FailureContext |
| ✅ Implemented | Self-Healing with repaired script generation |
| ✅ Implemented | Repository Memory (in-memory, per session) |
| ✅ Implemented | UI Discovery Cache + Repository Intelligence Cache |
| ✅ Implemented | Coverage, accessibility, visual regression, API testing |
| ✅ Implemented | Commit Impact Analysis |
| ✅ Implemented | Priority-based CleanupManager |
| ✅ Implemented | Structured logging with typed prefixes |
| 🔜 Planned | Persistent Repository Memory across server restarts |
| 🔜 Planned | Parallel execution across multiple Browserbase sessions |
| 🔜 Planned | GitHub Actions integration — trigger from CI |
| 🔜 Planned | Multi-branch testing on pull request creation |
| 🔜 Planned | AI-assisted test case editing with chat interface |
| 🔜 Planned | Visual regression baselines in object storage (S3/R2) |
| 🔜 Planned | Commit-triggered testing via GitHub webhooks |

---

## Contributing

### Getting Started

```bash
git clone https://github.com/Gauranga025/Testiva.git
cd Testiva/testiva
npm install
cp .env.example .env.local
# Fill in your environment variables
npm run dev
```

### Branch Naming

| Prefix | Purpose |
|---|---|
| `feat/your-feature` | New features |
| `fix/issue-description` | Bug fixes |
| `refactor/area-of-change` | Refactoring |
| `docs/what-you-documented` | Documentation |

### Code Conventions

- TypeScript strict mode is enabled; no implicit `any`
- All new modules in `lib/` should export a class with typed public methods
- All new execution stages must be added to `PipelineStageId` in `types.ts` and to `STATE_TRANSITIONS` in `state-machine.ts`
- All log lines must use `formatLogLine(prefix, message)` with a valid `LogPrefix`
- New AI prompts must be added as static methods to `PromptBuilders`

### Pull Requests

1. Fork the repository
2. Create a feature branch from `master`
3. Make your changes with tests where applicable
4. Run `npm run lint` and `npm run build` to verify
5. Open a pull request with a clear description of the change and the motivation

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

<p align="center">
  Built with
  <a href="https://www.browserbase.com/">Browserbase</a> ·
  <a href="https://playwright.dev/">Playwright</a> ·
  <a href="https://nextjs.org/">Next.js</a> ·
  <a href="https://deepmind.google/technologies/gemini/">Gemini</a> ·
  <a href="https://neon.tech/">Neon</a> ·
  <a href="https://clerk.com/">Clerk</a>
</p>

<p align="center">
  <a href="https://testiva-azure.vercel.app"><strong>Live Demo</strong></a> ·
  <a href="https://github.com/Gauranga025/Testiva/issues">Report a Bug</a> ·
  <a href="https://github.com/Gauranga025/Testiva/issues">Request a Feature</a>
</p>
