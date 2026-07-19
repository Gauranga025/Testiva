import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { repositories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const repoId = searchParams.get("repoId");

        if (!repoId) {
            return NextResponse.json({ error: "repoId is required" }, { status: 400 });
        }

        const repoRecord = await db
            .select()
            .from(repositories)
            .where(eq(repositories.repoId, parseInt(repoId, 10)))
            .limit(1);

        if (repoRecord.length === 0) {
            return NextResponse.json({ error: "Repository not found" }, { status: 404 });
        }

        const repository = repoRecord[0];
        const memoryCache = repository.repositoryMemoryCache;

        if (!memoryCache) {
            return NextResponse.json({
                accessibilityReport: null,
                analyticsData: null,
                message: "No analytics data available yet"
            });
        }

        return NextResponse.json({
            accessibilityReport: memoryCache.accessibilityReport,
            analyticsData: memoryCache.analyticsData,
            repositoryHash: memoryCache.repositoryHash,
            lastUpdated: memoryCache.lastUpdated,
        });
    } catch (error) {
        console.error("[ANALYTICS] Error fetching analytics:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics data" },
            { status: 500 }
        );
    }
}
