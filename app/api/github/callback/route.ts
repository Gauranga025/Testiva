import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const cookieState = req.cookies.get("gh_oauth_state")?.value;

    if (!state || !cookieState || state !== cookieState) {
        const response = NextResponse.redirect(new URL('/workspace?error=invalid_state', req.url));
        response.cookies.delete("gh_oauth_state");
        return response;
    }

    if (!code) {
        const response = NextResponse.redirect(new URL('/workspace?error=missing_code', req.url));
        response.cookies.delete("gh_oauth_state");
        return response;
    }

    const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code
        })
    });

    const data = await res.json();
    const token = data.access_token;

    if (!token) {
        const response = NextResponse.redirect(new URL('/workspace?error=token_exchange_failed', req.url));
        response.cookies.delete("gh_oauth_state");
        return response;
    }

    // Get the authenticated Clerk user
    const user = await currentUser();
    if (!user) {
        const response = NextResponse.redirect(new URL('/workspace?error=no_user', req.url));
        response.cookies.delete("gh_oauth_state");
        return response;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
        const response = NextResponse.redirect(new URL('/workspace?error=no_email', req.url));
        response.cookies.delete("gh_oauth_state");
        return response;
    }

    // Find or create user in database and update GitHub token
    const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

    if (existingUsers.length === 0) {
        await db.insert(users).values({
            email: email,
            name: user.firstName || user.username || 'User',
            githubToken: encrypt(token, process.env.TOKEN_ENCRYPTION_KEY || ''),
        });
    } else {
        await db
            .update(users)
            .set({ githubToken: encrypt(token, process.env.TOKEN_ENCRYPTION_KEY || '') })
            .where(eq(users.email, email));
    }

    const response = NextResponse.redirect(
        new URL("/workspace", req.url)
    );

    response.cookies.delete("gh_oauth_state");

    return response;
}