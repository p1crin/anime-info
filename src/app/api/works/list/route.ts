import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Annict認証チェック
    const cookieStore = await cookies()
    const annictToken = cookieStore.get('annict_token')?.value
    if (!annictToken) {
        return NextResponse.json({
            error: 'Annict認証が必要です。Annictアカウントでログインしてください。'
        }, { status: 401 })
    }

    // 🔴 user_id を取得
    // 🔴 Annict APIでユーザー情報を取得
    const userRes = await fetch(`https://api.annict.com/v1/me?access_token=${annictToken}`);
    const userData = await userRes.json();
    const userId = userData.username.toString();

    const { data, error } = await supabase
        .from('works')
        .select(`
            *,
            work_themes (
                theme_type,
                title,
                episode_range,
                spotify_url
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
}


