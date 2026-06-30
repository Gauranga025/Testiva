import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const cookieState = req.cookies.get("gh_oauth_state")?.value;

    if (!state || !cookieState || state !== cookieState) {
        const response = NextResponse.redirect(new URL('/workspace?error=invalid_state', req.url));
        response.cookies.delete("gh_oauth_state");
        return response;
    }

    if(!code) {
        const response = NextResponse.redirect(new URL('/workspace?error=missing_code', req.url));
        response.cookies.delete("gh_oauth_state");
        return response;
    }

    const res = await fetch ('https://github.com/login/oauth/access_token',{
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

    if(!token) {
        const response = NextResponse.redirect(new URL('/workspace?error=token_exchange-failed', req.url));
        response.cookies.delete("gh_oauth_state");
        return response;
    }

    const response = NextResponse.redirect(
    new URL("/workspace", req.url)
  );

  //Store the token in a cookie
  response.cookies.set("gh_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, 
    // 7 days
    sameSite: "lax",
  });

  response.cookies.delete("gh_oauth_state");

  return response;
}