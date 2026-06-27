export type EnvironmentType = "deployed" | "localhost";

export type TunnelStatus =
    | "idle"
    | "creating"
    | "connected"
    | "closed"
    | "failed";

export type TunnelInfo = {
    status: TunnelStatus;
    localUrl: string;
    publicUrl: string | null;
    provider: "cloudflare" | "ngrok" | null;
    error?: string;
};

export type NavigationItem = {
    text: string;
    href: string | null;
    role: string;
    visible: boolean;
};

export type ButtonInfo = {
    text: string;
    role: string;
    ariaLabel: string | null;
    visible: boolean;
    disabled: boolean;
    testId: string | null;
};

export type FormFieldInfo = {
    name: string | null;
    type: string;
    label: string | null;
    placeholder: string | null;
    required: boolean;
    isEmail: boolean;
    isPassword: boolean;
    isSearch: boolean;
    testId: string | null;
};

export type FormInfo = {
    action: string | null;
    fields: FormFieldInfo[];
    submitButtons: ButtonInfo[];
};

export type HeadingInfo = {
    level: number;
    text: string;
    visible: boolean;
};

export type DialogInfo = {
    role: string;
    title: string | null;
    visible: boolean;
};

export type TabInfo = {
    text: string;
    selected: boolean;
    role: string;
};

export type DropdownInfo = {
    text: string;
    selected: boolean;
    role: string;
    options: string[];
};

export type AccessibilityInfo = {
    role: string;
    ariaLabel: string | null;
    ariaDescribedBy: string | null;
    ariaLive: string | null;
    ariaHidden: boolean;
};

export type LoadingState = {
    present: boolean;
    type: "spinner" | "skeleton" | "progress" | "text" | "none";
    text: string | null;
};

export type ErrorState = {
    present: boolean;
    message: string | null;
    type: "inline" | "banner" | "modal" | "none";
};

export type EmptyState = {
    present: boolean;
    message: string | null;
    actionText: string | null;
};

export type VisibleComponent = {
    tagName: string;
    role: string;
    text: string | null;
    visible: boolean;
    interactive: boolean;
};

export type TableInfo = {
    headers: string[];
    rowCount: number;
    hasPagination: boolean;
    actionButtons: string[];
};

export type CardInfo = {
    title: string | null;
    text: string;
    role: string | null;
};

export type RouteInfo = {
    path: string;
    label: string;
    source: "navigation" | "link" | "redirect";
};

export type LoginDiscovery = {
    pageUrl: string;
    emailField: FormFieldInfo | null;
    usernameField: FormFieldInfo | null;
    passwordField: FormFieldInfo | null;
    submitButton: ButtonInfo | null;
    redirectHint: string | null;
};

export type DomSummary = {
    currentUrl: string;
    finalUrl: string;
    title: string;
    metaDescription: string | null;
    navigation: NavigationItem[];
    buttons: ButtonInfo[];
    forms: FormInfo[];
    headings: HeadingInfo[];
    dialogs: DialogInfo[];
    tabs: TabInfo[];
    dropdowns: DropdownInfo[];
    tables: TableInfo[];
    cards: CardInfo[];
    routes: RouteInfo[];
    loginDiscovery: LoginDiscovery | null;
    accessibility: AccessibilityInfo[];
    loadingStates: LoadingState[];
    errorStates: ErrorState[];
    emptyStates: EmptyState[];
    visibleComponents: VisibleComponent[];
};

export type DiscoveryCacheEntry = {
    cacheKey: string;
    targetUrl: string;
    effectiveUrl: string;
    environmentType: EnvironmentType;
    domSummary: DomSummary;
    discoveredAt: string;
};

export type HealthCheckStatus = "passed" | "failed" | "skipped";

export type HealthCheckItem = {
    id: string;
    label: string;
    status: HealthCheckStatus;
    message: string;
    durationMs: number;
};

export type HealthReport = {
    ok: boolean;
    environmentType: EnvironmentType;
    checks: HealthCheckItem[];
};

export type PipelineStageId =
    | "health_checks"
    | "environment_discovery"
    | "repository_analysis"
    | "tunnel_creation"
    | "ui_discovery"
    | "dom_summary"
    | "playwright_generation"
    | "execution"
    | "assertions"
    | "completed";

export type PipelineStage = {
    id: PipelineStageId;
    label: string;
    status: "pending" | "active" | "completed" | "skipped" | "failed";
};

export type EnvironmentDiscoveryResult = {
    environmentType: EnvironmentType;
    originalUrl: string;
    effectiveUrl: string;
    tunnel: TunnelInfo | null;
};
