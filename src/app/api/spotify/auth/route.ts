import { NextResponse } from 'next/server'

export async function GET() {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000'}/api/spotify/callback`

    if (!clientId) {
        return NextResponse.json({ error: 'Spotify client ID not configured' }, { status: 500 })
    }

    const scope = 'playlist-modify-private playlist-modify-public'
    const authUrl = `https://accounts.spotify.com/authorize?` +
        new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: scope,
            state: 'spotify_auth',
        }).toString()

    return NextResponse.redirect(authUrl)
}
