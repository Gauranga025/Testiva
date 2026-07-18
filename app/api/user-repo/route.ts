import { db, repositories } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { id, userId, repoId, name, full_name, private_, html_url, description, updated_at, language, default_branch, owner } = await req.json();

    const result = await db.insert(repositories).values({
        id,
        userId,
        repoId,
        name,
        fullName: full_name,
        private: private_ ? 1 : 0,
        htmlUrl: html_url,
        description,
        language,
        defaultBranch: default_branch,
        owner,
    }).returning();
    return NextResponse.json(result[0]);
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const result = await db.select().from(repositories).where(
        //@ts-ignore
        eq(repositories.userId, userId)
    );
    return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
        return NextResponse.json({ error: "Repository ID is required" }, { status: 400 });
    }

    const result = await db.delete(repositories).where(
        eq(repositories.id, Number(id))
    ).returning();
    
    return NextResponse.json({ success: true, deletedRepo: result[0] });
}
    