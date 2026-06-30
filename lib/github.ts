/**
 * Shared GitHub API helpers.
 *
 * Used by both app/api/generate-test-cases/route.ts and
 * app/api/test-cases/run/route.ts so the fetch/filter logic for repo trees
 * and file contents isn't duplicated a third time.
 */

const ALLOWED_EXTENSIONS = ["js", "jsx", "ts", "tsx", "json", "md"];

const IMPORTANT_FILES = [
    "package.json",
    "next.config",
    "middleware",
    "app/",
    "pages/",
    "components/",
    "src/",
    "lib/",
    "utils/",
    "actions/",
    "api/",
    "server/",
];

const IGNORE_PATHS = [
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git",
    "coverage",
    "public",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "png",
    "jpg",
    "jpeg",
    "svg",
    "webp",
    "mp4",
    "mov",
];

export function isUsefulFile(path: string) {
    const isIgnored = IGNORE_PATHS.some((item) => path.includes(item));

    const isAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => path.endsWith(ext));

    const isImportantPath = IMPORTANT_FILES.some((item) => path.includes(item));

    return !isIgnored && isAllowedExtension && isImportantPath;
}

export async function getRepoTree({
    owner,
    repo,
    branch,
    githubToken,
}: {
    owner: string;
    repo: string;
    branch: string;
    githubToken: string;
}) {
    const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        {
            headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: "application/vnd.github+json",
            },
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch GitHub repo tree");
    }

    const data = await res.json();

    return data.tree
        .filter((item: any) => item.type === "blob")
        .filter((item: any) => isUsefulFile(item.path))
        .slice(0, 25);
}

export async function readGithubFile({
    owner,
    repo,
    path,
    branch,
    githubToken,
}: {
    owner: string;
    repo: string;
    path: string;
    branch: string;
    githubToken: string;
}) {
    const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        {
            headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: "application/vnd.github+json",
            },
        }
    );

    if (!res.ok) {
        return null;
    }

    const data = await res.json();

    if (!data.content) {
        return null;
    }

    const decodedContent = Buffer.from(data.content, "base64").toString("utf-8");

    return {
        path,
        content: decodedContent.slice(0, 5000),
    };
}
