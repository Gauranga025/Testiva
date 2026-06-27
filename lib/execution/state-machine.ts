/**
 * Execution State Machine for production-grade pipeline management.
 */

import type { PipelineStage, PipelineStageId } from "./types";

export type ExecutionState =
    | "idle"
    | "initializing"
    | "health_checks"
    | "environment_discovery"
    | "tunnel_creation"
    | "repository_analysis"
    | "ui_discovery"
    | "dom_summary"
    | "playwright_generation"
    | "execution"
    | "assertions"
    | "cleanup"
    | "completed"
    | "failed";

export type StateTransition = {
    from: ExecutionState;
    to: ExecutionState;
    event: string;
};

const STATE_TRANSITIONS: Record<ExecutionState, ExecutionState[]> = {
    idle: ["initializing", "failed"],
    initializing: ["health_checks", "failed"],
    health_checks: ["environment_discovery", "failed"],
    environment_discovery: ["tunnel_creation", "repository_analysis", "failed"],
    tunnel_creation: ["repository_analysis", "failed"],
    repository_analysis: ["ui_discovery", "playwright_generation", "failed"],
    ui_discovery: ["dom_summary", "failed"],
    dom_summary: ["playwright_generation", "execution", "failed"],
    playwright_generation: ["execution", "failed"],
    execution: ["assertions", "failed"],
    assertions: ["cleanup", "failed"],
    cleanup: ["completed", "failed"],
    completed: ["idle"],
    failed: ["idle"],
};

export class ExecutionStateMachine {
    private currentState: ExecutionState = "idle";
    private history: StateTransition[] = [];
    private startTime: number | null = null;
    private endTime: number | null = null;

    constructor() {
        this.startTime = Date.now();
    }

    getCurrentState(): ExecutionState {
        return this.currentState;
    }

    canTransitionTo(newState: ExecutionState): boolean {
        const allowedTransitions = STATE_TRANSITIONS[this.currentState];
        return allowedTransitions.includes(newState);
    }

    transition(newState: ExecutionState, event: string = "transition", callSite: string = "unknown"): void {
        if (!this.canTransitionTo(newState)) {
            throw new Error(
                `Invalid state transition from ${this.currentState} to ${newState}. ` +
                `Allowed: ${STATE_TRANSITIONS[this.currentState].join(", ")}`
            );
        }

        const transition: StateTransition = {
            from: this.currentState,
            to: newState,
            event,
        };

        this.history.push(transition);
        this.currentState = newState;

        if (newState === "completed" || newState === "failed") {
            this.endTime = Date.now();
        }
    }

    getHistory(): StateTransition[] {
        return [...this.history];
    }

    getDuration(): number | null {
        if (!this.startTime) return null;
        const end = this.endTime ?? Date.now();
        return end - this.startTime;
    }

    isTerminal(): boolean {
        return this.currentState === "completed" || this.currentState === "failed";
    }

    reset(): void {
        this.currentState = "idle";
        this.history = [];
        this.startTime = Date.now();
        this.endTime = null;
    }

    toPipelineStages(stages: PipelineStage[]): PipelineStage[] {
        const stateToStageId: Partial<Record<ExecutionState, PipelineStageId>> = {
            health_checks: "health_checks",
            environment_discovery: "environment_discovery",
            tunnel_creation: "tunnel_creation",
            repository_analysis: "repository_analysis",
            ui_discovery: "ui_discovery",
            dom_summary: "dom_summary",
            playwright_generation: "playwright_generation",
            execution: "execution",
            assertions: "assertions",
            completed: "completed",
        };

        return stages.map((stage) => {
            if (stage.id === stateToStageId[this.currentState]) {
                return { ...stage, status: "active" as const };
            }
            
            const lastTransition = this.history[this.history.length - 1];
            if (lastTransition && stage.id === stateToStageId[lastTransition.from]) {
                return { ...stage, status: "completed" as const };
            }
            
            if (this.currentState === "failed" && stage.id === stateToStageId[this.currentState]) {
                return { ...stage, status: "failed" as const };
            }
            
            return stage;
        });
    }
}
