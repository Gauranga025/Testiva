/**
 * Prompt Builders
 * Reusable prompt builders for different AI operations.
 * Memory-Aware: Queries Repository Memory to reuse successful selectors and patterns.
 */

import type { AIContext } from "./ai-context";
import type { RepositoryMemoryService } from "@/lib/execution/repository-memory";

export class PromptBuilders {
    /**
     * Build Playwright execution prompt (Memory-Aware)
     */
    static buildPlaywrightPrompt(
        context: AIContext,
        repositoryMemoryService?: RepositoryMemoryService,
        repositoryHash?: string
    ): string {
        const targetRoute = context.testCase.targetRoute || "/";
        const fullUrl = `${context.environment.effectiveUrl}${targetRoute.startsWith("/") ? targetRoute : "/" + targetRoute}`;
        const expectedSnippet = context.testCase.expectedResult.toLowerCase().replace(/'/g, "'").slice(0, 200);

        // Query Repository Memory for known patterns
        let memoryContext = "";
        let memoryHits = 0;
        
        if (repositoryMemoryService && repositoryHash) {
            // Check for login flow
            const loginFlow = repositoryMemoryService.getLoginFlow(repositoryHash);
            if (loginFlow) {
                memoryContext += `\n[MEMORY - LOGIN FLOW]:\n`;
                memoryContext += `- Login URL: ${loginFlow.loginUrl}\n`;
                memoryContext += `- Username Selector: ${loginFlow.usernameSelector}\n`;
                memoryContext += `- Password Selector: ${loginFlow.passwordSelector}\n`;
                memoryContext += `- Submit Selector: ${loginFlow.submitSelector}\n`;
                memoryContext += `- Success Redirect: ${loginFlow.successRedirect}\n`;
                memoryHits++;
            }
            
            // Check for navigation patterns
            const navPattern = repositoryMemoryService.getNavigationPattern(repositoryHash, "/", targetRoute);
            if (navPattern) {
                memoryContext += `\n[MEMORY - NAVIGATION PATTERN]:\n`;
                memoryContext += `- From: ${navPattern.fromRoute}\n`;
                memoryContext += `- To: ${navPattern.toRoute}\n`;
                memoryContext += `- Navigation Selector: ${navPattern.navigationSelector}\n`;
                memoryContext += `- Expected Delay: ${navPattern.expectedDelay}ms\n`;
                memoryHits++;
            }
        }

        let prompt = `You are an expert QA automation engineer.
Write a Playwright script body that executes a test case on an application at "${context.environment.effectiveUrl}".

Test Case:
- Title: ${context.testCase.title}
- Description: ${context.testCase.description}
- Target Route: ${targetRoute}
- Expected Result: ${context.testCase.expectedResult}
`;

        if (memoryContext) {
            prompt += `\n[REPOSITORY MEMORY - ${memoryHits} HITS]:\n${memoryContext}\n`;
            prompt += `Use these known patterns from previous successful executions.\n`;
        }


        if (context.globalInstructions) {
            prompt += `\n[GLOBAL PROJECT INSTRUCTIONS]:\n${context.globalInstructions}\n`;
        }

        if (context.runtimeInstructions) {
            prompt += `\n[RUNTIME INSTRUCTIONS]:\n${context.runtimeInstructions}\n`;
        }

        prompt += `
Repository Intelligence (framework, architecture, patterns):
- Framework: ${context.repository.framework.name} ${context.repository.framework.version}
- Authentication: ${context.repository.authentication.provider || "None"} (${context.repository.authentication.type})
- Routing: ${context.repository.routing.type}
- Forms: ${context.repository.forms.library || "None"}
- Validation: ${context.repository.validation.library || "None"}
- Architecture: ${context.repository.architecture.pattern}

Live UI Discovery (what actually exists on the running app — USE THIS for selectors and routes):
${JSON.stringify({
    currentUrl: context.uiDiscovery.currentUrl,
    finalUrl: context.uiDiscovery.finalUrl,
    navigation: context.uiDiscovery.navigation.slice(0, 20),
    buttons: context.uiDiscovery.buttons.slice(0, 30),
    forms: context.uiDiscovery.forms.slice(0, 5),
    routes: context.uiDiscovery.routes.slice(0, 20),
    loginDiscovery: context.uiDiscovery.loginDiscovery,
    dropdowns: context.uiDiscovery.dropdowns.slice(0, 10),
    accessibility: context.uiDiscovery.accessibility.slice(0, 15),
}, null, 2)}

Runtime environment (already injected — do NOT import modules):
- page: Playwright Page object
- assert(condition, message): throws if condition is falsy
- console: logging object (use console.log at each step)
- recover(hints): optional one-shot recovery helper — hints: { role, name, text, label, placeholder }

Rules:
1. Do NOT import playwright, assert, or any module.
2. Do NOT redefine assert — use the injected assert() helper only.
3. ONLY interact with elements discovered in the Live UI Discovery JSON. Never invent buttons, headings, forms, dialogs, routes, or selectors.
4. Navigate safely:
   await page.goto('${fullUrl}', { waitUntil: 'domcontentloaded', timeout: 30000 });
   await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
5. Prefer resilient locators from discovered UI: page.getByRole(), page.getByPlaceholder(), page.getByLabel(), page.getByText(), page.locator('[data-testid="..."]').
6. Before every interaction: await locator.waitFor({ state: 'visible', timeout: 10000 });
7. Use scrollIntoViewIfNeeded() before clicks on long pages.
8. After navigation or form submit: await page.waitForLoadState('domcontentloaded').catch(() => {});
9. For login flows, use loginDiscovery from UI context (email/username/password/submit) — never guess button names.
10. Generate tests only for routes listed in UI discovery routes/navigation.
11. Clicks: try normal click first; on failure call recover({ role, name, text }) once before failing.
12. Assertions: use injected assert() with visibility checks and case-insensitive substring checks:
   const bodyText = (await page.locator('body').innerText()).toLowerCase();
   assert(bodyText.includes('${expectedSnippet}'), 'Expected result not found on page');
13. Log each major step with console.log('[STEP] ...').
14. Avoid brittle CSS-only selectors when role/text/placeholder locators exist.
15. Avoid page.waitForTimeout except as a last resort (max 500ms if absolutely needed).

Return ONLY raw executable JavaScript. No markdown fences. No explanation.
`;

        return prompt;
    }

    /**
     * Build test generation prompt
     */
    static buildTestGenerationPrompt(context: AIContext): string {
        let prompt = `You are an expert QA automation engineer.
Generate comprehensive test cases for an application.

Repository Information:
- Framework: ${context.repository.framework.name} ${context.repository.framework.version}
- Authentication: ${context.repository.authentication.provider || "None"}
- Routing: ${context.repository.routing.type}
- API: ${context.repository.api.type}
- Architecture: ${context.repository.architecture.pattern}

Available Routes:
${context.uiDiscovery.routes.map(r => `- ${r.path}: ${r.label}`).join("\n")}

Available UI Components:
- Navigation: ${context.uiDiscovery.navigation.length} items
- Buttons: ${context.uiDiscovery.buttons.length} items
- Forms: ${context.uiDiscovery.forms.length} forms
- Tables: ${context.uiDiscovery.tables.length} tables

Generate test cases that:
1. Cover critical user flows
2. Test authentication flows (if applicable)
3. Validate form submissions
4. Check navigation between routes
5. Test data display and interactions
6. Include edge cases and error scenarios

Return test cases in JSON format:
[
  {
    "title": "Test case title",
    "description": "What this test validates",
    "targetRoute": "/route",
    "expectedResult": "Expected outcome",
    "priority": "high|medium|low"
  }
]
`;

        return prompt;
    }

    /**
     * Build failure analysis prompt
     */
    static buildFailureAnalysisPrompt(context: AIContext, errorLogs: string[]): string {
        let prompt = `You are an expert QA automation engineer.
Analyze the following test execution failure and provide a diagnosis.

Test Case:
- Title: ${context.testCase.title}
- Description: ${context.testCase.description}
- Target Route: ${context.testCase.targetRoute}
- Expected Result: ${context.testCase.expectedResult}

Repository Context:
- Framework: ${context.repository.framework.name}
- Authentication: ${context.repository.authentication.provider || "None"}
- Routing: ${context.repository.routing.type}

UI Discovery at Failure:
${JSON.stringify({
    currentUrl: context.uiDiscovery.currentUrl,
    buttons: context.uiDiscovery.buttons.slice(0, 10),
    forms: context.uiDiscovery.forms.slice(0, 3),
    loginDiscovery: context.uiDiscovery.loginDiscovery,
}, null, 2)}

Error Logs:
${errorLogs.join("\n")}

Provide:
1. Root cause analysis
2. Likely reason for failure
3. Suggested fix (code or configuration)
4. Whether this is a flaky test or genuine issue
5. Recommended retry strategy if applicable
`;

        return prompt;
    }

    /**
     * Build coverage analysis prompt
     */
    static buildCoveragePrompt(context: AIContext, existingTests: any[]): string {
        let prompt = `You are an expert QA automation engineer.
Analyze test coverage for an application.

Repository:
- Framework: ${context.repository.framework.name}
- Architecture: ${context.repository.architecture.pattern}
- Business Modules: ${context.repository.businessModules.map(m => m.name).join(", ")}

Available Routes:
${context.uiDiscovery.routes.map(r => `- ${r.path}: ${r.label}`).join("\n")}

Existing Tests (${existingTests.length}):
${existingTests.map(t => `- ${t.title}: ${t.targetRoute}`).join("\n")}

Identify:
1. Uncovered routes
2. Missing test scenarios
3. Gaps in authentication testing
4. Form validation coverage gaps
5. Error state coverage gaps
6. Edge cases not tested

Return coverage report in JSON format:
{
  "coveragePercentage": number,
  "uncoveredRoutes": string[],
  "missingScenarios": string[],
  "recommendations": string[]
}
`;

        return prompt;
    }

    /**
     * Build repair prompt (Memory-Aware)
     */
    static buildRepairPrompt(
        context: AIContext,
        brokenScript: string,
        errorLogs: string[],
        repositoryMemoryService?: RepositoryMemoryService,
        repositoryHash?: string
    ): string {
        // Query Repository Memory for repaired selectors
        let memoryContext = "";
        let memoryHits = 0;
        
        if (repositoryMemoryService && repositoryHash) {
            // Extract selectors from broken script
            const selectorMatches = brokenScript.match(/getByRole\(['"`]([^'"`]+)['"`]\)|locator\(['"`]([^'"`]+)['"`]\)/g) || [];
            
            for (const match of selectorMatches) {
                const selector = match.replace(/getByRole\(['"`]|locator\(['"`]|['"`]\)/g, "");
                const repaired = repositoryMemoryService.getRepairedSelector(repositoryHash, selector);
                if (repaired) {
                    memoryContext += `- ${selector} → ${repaired}\n`;
                    memoryHits++;
                }
            }
        }

        let prompt = `You are an expert QA automation engineer.
Repair a broken Playwright test script.

Test Case:
- Title: ${context.testCase?.title || 'Unknown'}
- Description: ${context.testCase?.description || 'No description'}
- Target Route: ${context.testCase?.targetRoute || 'Unknown'}
- Expected Result: ${context.testCase?.expectedResult || 'Unknown'}
`;

        if (memoryContext) {
            prompt += `\n[REPOSITORY MEMORY - REPAIRED SELECTORS - ${memoryHits} HITS]:\n${memoryContext}\n`;
            prompt += `Use these previously repaired selectors from memory.\n`;
        }

        prompt += `Repository Context:
- Framework: ${context.repository?.framework?.name || 'Unknown'}
- Routing: ${context.repository?.routing?.type || 'Unknown'}
- Forms: ${context.repository?.forms?.library || "None"}

Current UI State:
${JSON.stringify({
    currentUrl: context.uiDiscovery?.currentUrl || '',
    buttons: context.uiDiscovery?.buttons?.slice(0, 15) || [],
    forms: context.uiDiscovery?.forms?.slice(0, 3) || [],
    loginDiscovery: context.uiDiscovery?.loginDiscovery || null,
    dropdowns: context.uiDiscovery?.dropdowns?.slice(0, 5) || [],
}, null, 2)}

Broken Script:
\`\`\`javascript
${brokenScript}
\`\`\`

Error Logs:
${errorLogs.join("\n")}

Repair the script by:
1. Updating selectors to match current UI
2. Adding proper waits and timeouts
3. Handling dynamic elements
4. Using more resilient locators
5. Adding recovery logic where needed

Return ONLY the repaired JavaScript code. No markdown fences. No explanation.
`;

        return prompt;
    }
}
