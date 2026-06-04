import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest ) {
    const cookieStore = await cookies();
    console.log(
        "TOKEN ROUTE COOKIES:",
        cookieStore.getAll().map(c => c.name)
    );
    const token = cookieStore.get("gh_token")?.value;
    console.log("TOKEN ROUTE VALUE:", token);
    return NextResponse.json({ token:token});
} 