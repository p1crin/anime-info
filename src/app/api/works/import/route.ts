import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { parseStringPromise } from 'xml2js'
import stringSimilarity from 'string-similarity'
import { Buffer } from 'node:buffer'
import { progressStatus } from '../status/route' // ★ 進捗ステータスをインポート

// === Syoboiキャッシュ（アプリ実行中のみ保持） ===
const syoboiCache = new Map<string, string>()

// === Spotifyトークンキャッシュ ===
let spotifyTokenCache = {
    token: '',
    expiresAt: 0,
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// === Cloudflare・構文エラーに強い Syoboi取得関数 ===
async function fetchSyoboiData(tid: string): Promise<string | null> {
    if (syoboiCache.has(tid)) {
        console.log(`Cache hit for TID=${tid}`)
        return syoboiCache.get(tid)!
    }

    const syoboiUrl = `http://cal.syoboi.jp/db.php?Command=TitleLookup&TID=${tid}`
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(syoboiUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AnimeSyncBot/1.0)' },
            })
            const text = await res.text()

            // CloudflareブロックやHTML応答を検出
            if (text.startsWith('<!doctype html>') || text.includes('Cloudflare')) {
                throw new Error('Rate limited or access denied by Cloudflare')
            }

            // 不正XML対策
            const safeXmlText = text
                .replace(/&(?!#?\w+;)/g, '&')
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
                .replace(/^\uFEFF/, '')

            const xmlObj = await parseStringPromise(safeXmlText, { explicitArray: false, ignoreAttrs: true })
            const comment = xmlObj?.TitleLookupResponse?.TitleItems?.TitleItem?.Comment?.trim() || ''

            syoboiCache.set(tid, comment)
            return comment
        } catch (err: any) {
            lastError = err
            console.warn(`Attempt ${attempt} failed for TID=${tid}: ${err.message}`)
            const wait = err.message.includes('Cloudflare') ? 10000 : 2000
            console.log(`Waiting ${wait / 1000}s before retry...`)
            await delay(wait)
        }
    }

    console.error(`Failed to fetch Syoboi data for TID=${tid}: ${lastError?.message}`)
    return null
}

function extractThemes(comment: string) {
    const themes = { op: [], ed: [], in: [] } as {
        op: { title: string; artist: string; episode: string }[]
        ed: { title: string; artist: string; episode: string }[]
        in: { title: string; artist: string; episode: string }[]
    }

    const lines = comment.replace(/\r\n/g, '\n').split('\n')
    let currentType: 'op' | 'ed' | 'in' | null = null
    let currentTitle = ''
    let currentArtist = ''
    let currentEpisode = ''

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        const opMatch = line.match(/^\*オープニングテーマ(?:\d*)「([^」]+)」/)
        const edMatch = line.match(/^\*エンディングテーマ(?:\d*)「([^」]+)」/)
        const inMatch = line.match(/^\*挿入歌「([^」]+)」/)

        if (opMatch || edMatch || inMatch) {
            if (currentType && currentTitle) {
                themes[currentType].push({
                    title: currentTitle,
                    artist: currentArtist,
                    episode: currentEpisode,
                })
            }
            currentType = opMatch ? 'op' : edMatch ? 'ed' : 'in'
            currentTitle = (opMatch || edMatch || inMatch)?.[1] || ''
            currentArtist = ''
            currentEpisode = ''
            continue
        }

        if (line.startsWith(':歌')) {
            currentArtist = line.replace(/^:歌[:：]?\s*/, '').trim()
            continue
        }

        if (line.startsWith(':使用話数:')) {
            currentEpisode = line.replace(':使用話数:', '').trim()
            continue
        }

        const nextIsTheme =
            i + 1 < lines.length &&
            lines[i + 1].match(/^\*(オープニングテーマ|エンディングテーマ|挿入歌)/)
        if (nextIsTheme || i === lines.length - 1) {
            if (currentType && currentTitle) {
                themes[currentType].push({
                    title: currentTitle,
                    artist: currentArtist,
                    episode: currentEpisode,
                })
                currentType = null
                currentTitle = ''
                currentArtist = ''
                currentEpisode = ''
            }
        }
    }

    return themes
}

// === Spotify API 検索改善ロジック ===

/**
 * アーティスト名から冗長な情報 (CVや声優名など) を削除し、検索に適した形式にクリーニングする
 */
function cleanArtistName(artistString: string): string {
    if (!artistString) return '';

    let cleaned = artistString;

    // 1. (CV:...) や （声優名） などの括弧内の情報を全て削除
    // ※ 複雑なネストがある場合は完全には対応できないが、一般的なケースに対応
    cleaned = cleaned.replace(/（[^（）]*?CV:[^（）]*?）/g, '')
        .replace(/\([^()]*?CV:[^()]*?\)/g, '')
        .replace(/\(([^()]*?)\)/g, (match, p1) => {
            // 括弧内の文字数が多すぎる（声優の羅列など）場合は削除を試みる
            return p1.length > 50 ? '' : match;
        })
        .replace(/（([^（）]*?)）/g, (match, p1) => {
            // 括弧内の文字数が多すぎる場合は削除を試みる
            return p1.length > 50 ? '' : match;
        });

    // 2. 冗長な記号や区切り文字を整理
    cleaned = cleaned.replace(/[:：]/g, ' ') // コロン・二重コロンをスペースに
        .replace(/、/g, ',')    // 全角読点を半角コンマに
        .replace(/\s+/g, ' ')   // 連続するスペースを一つに
        .replace(/,\s*,/g, ',') // 連続するコンマを一つに

    // 3. 最後にトリミング
    return cleaned.trim().replace(/,\s*$/, ''); // 末尾のコンマがあれば削除
}


/**
 * Spotify検索クエリを最適化する
 */
function createOptimizedQuery(trackTitle: string, artistStringRaw: string, animeTitle: string): string {
    const cleanedTrackTitle = trackTitle.replace(/\s*\(.*?\)\s*/g, '').trim();

    // 冗長なアーティスト名（特に数十名に及ぶ場合）は、クエリが長すぎて400エラーの原因となるため、アニメタイトルを優先する
    if (artistStringRaw.length > 150) {
        // 例: "うまぴょい伝説" ウマ娘
        return `"${cleanedTrackTitle}" ${animeTitle.split(' ').slice(0, 2).join(' ')}`;
    }

    const cleanedArtist = cleanArtistName(artistStringRaw);

    if (cleanedArtist && cleanedArtist.length > 0) {
        // 例: "hectopascal" 小糸侑 七海燈子
        return `"${cleanedTrackTitle}" artist:"${cleanedArtist}"`;
    }

    // 最低限、曲名のみで検索
    return `"${cleanedTrackTitle}"`;
}

// === Spotify API ===

async function getSpotifyToken(): Promise<string | null> {
    const now = Date.now()
    if (spotifyTokenCache.token && spotifyTokenCache.expiresAt > now) {
        return spotifyTokenCache.token
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.error('Spotify client ID or secret not set.')
        return null
    }

    try {
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
            },
            body: 'grant_type=client_credentials',
        })

        if (!res.ok) throw new Error(`Spotify token request failed: ${res.statusText} (Status: ${res.status})`)

        const data = await res.json()
        spotifyTokenCache = {
            token: data.access_token,
            expiresAt: now + data.expires_in * 1000 - 60000,
        }
        return spotifyTokenCache.token
    } catch (error) {
        console.error('Failed to get Spotify token:', error)
        return null
    }
}

/**
 * Spotifyで楽曲検索
 */
async function searchSpotifyTrack(
    animeTitle: string,
    songTitle: string,
    artistNameRaw: string | null,
    token: string
): Promise<string | null> {
    if (!songTitle?.trim()) return null

    const rawArtistName = artistNameRaw || ''
    const optimizedQuery = createOptimizedQuery(songTitle, rawArtistName, animeTitle);

    // クエリが空なら検索しない
    if (!optimizedQuery.trim()) return null;

    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(optimizedQuery)}&type=track&limit=5`

    try {
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept-Language': 'ja',
            },
        })

        if (res.status === 429) {
            console.warn('Spotify rate limit hit. Retrying after 10s...')
            await delay(10000)
            return searchSpotifyTrack(animeTitle, songTitle, artistNameRaw, token)
        }

        // 400 Bad Request (クエリが長すぎる等) のエラーもここで捕捉
        if (!res.ok) throw new Error(`Spotify search failed: ${res.statusText} (Status: ${res.status})`);

        const data = await res.json()
        const items = data?.tracks?.items || []

        if (items.length === 0) {
            console.log(`Spotify: No results for "${songTitle}" (${rawArtistName}) (Query: ${optimizedQuery})`)
            return null
        }

        let bestMatch: any = null
        let bestScore = 0

        const cleanedSongTitle = songTitle.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
        const cleanedArtistName = cleanArtistName(rawArtistName).toLowerCase();

        for (const item of items) {
            const spotifyTitle = item.name || ''
            const spotifyArtist = item.artists?.map((a: any) => a.name).join(', ') || ''

            const titleScore = stringSimilarity.compareTwoStrings(cleanedSongTitle, spotifyTitle.toLowerCase())

            // クリーニング後のアーティスト名との類似度を計算
            const artistScore = stringSimilarity.compareTwoStrings(cleanedArtistName, spotifyArtist.toLowerCase())

            // アーティスト情報が非常に冗長な場合（150文字超）、タイトル類似度のみを重視
            const avgScore = rawArtistName.length > 150
                ? titleScore
                : (titleScore * 0.7 + artistScore * 0.3); // タイトル重視で重み付け

            // 閾値を調整。冗長なアーティスト名の場合は50%でタイトルマッチすればOK
            const requiredScore = rawArtistName.length > 150 ? 0.5 : 0.6;

            if (avgScore > bestScore && avgScore >= requiredScore) {
                bestScore = avgScore
                bestMatch = item
            }
        }

        if (bestMatch) {
            console.log(
                `Spotify match (${(bestScore * 100).toFixed(1)}%): "${bestMatch.name}" by ${bestMatch.artists[0].name} (Anime: ${animeTitle})`
            )
            return bestMatch.external_urls?.spotify || null
        } else {
            console.log(`Spotify: No sufficiently close match for "${songTitle}" (${rawArtistName}) (Query: ${optimizedQuery})`)
            return null
        }
    } catch (error) {
        console.error(`Spotify search error for "${songTitle}" (${rawArtistName}) (Anime: ${animeTitle}):`, error)
        return null
    }
}

// === メイン処理 ===
export async function POST() {
    // Annict認証チェック
    const annictToken = (await cookies()).get('annict_token')?.value
    if (!annictToken) {
        return NextResponse.json({
            error: 'Annict認証が必要です。Annictアカウントでログインしてください。'
        }, { status: 401 })
    }

    // Spotify認証チェック
    const spotifyToken = await getSpotifyToken()
    if (!spotifyToken) {
        return NextResponse.json({
            error: 'Spotify認証に失敗しました。Spotify APIキーが正しく設定されているか確認してください。'
        }, { status: 500 })
    }

    // ★ ステータスを初期化
    progressStatus.status = 'running';
    progressStatus.processed = 0;
    progressStatus.total = 0;
    progressStatus.message = 'Annictの視聴作品リストを取得中...';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const fetchAll = false
    const allWorks: any[] = []
    let page = 1
    let hasNext = true

    while (hasNext) {
        const worksRes = await fetch(
            `https://api.annict.com/v1/me/works?filter_status=watched&page=${page}&access_token=${annictToken}`
        )
        if (!worksRes.ok) {
            progressStatus.status = 'error';
            progressStatus.message = `Failed to fetch works from Annict (Status: ${worksRes.status})`;
            return NextResponse.json({ error: 'Failed to fetch works from Annict' }, { status: 502 })
        }

        const worksJson = await worksRes.json()
        allWorks.push(...(worksJson.works || []))
        if (!fetchAll || !worksJson.next_page) hasNext = false
        else page = worksJson.next_page
    }

    // ★ 総作品数を設定
    progressStatus.total = allWorks.length;
    progressStatus.message = `作品 ${allWorks.length} 件のテーマ曲情報を処理中...`;

    let imported = 0
    let updated = 0
    const results: any[] = []

    for (const work of allWorks) {
        const {
            id: annict_id,
            title,
            title_kana,
            media,
            media_text,
            season_name,
            season_name_text,
            released_on,
            released_on_about,
            official_site_url,
            wikipedia_url,
            twitter_username,
            twitter_hashtag,
            syobocal_tid,
            mal_anime_id,
            images = {},
            episodes_count,
            watchers_count,
            reviews_count,
            no_episodes,
        } = work

        // ★ 進捗メッセージを更新
        progressStatus.message = `作品を処理中: ${title}`;

        let themes = { op: [], ed: [], in: [] } as {
            op: { title: string; artist: string; episode: string }[]
            ed: { title: string; artist: string; episode: string }[]
            in: { title: string; artist: string; episode: string }[]
        }

        if (syobocal_tid) {
            const comment = await fetchSyoboiData(syobocal_tid)
            if (comment) {
                themes = extractThemes(comment) as {
                    op: { title: string; artist: string; episode: string }[]
                    ed: { title: string; artist: string; episode: string }[]
                    in: { title: string; artist: string; episode: string }[]
                }
            }
        }

        const upsertRow = {
            annict_id: Number(annict_id),
            title: title || null,
            title_kana: title_kana || null,
            media: media || null,
            media_text: media_text || null,
            season_name: season_name || null,
            season_name_text: season_name_text || null,
            released_on: released_on || null,
            released_on_about: released_on_about || null,
            official_site_url: official_site_url || null,
            wikipedia_url: wikipedia_url || null,
            twitter_username: twitter_username || null,
            twitter_hashtag: twitter_hashtag || null,
            syobocal_tid: syobocal_tid || null,
            mal_anime_id: mal_anime_id || null,
            og_image_url: images?.facebook?.og_image_url || null,
            recommended_image_url: images?.recommended_url || null,
            episodes_count: episodes_count || null,
            watchers_count: watchers_count || null,
            reviews_count: reviews_count || null,
            no_episodes: no_episodes || false,
            user_id: '00000000-0000-0000-0000-000000000000',
        } as const

        const { data: workData, error: workError } = await supabase
            .from('works')
            .upsert(upsertRow, { onConflict: 'annict_id,user_id' })
            .select('id, annict_id')

        if (workError) {
            console.error(`Work upsert error for annict_id ${annict_id}:`, workError)
            // エラーがあっても処理は継続
        }

        const workId = workData?.[0]?.id
        if (!workId) {
            // IDが取得できない場合も処理は継続
            progressStatus.processed++;
            await delay(500);
            continue;
        }

        const themeInserts: {
            work_id: number,
            theme_type: 'op' | 'ed',
            title: string,
            artist: string,
            episode_range: string,
            spotify_url: string | null
        }[] = []

        const ops = Array.isArray(themes.op) ? themes.op as { title: string; artist: string; episode: string }[] : []
        const eds = Array.isArray(themes.ed) ? themes.ed as { title: string; artist: string; episode: string }[] : []
        for (const t of [...ops, ...eds]) {
            const { title: themeTitle, artist, episode } = t
            // ★ 検索関数の引数にアニメタイトルを追加
            const spotify_url = await searchSpotifyTrack(title, themeTitle, artist, spotifyToken)
            themeInserts.push({
                work_id: workId,
                theme_type: ops.includes(t) ? 'op' : 'ed',
                title: themeTitle,
                artist: t.artist,
                episode_range: t.episode,
                spotify_url,
            })
            await delay(100)
        }

        if (themeInserts.length > 0) {
            const { error: themeError } = await supabase
                .from('work_themes')
                .upsert(themeInserts, { onConflict: 'work_id,theme_type,title' })

            if (themeError) console.error(`Theme upsert error for work_id ${workId}:`, themeError)
        }

        updated++
        results.push({
            title,
            op_count: themes.op.length,
            ed_count: themes.ed.length,
            themes,
        })

        // ★ 処理件数を更新
        progressStatus.processed++;
        await delay(500)
    }

    // ★ 処理完了ステータスを設定
    progressStatus.status = 'completed';
    progressStatus.message = `インポート完了: ${updated} 件更新`;

    return NextResponse.json({ imported, updated, total: allWorks.length, results })
}