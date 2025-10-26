// === 進捗ステータス管理 ===
export const progressStatus: {
    total: number,
    processed: number,
    skipped: number,
    status: 'pending' | 'running' | 'completed' | 'error',
    message: string
} = {
    total: 0,
    processed: 0,
    skipped: 0,
    status: 'pending',
    message: 'アイドル状態',
};
