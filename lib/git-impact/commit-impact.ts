/**
 * Commit Impact Analysis Service
 * Analyzes Git changes to determine affected tests and prioritize execution
 */

import type { RepositoryIntelligence } from "@/lib/ai/repository-intelligence";

export interface GitChange {
    filePath: string;
    changeType: "added" | "modified" | "deleted";
}

export interface ChangeAnalysis {
    changedFiles: GitChange[];
    changedComponents: string[];
    changedRoutes: string[];
    changedAPIs: string[];
    changedBusinessModules: string[];
}

export interface TestImpact {
    affectedTestSuites: string[];
    affectedAPITests: string[];
    priorityScore: number;
    runtimeSavings: number;
    recommendedTests: string[];
}

export interface ImpactReport {
    commitHash: string;
    timestamp: string;
    changeAnalysis: ChangeAnalysis;
    testImpact: TestImpact;
    recommendations: string[];
}

export class CommitImpactService {
    async analyzeImpact(params: {
        changes: GitChange[];
        repositoryIntelligence: RepositoryIntelligence;
    }): Promise<ImpactReport> {
        const { changes, repositoryIntelligence } = params;
        
        const changeAnalysis = this.analyzeChanges(changes, repositoryIntelligence);
        const testImpact = this.determineTestImpact(changeAnalysis, repositoryIntelligence);
        const recommendations = this.generateRecommendations(changeAnalysis, testImpact);
        
        return {
            commitHash: "current",
            timestamp: new Date().toISOString(),
            changeAnalysis,
            testImpact,
            recommendations,
        };
    }
    
    private analyzeChanges(changes: GitChange[], repositoryIntelligence: RepositoryIntelligence): ChangeAnalysis {
        const changedComponents: string[] = [];
        const changedRoutes: string[] = [];
        const changedAPIs: string[] = [];
        const changedBusinessModules: string[] = [];
        
        changes.forEach(change => {
            const path = change.filePath.toLowerCase();
            
            if (path.includes("components/")) {
                const componentName = path.split("/").pop()?.replace(/\.(tsx?|jsx?)$/, "") || "";
                changedComponents.push(componentName);
            }
            
            if (path.includes("app/") || path.includes("pages/")) {
                const routePath = this.extractRoutePath(path);
                if (routePath) changedRoutes.push(routePath);
            }
            
            if (path.includes("api/")) {
                const apiPath = this.extractAPIPath(path);
                if (apiPath) changedAPIs.push(apiPath);
            }
            
            repositoryIntelligence.businessModules.forEach(module => {
                if (path.includes(module.path.toLowerCase()) || path.includes(module.name.toLowerCase())) {
                    changedBusinessModules.push(module.name);
                }
            });
        });
        
        return {
            changedFiles: changes,
            changedComponents: [...new Set(changedComponents)],
            changedRoutes: [...new Set(changedRoutes)],
            changedAPIs: [...new Set(changedAPIs)],
            changedBusinessModules: [...new Set(changedBusinessModules)],
        };
    }
    
    private extractRoutePath(filePath: string): string | null {
        const match = filePath.match(/(?:app|pages)\/(.+?)(?:\/page\.(tsx?|jsx?)|\/index\.(tsx?|jsx?))/);
        return match ? match[1] : null;
    }
    
    private extractAPIPath(filePath: string): string | null {
        const match = filePath.match(/api\/(.+?)(?:\/route\.(ts|js))/);
        return match ? match[1] : null;
    }
    
    private determineTestImpact(changeAnalysis: ChangeAnalysis, repositoryIntelligence: RepositoryIntelligence): TestImpact {
        const affectedTestSuites: string[] = [];
        const affectedAPITests: string[] = [];
        
        changeAnalysis.changedRoutes.forEach(route => {
            affectedTestSuites.push(`test-${route.replace(/\//g, "-")}`);
        });
        
        changeAnalysis.changedAPIs.forEach(api => {
            affectedAPITests.push(`api-${api.replace(/\//g, "-")}`);
        });
        
        changeAnalysis.changedBusinessModules.forEach(module => {
            affectedTestSuites.push(`module-${module}`);
            affectedAPITests.push(`api-module-${module}`);
        });
        
        const priorityScore = this.calculatePriorityScore(changeAnalysis);
        const runtimeSavings = this.calculateRuntimeSavings(changeAnalysis, repositoryIntelligence);
        const recommendedTests = this.generateRecommendedTests(affectedTestSuites, affectedAPITests, priorityScore);
        
        return {
            affectedTestSuites: [...new Set(affectedTestSuites)],
            affectedAPITests: [...new Set(affectedAPITests)],
            priorityScore,
            runtimeSavings,
            recommendedTests,
        };
    }
    
    private calculatePriorityScore(changeAnalysis: ChangeAnalysis): number {
        let score = 0;
        
        score += changeAnalysis.changedAPIs.length * 10;
        score += changeAnalysis.changedRoutes.length * 8;
        score += changeAnalysis.changedBusinessModules.length * 15;
        
        return Math.min(100, score);
    }
    
    private calculateRuntimeSavings(changeAnalysis: ChangeAnalysis, repositoryIntelligence: RepositoryIntelligence): number {
        const totalTests = repositoryIntelligence.businessModules.length * 3;
        const affectedTests = changeAnalysis.changedBusinessModules.length * 3;
        const savingsPercentage = (totalTests - affectedTests) / totalTests;
        return Math.round(totalTests * 30 * savingsPercentage);
    }
    
    private generateRecommendedTests(testSuites: string[], apiTests: string[], priorityScore: number): string[] {
        const recommended: string[] = [];
        recommended.push(...testSuites);
        recommended.push(...apiTests);
        return [...new Set(recommended)];
    }
    
    private generateRecommendations(changeAnalysis: ChangeAnalysis, testImpact: TestImpact): string[] {
        const recommendations: string[] = [];
        
        if (changeAnalysis.changedAPIs.length > 0) {
            recommendations.push(`API changes detected - run ${changeAnalysis.changedAPIs.length} API tests`);
        }
        
        if (testImpact.priorityScore >= 70) {
            recommendations.push("High priority changes - include comprehensive test suite");
        }
        
        if (testImpact.runtimeSavings > 60) {
            recommendations.push(`Selective testing saves ${testImpact.runtimeSavings} seconds`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push("No critical changes detected - standard test suite recommended");
        }
        
        return recommendations;
    }
}
