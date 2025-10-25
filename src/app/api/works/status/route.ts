import { NextResponse } from 'next/server'
import { progressStatus } from '@/lib/progress'

/**
 * 進捗状況を返すGETエンドポイント
 */
export function GET() {
    return NextResponse.json(progressStatus);
}