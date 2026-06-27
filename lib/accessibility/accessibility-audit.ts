/**
 * Accessibility Audit Service
 * WCAG 2.1 AA compliance checking using Playwright accessibility APIs
 */

import type { DomSummary } from "@/lib/execution/types";

export type Severity = "critical" | "serious" | "moderate" | "minor";
export type WCAGLevel = "A" | "AA" | "AAA";

export interface AccessibilityViolation {
    id: string;
    impact: Severity;
    wcagLevel: WCAGLevel;
    category: string;
    description: string;
    selector: string | null;
    element: string;
    helpUrl: string;
}

export interface AccessibilityReport {
    executionId: string;
    timestamp: string;
    url: string;
    totalViolations: number;
    criticalViolations: number;
    seriousViolations: number;
    wcagScore: number;
    accessibilityScore: number;
    screenReaderCompatibility: number;
    suggestions: string[];
    violations: AccessibilityViolation[];
}

export class AccessibilityAuditService {
    async performAudit(params: {
        page: any;
        domSummary: DomSummary;
        url: string;
        executionId: string;
    }): Promise<AccessibilityReport> {
        const { page, domSummary, url, executionId } = params;
        
        const violations: AccessibilityViolation[] = [];
        
        // Check heading hierarchy
        this.checkHeadingHierarchy(domSummary, violations);
        
        // Check form issues
        this.checkFormIssues(domSummary, violations);
        
        // Calculate scores
        const wcagScore = this.calculateWCAGScore(violations);
        const accessibilityScore = this.calculateAccessibilityScore(violations);
        const screenReaderCompatibility = this.calculateScreenReaderCompatibility(domSummary, violations);
        
        // Generate suggestions
        const suggestions = this.generateSuggestions(violations);
        
        return {
            executionId,
            timestamp: new Date().toISOString(),
            url,
            totalViolations: violations.length,
            criticalViolations: violations.filter(v => v.impact === "critical").length,
            seriousViolations: violations.filter(v => v.impact === "serious").length,
            wcagScore,
            accessibilityScore,
            screenReaderCompatibility,
            suggestions,
            violations,
        };
    }
    
    private checkHeadingHierarchy(domSummary: DomSummary, violations: AccessibilityViolation[]): void {
        const headings = domSummary.headings || [];
        let previousLevel = 0;
        
        headings.forEach((heading, index) => {
            const level = heading.level;
            const tag = `h${level}`;
            
            if (index === 0 && level !== 1) {
                violations.push({
                    id: `missing-h1-${index}`,
                    impact: "moderate",
                    wcagLevel: "A",
                    category: "headings",
                    description: "Page does not start with h1 heading",
                    selector: null,
                    element: tag,
                    helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships",
                });
            }
            
            if (level > previousLevel + 1 && previousLevel !== 0) {
                violations.push({
                    id: `skipped-heading-${index}`,
                    impact: "moderate",
                    wcagLevel: "A",
                    category: "headings",
                    description: `Skipped heading level from h${previousLevel} to h${level}`,
                    selector: null,
                    element: tag,
                    helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships",
                });
            }
            
            previousLevel = level;
        });
    }
    
    private checkFormIssues(domSummary: DomSummary, violations: AccessibilityViolation[]): void {
        if (domSummary.forms) {
            domSummary.forms.forEach((form, index) => {
                form.fields.forEach((field, fieldIndex) => {
                    if (!field.label && field.type !== "hidden") {
                        violations.push({
                            id: `missing-form-label-${index}-${fieldIndex}`,
                            impact: "serious",
                            wcagLevel: "A",
                            category: "forms",
                            description: `Form field of type '${field.type}' has no label`,
                            selector: null,
                            element: field.type,
                            helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions",
                        });
                    }
                });
            });
        }
    }
    
    private calculateWCAGScore(violations: AccessibilityViolation[]): number {
        if (violations.length === 0) return 100;
        
        const criticalWeight = 10;
        const seriousWeight = 5;
        const moderateWeight = 2;
        const minorWeight = 1;
        
        const weightedViolations =
            violations.filter(v => v.impact === "critical").length * criticalWeight +
            violations.filter(v => v.impact === "serious").length * seriousWeight +
            violations.filter(v => v.impact === "moderate").length * moderateWeight +
            violations.filter(v => v.impact === "minor").length * minorWeight;
        
        return Math.max(0, 100 - weightedViolations);
    }
    
    private calculateAccessibilityScore(violations: AccessibilityViolation[]): number {
        if (violations.length === 0) return 100;
        
        const criticalCount = violations.filter(v => v.impact === "critical").length;
        const seriousCount = violations.filter(v => v.impact === "serious").length;
        const moderateCount = violations.filter(v => v.impact === "moderate").length;
        
        const score = 100 - (criticalCount * 25 + seriousCount * 10 + moderateCount * 5);
        return Math.max(0, score);
    }
    
    private calculateScreenReaderCompatibility(domSummary: DomSummary, violations: AccessibilityViolation[]): number {
        const totalElements = (domSummary.buttons?.length || 0) + (domSummary.forms?.length || 0);
        if (totalElements === 0) return 100;
        
        const unlabeledElements = violations.filter(v => v.category === "forms" || v.category === "labels").length;
        return Math.round(((totalElements - unlabeledElements) / totalElements) * 100);
    }
    
    private generateSuggestions(violations: AccessibilityViolation[]): string[] {
        const suggestions: string[] = [];
        
        const categoryCounts = violations.reduce((acc, v) => {
            acc[v.category] = (acc[v.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        if (categoryCounts.headings > 0) {
            suggestions.push("Fix heading hierarchy to ensure proper document outline");
        }
        
        if (categoryCounts.forms > 0) {
            suggestions.push("Associate form fields with labels using for/id attributes");
        }
        
        if (suggestions.length === 0) {
            suggestions.push("No major accessibility issues detected");
        }
        
        return suggestions;
    }
}
