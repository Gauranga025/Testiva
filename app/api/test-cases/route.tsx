import { db, repositories, users } from "@/db";
import { eq } from "drizzle-orm";
import { TestCasesTable } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

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

  const searchParams = new URL(req.url).searchParams;
  const repoId = searchParams.get("repoId");

  if (!repoId) {
    return NextResponse.json(
      {
        error: "repoId is required",
      },
      { status: 400 }
    );
  }

  const repoIdNum = parseInt(repoId, 10);

  // Verify the user owns this repository
  const [repoRecord] = await db
    .select()
    .from(repositories)
    .where(eq(repositories.repoId, repoIdNum))
    .limit(1);

  if (!repoRecord) {
    return NextResponse.json({ error: "Repository not found" }, { status: 404 });
  }

  if (repoRecord.userId !== userRecord.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db
    .select()
    .from(TestCasesTable)
    .where(eq(TestCasesTable.repoId, repoIdNum));

  return NextResponse.json(result);
}