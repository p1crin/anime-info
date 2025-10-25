import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

    const tokenRes = await fetch("https://annict.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: process.env.ANNICT_CLIENT_ID!,
            client_secret: process.env.ANNICT_CLIENT_SECRET!,
            redirect_uri: process.env.ANNICT_REDIRECT_URI!,
            code,
        }),
    });

    const data = await tokenRes.json();

    // Cookieに保存（httpOnly）し、/works へリダイレクト
    const res = NextResponse.redirect(new URL('/works', req.url));
    res.cookies.set("annict_token", data.access_token, { path: "/", maxAge: 60 * 60 * 24 * 7, httpOnly: true });
    return res;
}
