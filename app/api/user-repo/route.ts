import { db, repositories, users } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
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

    if (!userRecord) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id, repoId, name, full_name, private_, html_url, description, updated_at, language, default_branch, owner } = await req.json();

    const result = await db.insert(repositories).values({
        id,
        userId: userRecord.id,
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

    if (!userRecord) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await db.select().from(repositories).where(
        eq(repositories.userId, userRecord.id)
    );
    return NextResponse.json(result);
}
    