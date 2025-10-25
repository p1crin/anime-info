import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    console.log('Spotify callback received:', {
        hasCode: !!code,
        hasError: !!error,
        state,
        url: request.url
    })

    if (error) {
        console.error('Spotify auth error:', error)
        return NextResponse.redirect(new URL('/works?spotify_error=' + error, request.url))
    }

    if (!code || state !== 'spotify_auth') {
        console.error('Invalid callback params:', { code: !!code, state })
        return NextResponse.redirect(new URL('/works?spotify_error=invalid_request', request.url))
    }

    try {
        const clientId = process.env.SPOTIFY_CLIENT_ID
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
        const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000'}/api/spotify/callback`

        console.log('Using redirect URI:', redirectUri)

        if (!clientId || !clientSecret) {
            throw new Error('Spotify credentials not configured')
        }

        // アクセストークンを取得
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }).toString(),
        })

        console.log('Token request status:', tokenRes.status)

        if (!tokenRes.ok) {
            const errorText = await tokenRes.text()
            console.error('Token request failed:', errorText)
            throw new Error('Failed to get access token')
        }

        const tokenData = await tokenRes.json()
        console.log('Token received successfully')

        // アクセストークンをクッキーに保存（7日間）
        const cookieStore = await cookies()
        cookieStore.set('spotify_access_token', tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: tokenData.expires_in,
        })

        if (tokenData.refresh_token) {
            cookieStore.set('spotify_refresh_token', tokenData.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // 30日
            })
        }

        console.log('Redirecting to works page with success')
        return NextResponse.redirect(new URL('/works?spotify_success=true', request.url))
    } catch (error) {
        console.error('Spotify callback error:', error)
        return NextResponse.redirect(new URL('/works?spotify_error=auth_failed', request.url))
    }
}

