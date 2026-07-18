import { NextResponse } from "next/server";

export async function GET() {
    const state = crypto.randomUUID();

    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
        return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'repo read:user',
        state,
    })

    const response = NextResponse.redirect(
        `https://github.com/login/oauth/authorize?${params}`
    );

    response.cookies.set("gh_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 600, // 10 minutes — short-lived, only needed for the OAuth round trip
        sameSite: "lax",
    });

    return response;
}