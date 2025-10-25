import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('spotify_access_token')?.value

        if (!accessToken) {
            return NextResponse.json({
                error: 'Spotify認証が必要です。Spotifyアカウントでログインしてください。'
            }, { status: 401 })
        }

        const { name, description, trackUrls } = await request.json()

        if (!name || !trackUrls || !Array.isArray(trackUrls)) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
        }

        // プレイリスト作成
        const createPlaylistRes = await fetch('https://api.spotify.com/v1/me/playlists', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                description: description || '',
                public: false,
            }),
        })

        if (!createPlaylistRes.ok) {
            const errorData = await createPlaylistRes.json()
            throw new Error(`プレイリスト作成に失敗しました: ${errorData.error?.message || createPlaylistRes.statusText}`)
        }

        const playlist = await createPlaylistRes.json()

        // トラックIDを抽出してSpotify URIに変換
        const trackUris = trackUrls
            .map((url: string) => {
                const match = url.match(/spotify:track:([a-zA-Z0-9]+)/) || url.match(/track\/([a-zA-Z0-9]+)/)
                return match ? `spotify:track:${match[1]}` : null
            })
            .filter(Boolean)

        if (trackUris.length === 0) {
            return NextResponse.json({
                error: '有効なSpotifyトラックURLが見つかりませんでした',
                playlist: playlist.external_urls.spotify
            }, { status: 400 })
        }

        // トラックを100個ずつに分割して追加（Spotify APIの制限）
        const batchSize = 100
        let totalAdded = 0

        for (let i = 0; i < trackUris.length; i += batchSize) {
            const batch = trackUris.slice(i, i + batchSize)

            const addTracksRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uris: batch,
                }),
            })

            if (!addTracksRes.ok) {
                const errorData = await addTracksRes.json()
                console.error(`Failed to add tracks batch ${Math.floor(i / batchSize) + 1}:`, errorData)
                // バッチ単位で失敗しても処理を続行
                continue
            }

            totalAdded += batch.length

            // APIレート制限を考慮して少し待機
            if (i + batchSize < trackUris.length) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }

        return NextResponse.json({
            success: true,
            playlistUrl: playlist.external_urls.spotify,
            playlistName: playlist.name,
            trackCount: totalAdded,
            requestedCount: trackUris.length,
        })

    } catch (error: any) {
        console.error('Playlist creation error:', error)
        return NextResponse.json({
            error: error.message || 'プレイリスト作成に失敗しました'
        }, { status: 500 })
    }
}
