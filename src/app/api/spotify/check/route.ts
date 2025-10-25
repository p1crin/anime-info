import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('spotify_access_token')?.value

        if (!accessToken) {
            return NextResponse.json({ authenticated: false })
        }

        // トークンの有効性をチェックするためにユーザー情報を取得
        const res = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        })

        if (res.ok) {
            const userData = await res.json()
            return NextResponse.json({
                authenticated: true,
                user: {
                    id: userData.id,
                    display_name: userData.display_name
                }
            })
        } else {
            return NextResponse.json({ authenticated: false })
        }
    } catch (error) {
        return NextResponse.json({ authenticated: false })
    }
}
