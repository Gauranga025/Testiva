import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ connected: false, error: "Unauthorized" }, { status: 401 });
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
        return NextResponse.json({ connected: false, error: "No email found" }, { status: 400 });
    }

    const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

    if (!userRecord || !userRecord.githubToken) {
        return NextResponse.json({ connected: false });
    }

    return NextResponse.json({ connected: true });
} 