"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TestCase } from "./UserRepoList";
import {
    Play,
    CheckCircle2,
    XCircle,
    Loader2,
    Terminal,
    ExternalLink,
    Globe,
    Code,
    PlayCircle,
    ChevronRight,
    Sparkles,
    Database,
    SlidersHorizontal,
    ChevronDown,
    ChevronUp,
    Clock,
} from "lucide-react";
import axios from "axios";
import type { PipelineStage, TunnelInfo } from "@/lib/execution/types";
import { detectEnvironmentType, normalizeBaseUrl } from "@/lib/execution/environment-utils";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    testCases: TestCase[];
    repository: {
        targetDomain?: string | null;
        websiteUrl?: string | null;
        fullName?: string;
    } | null;
    onExecutionComplete?: () => void;
};

type RunStatus =
    | "idle"
    | "queued"
    | "generating"
    | "running"
    | "passed"
    | "failed"
    | "gemini_error";

type RunResult = {
    testCaseId: number;
    status: RunStatus;
    stage: string;
    logs: string[];
    error?: string;
    sessionId?: string;
    sessionUrl?: string;
    recordingUrl?: string;
    browserbaseScript?: string;
    startedAt?: number;
    finishedAt?: number;
    pipelineStages?: PipelineStage[];
    tunnel?: TunnelInfo | null;
};

function formatRuntime(startedAt?: number, finishedAt?: number): string {
    if (!startedAt) return "—";
    const end = finishedAt ?? Date.now();
    const seconds = Math.max(0, Math.round((end - startedAt) / 1000));
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

export default function TestExecutionModal({
    isOpen,
    onClose,
    testCases,
    repository,
    onExecutionComplete,
}: Props) {
    const [baseUrl, setBaseUrl] = useState("http://localhost:3000");
    const [currentIdx, setCurrentIdx] = useState<number>(-1);
    const [isExecuting, setIsExecuting] = useState(false);
    const [results, setResults] = useState<Record<number, RunResult>>({});
    const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);
    const [executionMode, setExecutionMode] = useState<"cache" | "generate">("cache");
    const [customPrompt, setCustomPrompt] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const [runtimeTick, setRuntimeTick] = useState(0);
    const [useLocalhost, setUseLocalhost] = useState(true);
    const [refreshDiscovery, setRefreshDiscovery] = useState(false);

    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!isOpen || testCases.length === 0) return;

        const initial: Record<number, RunResult> = {};
        testCases.forEach((tc) => {
            const tcStatus = tc.status;
            const tcLogs = tc.logs;
            const hasPreviousLogs = Array.isArray(tcLogs) && tcLogs.length > 0;
            const terminal =
                tcStatus === "passed" ||
                tcStatus === "failed" ||
                tcStatus === "gemini_error";

            initial[tc.id] = {
                testCaseId: tc.id,
                status: terminal ? (tcStatus as RunStatus) : "idle",
                stage: terminal ? "Complete" : "Waiting",
                logs: hasPreviousLogs ? tcLogs! : ["[SYSTEM] Waiting to run..."],
                browserbaseScript: tc.browserbaseScript || undefined,
                sessionId: tc.sessionId,
                sessionUrl: tc.sessionUrl,
                recordingUrl: tc.recordingUrl,
            };
        });

        setResults(initial);
        setSelectedDetailId(testCases[0].id);
        setCurrentIdx(-1);
        setIsExecuting(false);
        setCustomPrompt("");
        setBaseUrl(
            repository?.targetDomain ||
                repository?.websiteUrl ||
                "http://localhost:3000"
        );

        const initialUrl =
            repository?.targetDomain ||
            repository?.websiteUrl ||
            "http://localhost:3000";
        setUseLocalhost(detectEnvironmentType(normalizeBaseUrl(initialUrl)) === "localhost");
        setRefreshDiscovery(false);

        const hasMissingScript = testCases.some((tc) => !tc.browserbaseScript);
        setExecutionMode(hasMissingScript ? "generate" : "cache");
    }, [isOpen, testCases, repository]);

    useEffect(() => {
        if (!isExecuting) return;
        const interval = setInterval(() => setRuntimeTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, [isExecuting]);

    useEffect(() => {
        if (!isExecuting || currentIdx < 0 || currentIdx >= testCases.length) {
            if (currentIdx >= testCases.length && isExecuting) {
                setIsExecuting(false);
                onExecutionComplete?.();
            }
            return;
        }

        let cancelled = false;
        const controller = new AbortController();
        abortRef.current = controller;

        const runTest = async () => {
            const currentTestCase = testCases[currentIdx];
            const tcId = currentTestCase.id;
            const startedAt = Date.now();

            setSelectedDetailId(tcId);

            const isRegenerating =
                executionMode === "generate" || !results[tcId]?.browserbaseScript;

            setResults((prev) => ({
                ...prev,
                [tcId]: {
                    ...prev[tcId],
                    status: isRegenerating ? "generating" : "running",
                    stage: isRegenerating
                        ? "Environment & UI discovery"
                        : "Browserbase execution",
                    startedAt,
                    finishedAt: undefined,
                    pipelineStages: undefined,
                    tunnel: null,
                    logs: [
                        isRegenerating
                            ? "[ENVIRONMENT] Starting environment discovery pipeline..."
                            : "[SYSTEM] Found cached script in database, starting Browserbase session...",
                    ],
                },
            }));

            try {
                const res = await axios.post(
                    "/api/test-cases/run",
                    {
                        testCaseId: tcId,
                        baseUrl: baseUrl.trim(),
                        mode: executionMode,
                        customPrompt: customPrompt.trim(),
                        useLocalhost,
                        refreshDiscovery,
                    },
                    { signal: controller.signal }
                );

                const data = res.data;
                const finishedAt = Date.now();

                setResults((prev) => ({
                    ...prev,
                    [tcId]: {
                        testCaseId: tcId,
                        status: normalizeStatus(data.status),
                        stage: data.success ? "Completed" : "Failed",
                        logs: data.logs?.length
                            ? data.logs
                            : [...(prev[tcId]?.logs || []), "[SYSTEM] Execution finished"],
                        browserbaseScript: data.browserbaseScript ?? prev[tcId]?.browserbaseScript,
                        sessionId: data.sessionId,
                        sessionUrl: data.sessionUrl,
                        recordingUrl: data.recordingUrl ?? data.sessionUrl,
                        error: data.error,
                        startedAt,
                        finishedAt,
                        pipelineStages: data.stages,
                        tunnel: data.tunnel ?? null,
                    },
                }));
            } catch (err: unknown) {
                if (axios.isCancel(err)) {
                    setResults((prev) => ({
                        ...prev,
                        [tcId]: {
                            ...prev[tcId],
                            status: "failed",
                            stage: "Stopped",
                            finishedAt: Date.now(),
                            error: "Execution stopped by user",
                            logs: [
                                ...(prev[tcId]?.logs || []),
                                "[SYSTEM] Execution stopped by user",
                            ],
                        },
                    }));
                } else if (axios.isAxiosError(err)) {
                    const data = err.response?.data;
                    const errMsg =
                        data?.error || err.message || "Execution failed";
                    const status = normalizeStatus(data?.status) || "failed";

                    setResults((prev) => ({
                        ...prev,
                        [tcId]: {
                            ...prev[tcId],
                            status,
                            stage: status === "gemini_error" ? "AI generation failed" : "Failed",
                            finishedAt: Date.now(),
                            error: errMsg,
                            logs: data?.logs?.length
                                ? data.logs
                                : [
                                      ...(prev[tcId]?.logs || []),
                                      `[ERROR] ${errMsg}`,
                                  ],
                            browserbaseScript:
                                data?.browserbaseScript ?? prev[tcId]?.browserbaseScript,
                            sessionId: data?.sessionId,
                            sessionUrl: data?.sessionUrl,
                            recordingUrl: data?.recordingUrl ?? data?.sessionUrl,
                            pipelineStages: data?.stages,
                            tunnel: data?.tunnel ?? null,
                        },
                    }));
                } else {
                    const errMsg =
                        err instanceof Error ? err.message : "Execution failed";
                    setResults((prev) => ({
                        ...prev,
                        [tcId]: {
                            ...prev[tcId],
                            status: "failed",
                            stage: "Failed",
                            finishedAt: Date.now(),
                            error: errMsg,
                            logs: [...(prev[tcId]?.logs || []), `[ERROR] ${errMsg}`],
                        },
                    }));
                }
            } finally {
                abortRef.current = null;
                if (!cancelled && !controller.signal.aborted) {
                    setCurrentIdx((prev) => prev + 1);
                }
            }
        };

        runTest();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [
        isExecuting,
        currentIdx,
        testCases,
        baseUrl,
        executionMode,
        customPrompt,
        useLocalhost,
        refreshDiscovery,
        onExecutionComplete,
    ]);

    const startExecution = () => {
        const resetResults: Record<number, RunResult> = {};
        testCases.forEach((tc) => {
            resetResults[tc.id] = {
                testCaseId: tc.id,
                status: "queued",
                stage: "Queued",
                logs: ["[SYSTEM] Queued for execution..."],
                browserbaseScript: tc.browserbaseScript || undefined,
            };
        });
        setResults(resetResults);
        setIsExecuting(true);
        setCurrentIdx(0);
        setSelectedDetailId(testCases[0].id);
    };

    const stopExecution = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setIsExecuting(false);
        setCurrentIdx(-1);
    }, []);

    const handleClose = () => {
        if (isExecuting) stopExecution();
        onClose();
    };

    const currentSelectedResult = selectedDetailId ? results[selectedDetailId] : null;
    const currentSelectedTestCase = testCases.find((tc) => tc.id === selectedDetailId);

    void runtimeTick;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-6 gap-4 bg-white rounded-2xl shadow-2xl border overflow-hidden select-none">
                <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between shrink-0">
                    <div>
                        <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <PlayCircle className="text-primary h-6 w-6" />
                            Browserbase Cloud Test Runner
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 text-sm">
                            Run automation scripts in the cloud with live logs and session recordings.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex flex-col bg-gray-50 p-4 rounded-2xl border border-gray-200/80 gap-3 shrink-0">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-primary" /> Target Website URL
                            </label>
                            <Input
                                placeholder="e.g. http://localhost:3000 or https://myapp.vercel.app"
                                value={baseUrl}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    setBaseUrl(next);
                                    setUseLocalhost(
                                        detectEnvironmentType(normalizeBaseUrl(next)) === "localhost"
                                    );
                                }}
                                disabled={isExecuting}
                                className="bg-white border-gray-300 font-mono text-sm shadow-xs h-10"
                            />
                            <label className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                <input
                                    type="checkbox"
                                    checked={useLocalhost}
                                    onChange={(e) => {
                                        setUseLocalhost(e.target.checked);
                                        if (e.target.checked && !baseUrl.includes("localhost")) {
                                            setBaseUrl("http://localhost:3000");
                                        }
                                    }}
                                    disabled={isExecuting}
                                    className="rounded border-gray-300"
                                />
                                Run against Localhost (auto tunnel for Browserbase)
                            </label>
                        </div>
                        <div className="flex gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowOptions(!showOptions)}
                                className={`h-10 px-4 font-medium text-xs gap-1.5 transition-colors border-gray-300 ${showOptions ? "bg-primary/5 text-primary border-primary/30" : ""}`}
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                Execution Options
                                {showOptions ? (
                                    <ChevronUp className="h-3 w-3 ml-0.5" />
                                ) : (
                                    <ChevronDown className="h-3 w-3 ml-0.5" />
                                )}
                            </Button>
                            {!isExecuting ? (
                                <Button
                                    onClick={startExecution}
                                    className="h-10 bg-primary hover:bg-primary/95 text-white shadow-md font-medium px-6 gap-2"
                                >
                                    <Play className="h-4 w-4 fill-white" /> Start Execution
                                </Button>
                            ) : (
                                <Button
                                    onClick={stopExecution}
                                    variant="destructive"
                                    className="h-10 px-6 font-medium gap-2"
                                >
                                    <Loader2 className="h-4 w-4 animate-spin" /> Stop Runner
                                </Button>
                            )}
                        </div>
                    </div>

                    {showOptions && (
                        <div className="pt-3 border-t border-gray-200/60 grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="md:col-span-1 space-y-1.5">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Run Mode
                                </span>
                                <div className="grid grid-cols-2 bg-gray-200/60 p-1 rounded-lg border border-gray-200">
                                    <button
                                        type="button"
                                        disabled={isExecuting}
                                        onClick={() => setExecutionMode("cache")}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            executionMode === "cache"
                                                ? "bg-white text-gray-800 shadow-xs"
                                                : "text-gray-500 hover:text-gray-700"
                                        } disabled:opacity-50`}
                                    >
                                        <Database className="h-3.5 w-3.5" /> Run Cached
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isExecuting}
                                        onClick={() => setExecutionMode("generate")}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            executionMode === "generate"
                                                ? "bg-white text-gray-800 shadow-xs"
                                                : "text-gray-500 hover:text-gray-700"
                                        } disabled:opacity-50`}
                                    >
                                        <Sparkles className="h-3.5 w-3.5 text-yellow-600" /> AI Regenerate
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-1.5">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Custom Run Instructions
                                </span>
                                <textarea
                                    placeholder="e.g. Wait for network idle after login before asserting..."
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    disabled={isExecuting || executionMode === "cache"}
                                    rows={1.5}
                                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:bg-gray-100 shadow-xs resize-none"
                                />
                                <label className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                                    <input
                                        type="checkbox"
                                        checked={refreshDiscovery}
                                        onChange={(e) => setRefreshDiscovery(e.target.checked)}
                                        disabled={isExecuting}
                                        className="rounded border-gray-300"
                                    />
                                    Refresh UI discovery cache before run
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 overflow-hidden">
                    <div className="md:col-span-1 border rounded-xl overflow-y-auto bg-gray-50/50 p-3 flex flex-col gap-2 shadow-xs">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">
                            Execution Queue
                        </h3>
                        {testCases.map((tc, index) => {
                            const res = results[tc.id];
                            const isActive = selectedDetailId === tc.id;
                            const isRunningNow = currentIdx === index && isExecuting;

                            return (
                                <div
                                    key={tc.id}
                                    onClick={() => setSelectedDetailId(tc.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        isActive
                                            ? "bg-white border-primary shadow-sm ring-1 ring-primary/20"
                                            : "bg-white border-gray-200 hover:border-gray-300 shadow-xs"
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h4 className="font-semibold text-sm text-gray-800 line-clamp-1">
                                            {tc.title}
                                        </h4>
                                        <ChevronRight
                                            className={`h-4 w-4 text-gray-400 transition-transform ${isActive ? "rotate-90 text-primary" : ""}`}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-1 mb-2.5">
                                        {tc.description}
                                    </p>
                                    <div className="flex justify-between items-center">
                                        <Badge variant="outline" className="text-[10px] font-mono capitalize">
                                            {tc.type}
                                        </Badge>
                                        <StatusBadge
                                            status={res?.status || "idle"}
                                            isRunning={isRunningNow}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="md:col-span-2 border rounded-xl flex flex-col bg-white overflow-hidden shadow-sm">
                        {currentSelectedTestCase ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-4 border-b bg-gray-50/50 flex justify-between items-start gap-4 shrink-0">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-base text-gray-800">
                                            {currentSelectedTestCase.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Expected: {currentSelectedTestCase.expectedResult}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <Badge variant="outline" className="text-[10px]">
                                                Stage: {currentSelectedResult?.stage || "—"}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] gap-1">
                                                <Clock className="h-3 w-3" />
                                                Runtime:{" "}
                                                {formatRuntime(
                                                    currentSelectedResult?.startedAt,
                                                    currentSelectedResult?.finishedAt
                                                )}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        {currentSelectedResult?.sessionUrl && (
                                            <Button
                                                onClick={() =>
                                                    window.open(
                                                        currentSelectedResult.sessionUrl,
                                                        "_blank"
                                                    )
                                                }
                                                variant="outline"
                                                size="sm"
                                                className="font-medium text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5 shadow-xs"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" /> Session
                                            </Button>
                                        )}
                                        {currentSelectedResult?.recordingUrl && (
                                            <Button
                                                onClick={() =>
                                                    window.open(
                                                        currentSelectedResult.recordingUrl,
                                                        "_blank"
                                                    )
                                                }
                                                variant="outline"
                                                size="sm"
                                                className="font-medium text-xs gap-1 shadow-xs"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" /> Recording
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
                                    <PipelineProgress
                                        stages={currentSelectedResult?.pipelineStages}
                                        isRunning={
                                            isExecuting &&
                                            selectedDetailId === currentSelectedTestCase.id &&
                                            currentIdx ===
                                                testCases.findIndex(
                                                    (t) => t.id === currentSelectedTestCase.id
                                                )
                                        }
                                    />

                                    {(useLocalhost || currentSelectedResult?.tunnel) && (
                                        <TunnelStatusPanel tunnel={currentSelectedResult?.tunnel} />
                                    )}

                                    {currentSelectedResult?.browserbaseScript && (
                                        <div className="rounded-lg border overflow-hidden">
                                            <div className="bg-gray-100 px-3.5 py-2 border-b flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                                    <Code className="h-3.5 w-3.5 text-primary" />{" "}
                                                    Generated Playwright Code
                                                </span>
                                            </div>
                                            <pre className="p-3 bg-gray-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-36">
                                                {currentSelectedResult.browserbaseScript}
                                            </pre>
                                        </div>
                                    )}

                                    <div className="flex-1 flex flex-col rounded-lg border overflow-hidden min-h-48">
                                        <div className="bg-gray-950 text-gray-200 px-3.5 py-2.5 border-b border-gray-800 flex items-center justify-between shrink-0 font-mono">
                                            <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-400">
                                                <Terminal className="h-3.5 w-3.5" /> Live Execution Logs
                                            </span>
                                            <StatusBadge
                                                status={currentSelectedResult?.status || "idle"}
                                                isRunning={
                                                    isExecuting &&
                                                    selectedDetailId === currentSelectedTestCase.id &&
                                                    currentIdx ===
                                                        testCases.findIndex(
                                                            (t) => t.id === currentSelectedTestCase.id
                                                        )
                                                }
                                            />
                                        </div>
                                        <div className="flex-1 p-3 bg-gray-950 font-mono text-[11px] text-gray-300 overflow-y-auto flex flex-col gap-1.5 select-text">
                                            {currentSelectedResult?.logs.map((log, lIdx) => (
                                                <LogLine key={lIdx} log={log} />
                                            ))}
                                            {currentSelectedResult?.error && (
                                                <div className="text-red-400 font-bold mt-2 pt-2 border-t border-gray-800">
                                                    Error: {currentSelectedResult.error}
                                                </div>
                                            )}
                                            {!currentSelectedResult?.logs.length && (
                                                <span className="text-gray-500">
                                                    No logs yet...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <Terminal className="h-12 w-12 text-gray-300 mb-3" />
                                <h3 className="font-bold text-gray-700 text-lg">
                                    No Test Case Selected
                                </h3>
                                <p className="text-sm text-gray-400 mt-1 max-w-sm">
                                    Choose a test case from the queue to inspect logs and results.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t pt-4 flex justify-end gap-3 shrink-0">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="h-10 font-medium px-5"
                    >
                        Close & Refresh Status
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function normalizeStatus(status?: string): RunStatus {
    if (
        status === "passed" ||
        status === "failed" ||
        status === "running" ||
        status === "generating" ||
        status === "gemini_error" ||
        status === "queued" ||
        status === "idle"
    ) {
        return status;
    }
    return "failed";
}

function LogLine({ log }: { log: string }) {
    let className = "leading-relaxed whitespace-pre-wrap";
    if (log.startsWith("[SYSTEM]")) className += " text-blue-400";
    else if (log.startsWith("[AI]")) className += " text-cyan-400";
    else if (log.startsWith("[HEALTH]")) className += " text-teal-400";
    else if (log.startsWith("[ENVIRONMENT]")) className += " text-sky-400";
    else if (log.startsWith("[TUNNEL]")) className += " text-indigo-400";
    else if (log.startsWith("[DISCOVERY]")) className += " text-violet-400";
    else if (log.startsWith("[BROWSER]")) className += " text-purple-400";
    else if (log.startsWith("[PLAYWRIGHT]")) className += " text-emerald-300";
    else if (log.startsWith("[NETWORK]")) className += " text-amber-400";
    else if (log.startsWith("[ASSERT]")) className += " text-orange-400";
    else if (log.startsWith("[ERROR]")) className += " text-rose-400 font-semibold";

    return <div className={className}>{log}</div>;
}

const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
    { id: "health_checks", label: "Health Checks", status: "pending" },
    { id: "environment_discovery", label: "Environment Discovery", status: "pending" },
    { id: "tunnel_creation", label: "Tunnel Creation", status: "pending" },
    { id: "repository_analysis", label: "Repository Analysis", status: "pending" },
    { id: "ui_discovery", label: "UI Discovery", status: "pending" },
    { id: "dom_summary", label: "DOM Summary", status: "pending" },
    { id: "playwright_generation", label: "Playwright Generation", status: "pending" },
    { id: "execution", label: "Execution", status: "pending" },
    { id: "assertions", label: "Assertions", status: "pending" },
    { id: "completed", label: "Completed", status: "pending" },
];

function PipelineProgress({
    stages,
    isRunning,
}: {
    stages?: PipelineStage[];
    isRunning: boolean;
}) {
    const displayStages = stages?.length ? stages : DEFAULT_PIPELINE_STAGES;

    return (
        <div className="rounded-lg border overflow-hidden">
            <div className="bg-gray-100 px-3.5 py-2 border-b">
                <span className="text-xs font-semibold text-gray-600">Execution Pipeline</span>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white">
                {displayStages.map((stage) => (
                    <div
                        key={stage.id}
                        className={`flex items-center gap-2 text-[11px] rounded-md px-2 py-1.5 border ${
                            stage.status === "completed"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : stage.status === "active" || (isRunning && !stages && stage.id === "health_checks")
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : stage.status === "failed"
                                    ? "bg-rose-50 border-rose-200 text-rose-800"
                                    : stage.status === "skipped"
                                      ? "bg-gray-50 border-gray-200 text-gray-400 line-through"
                                      : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}
                    >
                        {stage.status === "completed" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        ) : stage.status === "failed" ? (
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                        ) : stage.status === "active" || (isRunning && !stages && stage.id === "health_checks") ? (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                        ) : (
                            <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300" />
                        )}
                        {stage.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TunnelStatusPanel({ tunnel }: { tunnel?: TunnelInfo | null }) {
    const status = tunnel?.status ?? "idle";
    const statusLabel =
        status === "connected"
            ? "Tunnel Connected"
            : status === "closed"
              ? "Tunnel Closed"
              : status === "creating"
                ? "Creating Tunnel..."
                : status === "failed"
                  ? "Tunnel Failed"
                  : "Awaiting tunnel";

    return (
        <div className="rounded-lg border overflow-hidden">
            <div className="bg-indigo-50 px-3.5 py-2 border-b border-indigo-100">
                <span className="text-xs font-semibold text-indigo-800">Tunnel Status</span>
            </div>
            <div className="p-3 bg-white text-xs space-y-1.5 font-mono">
                <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Status</span>
                    <span className="text-indigo-700 font-semibold">{statusLabel}</span>
                </div>
                {tunnel?.localUrl && (
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Local URL</span>
                        <span className="text-gray-800 truncate">{tunnel.localUrl}</span>
                    </div>
                )}
                {tunnel?.publicUrl && (
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Tunnel URL</span>
                        <span className="text-gray-800 truncate">{tunnel.publicUrl}</span>
                    </div>
                )}
                {tunnel?.provider && (
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Provider</span>
                        <span className="text-gray-800 capitalize">{tunnel.provider}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({
    status,
    isRunning,
}: {
    status: RunStatus;
    isRunning: boolean;
}) {
    if (isRunning) {
        return (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none flex gap-1 items-center animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> Running
            </Badge>
        );
    }

    switch (status) {
        case "generating":
            return (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none flex gap-1 items-center">
                    <Loader2 className="h-3 w-3 animate-spin" /> Generating
                </Badge>
            );
        case "passed":
            return (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none flex gap-1 items-center">
                    <CheckCircle2 className="h-3 w-3" /> Passed
                </Badge>
            );
        case "failed":
            return (
                <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none flex gap-1 items-center">
                    <XCircle className="h-3 w-3" /> Failed
                </Badge>
            );
        case "gemini_error":
            return (
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none flex gap-1 items-center">
                    <XCircle className="h-3 w-3" /> AI Error
                </Badge>
            );
        case "queued":
            return (
                <Badge variant="secondary" className="text-gray-600">
                    Queued
                </Badge>
            );
        case "idle":
        default:
            return (
                <Badge variant="secondary" className="text-gray-600">
                    Idle
                </Badge>
            );
    }
}
