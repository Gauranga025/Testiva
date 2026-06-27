import { db } from "@/db";
import { repositories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest){
    const {repoId, targetDomain, globalInstruction} = await req.json();

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