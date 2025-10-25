// === 進捗ステータス管理 ===
export const progressStatus: {
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
