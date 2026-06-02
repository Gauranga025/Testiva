import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const cookiesStore = await cookies();
    const token = cookiesStore.get("gh_token")?.value;
    if (!token) {
        return NextResponse.json({ error: "Github token not found" }, { status: 400 });
    }
    const allRespo: any[] = [];
    let page = 1;
    while (true) {
        const res = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json"
            }
        });
        const Respos = await res.json();
        if (Respos.length === 0) {
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