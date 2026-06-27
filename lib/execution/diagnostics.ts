/**
 * Execution Diagnostics for production debugging.
 */

export type DiagnosticMetric = {
    name: string;
    value: number | string | boolean;
    timestamp: number;
    category: "performance" | "resource" | "network" | "system";
};

export type DiagnosticEvent = {
    name: string;
    timestamp: number;
    data?: Record<string, unknown>;
};

export class ExecutionDiagnostics {
    private metrics: DiagnosticMetric[] = [];
    private events: DiagnosticEvent[] = [];
    private startTime: number;

    constructor() {
        this.startTime = Date.now();
    }

    recordMetric(
        name: string,
        value: number | string | boolean,
        category: DiagnosticMetric["category"]
    ): void {
        this.metrics.push({
            name,
            value,
            timestamp: Date.now(),
            category,
        });
    }

    recordEvent(name: string, data?: Record<string, unknown>): void {
        this.events.push({
            name,
            timestamp: Date.now(),
            data,
        });
    }

    recordDuration(name: string, startTime: number, category: DiagnosticMetric["category"] = "performance"): void {
        const duration = Date.now() - startTime;
        this.recordMetric(name, duration, category);
    }

    getMetrics(filter?: { category?: DiagnosticMetric["category"] }): DiagnosticMetric[] {
        if (!filter) return [...this.metrics];
        
        return this.metrics.filter((m) => {
            if (filter.category && m.category !== filter.category) return false;
            return true;
        });
    }

    getEvents(filter?: { name?: string }): DiagnosticEvent[] {
        if (!filter) return [...this.events];
        
        return this.events.filter((e) => {
            if (filter.name && e.name !== filter.name) return false;
            return true;
        });
    }

    getMetricByName(name: string): DiagnosticMetric | undefined {
        return this.metrics.find((m) => m.name === name);
    }

    getTotalDuration(): number {
        return Date.now() - this.startTime;
    }

    getSummary(): Record<string, unknown> {
        const performanceMetrics = this.getMetrics({ category: "performance" });
        const resourceMetrics = this.getMetrics({ category: "resource" });
        const networkMetrics = this.getMetrics({ category: "network" });
        const systemMetrics = this.getMetrics({ category: "system" });

        return {
            totalDuration: this.getTotalDuration(),
            metricsCount: this.metrics.length,
            eventsCount: this.events.length,
            performanceMetrics: performanceMetrics.length,
            resourceMetrics: resourceMetrics.length,
            networkMetrics: networkMetrics.length,
            systemMetrics: systemMetrics.length,
            metrics: this.metrics,
            events: this.events,
        };
    }

    reset(): void {
        this.metrics = [];
        this.startTime = Date.now();
    }
}
