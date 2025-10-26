import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies();
        const annictToken = cookieStore.get("annict_token")?.value;

        if (!annictToken) {
            return NextResponse.json({
                authenticated: false,
                error: "No annict_token cookie found",
                cookies: cookieStore.getAll().map(c => c.name)
            }, { status: 401 });
        }

        // トークンの有効性をAnnict APIで確認
        try {
            const testRes = await fetch(`https://api.annict.com/v1/me?access_token=${annictToken}`);
            if (!testRes.ok) {
                return NextResponse.json({
                    authenticated: false,
                    error: "Invalid token",
                    status: testRes.status
                }, { status: 401 });
            }

            // 🔴 user_idを取得して返す
            const userData = await testRes.json();
            const userId = userData.username.toString();

            return NextResponse.json({
                authenticated: true,
                user_id: userId  // 🔴 user_idを追加
            });
        } catch (apiError) {
            return NextResponse.json({
                authenticated: false,
                error: "Token validation failed",
                details: apiError
            }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({
            authenticated: false,
            error: "Server error",
            details: error
        }, { status: 500 });
    }
}
