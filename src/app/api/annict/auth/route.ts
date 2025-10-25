import { NextResponse } from "next/server";

export async function GET() {
    const clientId = process.env.ANNICT_CLIENT_ID;
    const redirectUri = process.env.ANNICT_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            {
                error: "Missing environment variables",
                clientId: !!clientId,
                redirectUri: !!redirectUri
            },
            { status: 500 }
        );
    }

    const redirectUrl = new URL("https://annict.com/oauth/authorize");
    redirectUrl.searchParams.set("client_id", clientId);
    redirectUrl.searchParams.set("response_type", "code");
    redirectUrl.searchParams.set("redirect_uri", redirectUri);
    redirectUrl.searchParams.set("scope", "read");

    return NextResponse.redirect(redirectUrl.toString());
}
