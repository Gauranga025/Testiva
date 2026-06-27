import type { PipelineStage, PipelineStageId } from "./types";

const STAGE_DEFINITIONS: Array<{ id: PipelineStageId; label: string }> = [
    { id: "health_checks", label: "Health Checks" },
    { id: "environment_discovery", label: "Environment Discovery" },
    { id: "tunnel_creation", label: "Tunnel Creation" },
    { id: "repository_analysis", label: "Repository Analysis" },
    { id: "ui_discovery", label: "UI Discovery" },
    { id: "dom_summary", label: "DOM Summary" },
    { id: "playwright_generation", label: "Playwright Generation" },
    { id: "execution", label: "Execution" },
    { id: "assertions", label: "Assertions" },
    { id: "completed", label: "Completed" },
];

export function createInitialPipeline(options: {
    skipTunnel: boolean;
    skipUiDiscovery: boolean;
    skipGeneration: boolean;
}): PipelineStage[] {
    return STAGE_DEFINITIONS.map((stage) => {
        let status: PipelineStage["status"] = "pending";

        if (stage.id === "tunnel_creation" && options.skipTunnel) {
            status = "skipped";
        }
        if (
            (stage.id === "ui_discovery" || stage.id === "dom_summary") &&
            options.skipUiDiscovery
        ) {
            status = "skipped";
        }
        if (stage.id === "playwright_generation" && options.skipGeneration) {
            status = "skipped";
        }

        return { ...stage, status };
    });
}

export function markPipelineStage(
    stages: PipelineStage[],
    stageId: PipelineStageId,
    status: PipelineStage["status"]
): PipelineStage[] {
    return stages.map((stage) =>
        stage.id === stageId ? { ...stage, status } : stage
    );
}

export function activatePipelineStage(
    stages: PipelineStage[],
    stageId: PipelineStageId
): PipelineStage[] {
    return stages.map((stage) => {
        if (stage.id === stageId) {
            return { ...stage, status: "active" };
        }
        if (stage.status === "active") {
            return { ...stage, status: "completed" };
        }
        return stage;
    });
}

export function completePipeline(stages: PipelineStage[], success: boolean): PipelineStage[] {
    return stages.map((stage) => {
        if (stage.status === "skipped") return stage;
        if (stage.id === "completed") {
            return { ...stage, status: success ? "completed" : "failed" };
        }
        if (stage.status === "active" || stage.status === "pending") {
            return { ...stage, status: success ? "completed" : stage.status === "active" ? "failed" : stage.status };
        }
        return stage;
    });
}
