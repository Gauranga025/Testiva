import { NextResponse } from "next/server";

export async function GET() {
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        redirect_uri: process.env.GITHUB_REDIRECT_URI!,
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