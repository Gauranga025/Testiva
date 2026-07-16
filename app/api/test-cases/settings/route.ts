import { db, repositories, users } from "@/db";
import { TestCasesTable } from "@/db/schema";
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

    const { title, description, targetRoute, expectedResult, testCaseId } = await req.json();

    // Verify the user owns this test case via its repository
    const [testCase] = await db
        .select()
        .from(TestCasesTable)
        .where(eq(TestCasesTable.id, testCaseId))
        .limit(1);

    if (!testCase) {
        return NextResponse.json({ error: "Test case not found" }, { status: 404 });
    }

    // Verify ownership through the repository
    if (!testCase.repoId) {
        return NextResponse.json({ error: "Test case has no repository" }, { status: 400 });
    }

    const [repoRecord] = await db
        .select()
        .from(repositories)
        .where(eq(repositories.repoId, testCase.repoId))
        .limit(1);

    if (!repoRecord) {
        return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    if (repoRecord.userId !== userRecord.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await db.update(TestCasesTable)
        .set({
            title,
            description,
            targetRoute,
            expectedResult,
        })
        .where(eq(TestCasesTable.id, testCaseId))
        .returning();

    return NextResponse.json(result[0]);
}