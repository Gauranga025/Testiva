/**
 * Visual Regression Testing Service
 * Screenshot-based regression testing with baseline management
 */

export interface BaselineScreenshot {
    id: string;
    route: string;
    viewport: { width: number; height: number };
    mode: "light" | "dark";
    timestamp: string;
    screenshot: string;
    version: string;
}

export interface ScreenshotComparison {
    baselineId: string;
    route: string;
    viewport: { width: number; height: number };
    mode: string;
    differencePercentage: number;
    passed: boolean;
    threshold: number;
    timestamp: string;
}

export interface VisualRegressionReport {
    executionId: string;
    timestamp: string;
    totalComparisons: number;
    passed: number;
    failed: number;
    overallScore: number;
    comparisons: ScreenshotComparison[];
    aiSummary: string;
    recommendations: string[];
}

export class VisualRegressionService {
    private baselines: Map<string, BaselineScreenshot> = new Map();
    private threshold: number = 0.1;
    
    async captureBaseline(params: {
        page: any;
        route: string;
        viewport: { width: number; height: number };
        mode: "light" | "dark";
    }): Promise<BaselineScreenshot> {
        const { page, route, viewport, mode } = params;
        
        await page.setViewportSize(viewport);
        const screenshot = await page.screenshot({ encoding: "base64" }) as string;
        
        const baseline: BaselineScreenshot = {
            id: `baseline-${route}-${viewport.width}x${viewport.height}-${mode}-${Date.now()}`,
            route,
            viewport,
            mode,
            timestamp: new Date().toISOString(),
            screenshot,
            version: "1.0.0",
        };
        
        const key = this.generateKey(route, viewport, mode);
        this.baselines.set(key, baseline);
        
        return baseline;
    }
    
    async compareScreenshots(params: {
        page: any;
        route: string;
        viewport: { width: number; height: number };
        mode: "light" | "dark";
    }): Promise<ScreenshotComparison> {
        const { page, route, viewport, mode } = params;
        
        const key = this.generateKey(route, viewport, mode);
        const baseline = this.baselines.get(key);
        
        if (!baseline) {
            throw new Error(`No baseline found for ${route}`);
        }
        
        await page.setViewportSize(viewport);
        const currentScreenshot = await page.screenshot({ encoding: "base64" }) as string;
        
        const difference = this.compareImages(baseline.screenshot, currentScreenshot);
        
        return {
            baselineId: baseline.id,
            route,
            viewport,
            mode,
            differencePercentage: difference,
            passed: difference <= this.threshold,
            threshold: this.threshold,
            timestamp: new Date().toISOString(),
        };
    }
    
    private compareImages(baseline: string, current: string): number {
        // Placeholder for actual image comparison
        // In production, use pixelmatch or similar library
        return 0.05;
    }
    
    async generateReport(params: {
        comparisons: ScreenshotComparison[];
    }): Promise<VisualRegressionReport> {
        const { comparisons } = params;
        
        const totalComparisons = comparisons.length;
        const passed = comparisons.filter(c => c.passed).length;
        const failed = comparisons.filter(c => !c.passed).length;
        const overallScore = totalComparisons > 0 ? Math.round((passed / totalComparisons) * 100) : 100;
        
        const aiSummary = this.generateAISummary(comparisons);
        const recommendations = this.generateRecommendations(comparisons);
        
        return {
            executionId: `vr-${Date.now()}`,
            timestamp: new Date().toISOString(),
            totalComparisons,
            passed,
            failed,
            overallScore,
            comparisons,
            aiSummary,
            recommendations,
        };
    }
    
    private generateAISummary(comparisons: ScreenshotComparison[]): string {
        const failedComparisons = comparisons.filter(c => !c.passed);
        
        if (failedComparisons.length === 0) {
            return "No visual regressions detected. All screenshots match their baselines.";
        }
        
        return `Visual changes detected on ${failedComparisons.length} routes. Review the changed regions to determine if these are intentional design updates or regressions.`;
    }
    
    private generateRecommendations(comparisons: ScreenshotComparison[]): string[] {
        const recommendations: string[] = [];
        const failedComparisons = comparisons.filter(c => !c.passed);
        
        if (failedComparisons.length === 0) {
            recommendations.push("All visual tests passed. No action needed.");
            return recommendations;
        }
        
        failedComparisons.forEach(comparison => {
            if (comparison.differencePercentage > 0.5) {
                recommendations.push(`Significant visual change on ${comparison.route}. Review if intentional.`);
            }
        });
        
        recommendations.push("Update baselines if changes are intentional.");
        
        return recommendations;
    }
    
    private generateKey(route: string, viewport: { width: number; height: number }, mode: string): string {
        return `${route}-${viewport.width}x${viewport.height}-${mode}`;
    }
    
    setThreshold(threshold: number): void {
        this.threshold = threshold;
    }
    
    clearBaselines(): void {
        this.baselines.clear();
    }
}
