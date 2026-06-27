/**
 * AI Context Engine
 * Merges Environment, Repository Intelligence, UI Discovery, Execution Goal, and Test Case
 * into a unified context for AI modules.
 */

import type { RepositoryIntelligence } from "./repository-intelligence";
import type { DomSummary, EnvironmentType } from "../execution/types";

export type EnvironmentContext = {
    type: EnvironmentType;
    baseUrl: string;
    effectiveUrl: string;
    isLocalhost: boolean;
};

export type ExecutionGoal = {
    type: "test_execution" | "test_generation" | "failure_analysis" | "coverage_analysis" | "repair";
    targetRoute: string;
    expectedBehavior: string;
    priority: "critical" | "high" | "medium" | "low";
};

export type TestCaseContext = {
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

export type AIContext = {
    environment: EnvironmentContext;
    repository: RepositoryIntelligence;
    uiDiscovery: DomSummary;
    executionGoal: ExecutionGoal;
    testCase: TestCaseContext;
    globalInstructions?: string;
    runtimeInstructions?: string;
    generatedAt: string;
};

export class AIContextEngine {
    /**
     * Build AI Context from all sources
     */
    buildContext(options: {
        environment: EnvironmentContext;
        repository: RepositoryIntelligence;
        uiDiscovery: DomSummary;
        executionGoal: ExecutionGoal;
        testCase: TestCaseContext;
        globalInstructions?: string;
        runtimeInstructions?: string;
    }): AIContext {
        return {
            environment: options.environment,
            repository: options.repository,
            uiDiscovery: options.uiDiscovery,
            executionGoal: options.executionGoal,
            testCase: options.testCase,
            globalInstructions: options.globalInstructions,
            runtimeInstructions: options.runtimeInstructions,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Serialize AI Context for AI consumption
     */
    serializeForAI(context: AIContext): string {
        const sections: string[] = [];

        // Environment Section
        sections.push("## ENVIRONMENT");
        sections.push(`Type: ${context.environment.type}`);
        sections.push(`Base URL: ${context.environment.baseUrl}`);
        sections.push(`Effective URL: ${context.environment.effectiveUrl}`);
        sections.push(`Is Localhost: ${context.environment.isLocalhost}`);
        sections.push("");

        // Repository Intelligence Section
        sections.push("## REPOSITORY INTELLIGENCE");
        sections.push(`Framework: ${context.repository.framework.name} ${context.repository.framework.version} (${context.repository.framework.type})`);
        sections.push(`Authentication: ${context.repository.authentication.provider || "None"} (${context.repository.authentication.type})`);
        sections.push(`Database: ${context.repository.database.type || "None"}`);
        sections.push(`ORM: ${context.repository.orm.name || "None"}`);
        sections.push(`Routing: ${context.repository.routing.type}`);
        sections.push(`Middleware: ${context.repository.middleware.present ? context.repository.middleware.type : "None"}`);
        sections.push(`API: ${context.repository.api.type}`);
        sections.push(`Forms: ${context.repository.forms.library || "None"}`);
        sections.push(`Validation: ${context.repository.validation.library || "None"}`);
        sections.push(`Package Manager: ${context.repository.packageManager}`);
        sections.push(`Build Tool: ${context.repository.buildTool.name}`);
        sections.push(`Architecture Pattern: ${context.repository.architecture.pattern}`);
        sections.push(`Business Modules: ${context.repository.businessModules.map(m => m.name).join(", ") || "None"}`);
        
        if (context.repository.environmentVariables.length > 0) {
            sections.push(`Environment Variables: ${context.repository.environmentVariables.map(v => v.name).join(", ")}`);
        }
        sections.push("");

        // UI Discovery Section
        sections.push("## UI DISCOVERY");
        sections.push(`Current URL: ${context.uiDiscovery.currentUrl}`);
        sections.push(`Final URL: ${context.uiDiscovery.finalUrl}`);
        sections.push(`Title: ${context.uiDiscovery.title}`);
        
        if (context.uiDiscovery.navigation.length > 0) {
            sections.push(`Navigation Items: ${context.uiDiscovery.navigation.length}`);
            context.uiDiscovery.navigation.slice(0, 5).forEach(nav => {
                sections.push(`  - ${nav.text} (${nav.href || "no href"})`);
            });
        }
        
        if (context.uiDiscovery.buttons.length > 0) {
            sections.push(`Buttons: ${context.uiDiscovery.buttons.length}`);
            context.uiDiscovery.buttons.slice(0, 5).forEach(btn => {
                sections.push(`  - ${btn.text} (${btn.role})`);
            });
        }
        
        if (context.uiDiscovery.forms.length > 0) {
            sections.push(`Forms: ${context.uiDiscovery.forms.length}`);
            context.uiDiscovery.forms.slice(0, 3).forEach(form => {
                sections.push(`  - ${form.fields.length} fields, ${form.submitButtons.length} submit buttons`);
            });
        }
        
        if (context.uiDiscovery.routes.length > 0) {
            sections.push(`Routes: ${context.uiDiscovery.routes.length}`);
            context.uiDiscovery.routes.slice(0, 10).forEach(route => {
                sections.push(`  - ${route.path} (${route.label})`);
            });
        }

        if (context.uiDiscovery.loginDiscovery) {
            sections.push(`Login Page Detected: Yes`);
            sections.push(`  - Email Field: ${context.uiDiscovery.loginDiscovery.emailField ? "Yes" : "No"}`);
            sections.push(`  - Password Field: ${context.uiDiscovery.loginDiscovery.passwordField ? "Yes" : "No"}`);
        }
        sections.push("");

        // Execution Goal Section
        sections.push("## EXECUTION GOAL");
        sections.push(`Type: ${context.executionGoal.type}`);
        sections.push(`Target Route: ${context.executionGoal.targetRoute}`);
        sections.push(`Expected Behavior: ${context.executionGoal.expectedBehavior}`);
        sections.push(`Priority: ${context.executionGoal.priority}`);
        sections.push("");

        // Test Case Section
        sections.push("## TEST CASE");
        sections.push(`Title: ${context.testCase.title}`);
        sections.push(`Description: ${context.testCase.description}`);
        sections.push(`Target Route: ${context.testCase.targetRoute}`);
        sections.push(`Expected Result: ${context.testCase.expectedResult}`);
        sections.push(`Target Files: ${context.testCase.targetFiles.join(", ") || "None"}`);
        sections.push(`Repository: ${context.testCase.repoOwner}/${context.testCase.repoName}`);
        sections.push(`Branch: ${context.testCase.branch}`);
        sections.push("");

        // Instructions Section
        if (context.globalInstructions) {
            sections.push("## GLOBAL PROJECT INSTRUCTIONS");
            sections.push(context.globalInstructions);
            sections.push("");
        }

        if (context.runtimeInstructions) {
            sections.push("## RUNTIME INSTRUCTIONS");
            sections.push(context.runtimeInstructions);
            sections.push("");
        }

        return sections.join("\n");
    }

    /**
     * Build compact JSON context for AI
     */
    buildCompactJSON(context: AIContext): string {
        return JSON.stringify({
            environment: {
                type: context.environment.type,
                baseUrl: context.environment.baseUrl,
                effectiveUrl: context.environment.effectiveUrl,
            },
            repository: {
                framework: context.repository.framework,
                authentication: context.repository.authentication,
                routing: context.repository.routing,
                forms: context.repository.forms,
                validation: context.repository.validation,
            },
            uiDiscovery: {
                currentUrl: context.uiDiscovery.currentUrl,
                finalUrl: context.uiDiscovery.finalUrl,
                navigation: context.uiDiscovery.navigation.slice(0, 20),
                buttons: context.uiDiscovery.buttons.slice(0, 30),
                forms: context.uiDiscovery.forms.slice(0, 5),
                routes: context.uiDiscovery.routes.slice(0, 20),
                loginDiscovery: context.uiDiscovery.loginDiscovery,
                dropdowns: context.uiDiscovery.dropdowns.slice(0, 10),
                accessibility: context.uiDiscovery.accessibility.slice(0, 15),
            },
            executionGoal: context.executionGoal,
            testCase: {
                title: context.testCase.title,
                description: context.testCase.description,
                targetRoute: context.testCase.targetRoute,
                expectedResult: context.testCase.expectedResult,
            },
            globalInstructions: context.globalInstructions,
            runtimeInstructions: context.runtimeInstructions,
        }, null, 2);
    }
}
