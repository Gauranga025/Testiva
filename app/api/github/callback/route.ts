import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

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

    // Fetch GitHub user info to get GitHub ID and username
    const userRes = await fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json'
        }
    });

    if (!userRes.ok) {
        const response = NextResponse.redirect(new URL('/workspace?error=github_user_fetch_failed', req.url));
        response.cookies.delete("gh_oauth_state");
        return response;
    }

    const githubUser = await userRes.json();
    const githubId = githubUser.id;
    const githubUsername = githubUser.login;

    // Check if this GitHub account is already connected to another user
    const existingGitHubUser = await db
        .select()
        .from(users)
        .where(eq(users.githubId, githubId));

    if (existingGitHubUser.length > 0) {
        // GitHub account is already connected to another user
        const response = NextResponse.redirect(
            new URL('/workspace?error=github_account_already_connected', req.url)
        );
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

    // Find or create user in database and update GitHub token and user info
    const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

    if (existingUsers.length === 0) {
        await db.insert(users).values({
            email: email,
            name: user.firstName || user.username || 'User',
            githubToken: token,
            githubUsername: githubUsername,
            githubId: githubId,
        });
    } else {
        await db
            .update(users)
            .set({ 
                githubToken: token,
                githubUsername: githubUsername,
                githubId: githubId,
            })
            .where(eq(users.email, email));
    }

    const response = NextResponse.redirect(
        new URL("/workspace", req.url)
    );

    response.cookies.delete("gh_oauth_state");

    return response;
}