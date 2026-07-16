import { db, users } from "@/db";
import { repositories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest){
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

    const {repoId, targetDomain, globalInstruction} = await req.json();

    // Verify the user owns this repository
    const [repoRecord] = await db
        .select()
        .from(repositories)
        .where(eq(repositories.repoId, repoId))
        .limit(1);

    if (!repoRecord) {
        return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    if (repoRecord.userId !== userRecord.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [existing] = await db
        .select({ targetDomain: repositories.targetDomain })
        .from(repositories)
        .where(eq(repositories.repoId, repoId))
        .limit(1);

    const targetDomainChanged =
        existing?.targetDomain &&
        targetDomain &&
        existing.targetDomain !== targetDomain;

    const result = await db?.update(repositories).set({
        targetDomain : targetDomain,
        globalInstruction : globalInstruction,
        ...(targetDomainChanged ? { uiDiscoveryCache: null } : {}),
    }).where(eq(repositories.repoId,repoId)).returning();

    return NextResponse.json(result);
}