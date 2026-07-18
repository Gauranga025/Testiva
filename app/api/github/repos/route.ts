import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
        return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

    if (!userRecord || !userRecord.githubToken) {
        return NextResponse.json({ error: "GitHub is not connected. Please connect your GitHub account." }, { status: 400 });
    }

    const token = userRecord.githubToken;

    const allRespo: any[] = [];
    let page = 1;
    const MAX_PAGES = 10; // Cap at 1000 repos max

    while (page <= MAX_PAGES) {
        const res = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json"
            }
        });

        // Check for rate limit responses
        if (res.status === 403 || res.status === 429) {
            const resetTime = res.headers.get('X-RateLimit-Reset');
            const retryAfter = res.headers.get('Retry-After');
            const resetMessage = resetTime 
                ? `Rate limit exceeded. Resets at ${new Date(parseInt(resetTime) * 1000).toISOString()}`
                : retryAfter 
                    ? `Rate limit exceeded. Retry after ${retryAfter} seconds`
                    : 'Rate limit exceeded';
            return NextResponse.json({ error: resetMessage }, { status: 429 });
        }

        if (!res.ok) {
            return NextResponse.json({ error: `GitHub API error: ${res.status} ${res.statusText}` }, { status: 500 });
        }

        const Respos = await res.json();
        
        if (!Array.isArray(Respos) || Respos.length === 0) {
            break;
        }
        allRespo.push(...Respos);
        page++;
    }

    const formattedRepos = allRespo.map((r: any) => ({
        id: r.id,
        userId: r.owner.id,
        repoId: r.id,
        name: r.name,
        full_name: r.full_name,
        private_: r.private,
        html_url: r.html_url,
        description: r.description,
        updated_at: r.updated_at,        
        language: r.language,
        default_branch: r.default_branch,
        owner: r.owner.login,
    }));

    return NextResponse.json(formattedRepos);
}