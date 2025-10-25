import { NextResponse } from 'next/server'

// === 進捗ステータス管理 (グローバル変数) ===
// 🚨 注意: サーバーレス環境ではインスタンスがリサイクルされるたびにリセットされる可能性があります。
export let progressStatus: {
    total: number,
    processed: number,
    status: 'pending' | 'running' | 'completed' | 'error',
    message: string
} = {
    total: 0,
    processed: 0,
    status: 'pending',
    message: 'アイドル状態',
};

/**
 * 進捗状況を返すGETエンドポイント
 */
export function GET() {
    return NextResponse.json(progressStatus);
}