"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthPage() {
    const [annictAuthStatus, setAnnictAuthStatus] = useState<string | null>(null);
    const [spotifyAuthStatus, setSpotifyAuthStatus] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // 認証状態をまとめて管理
    const [authChecked, setAuthChecked] = useState(false);

    // 🔴 user_idをstateで管理
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);

        // 両方の認証をチェックしてからリダイレクト判定
        Promise.all([checkAuth(), checkSpotifyAuth()]).then(() => {
            setAuthChecked(true);
        });

        // URLパラメータをチェックして認証状態を更新
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('spotify_success')) {
            setSpotifyAuthStatus('Spotify認証に成功しました！');
            window.history.replaceState({}, '', window.location.pathname);
        } else if (urlParams.get('spotify_error')) {
            setSpotifyAuthStatus(`Spotify認証エラー: ${urlParams.get('spotify_error')}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // 🔴 自動リダイレクトを削除（コメントアウト）
    // useEffect(() => {
    //     if (authChecked && annictAuthStatus?.includes("認証済み") && spotifyAuthStatus?.includes("認証済み") && userId) {
    //         router.push(`/works?user_id=${userId}`);
    //     }
    // }, [authChecked, annictAuthStatus, spotifyAuthStatus, userId, router]);

    const checkAuth = async () => {
        try {
            const res = await fetch("/api/auth/check");
            const data = await res.json();
            setAnnictAuthStatus(
                data.authenticated
                    ? "Annict認証済み"
                    : "Annict未認証"
            );

            // 🔴 user_idを保存
            if (data.user_id) {
                setUserId(data.user_id);
            }

            return data.authenticated;
        } catch (error) {
            setAnnictAuthStatus("Annict認証状態確認エラー");
            return false;
        }
    };

    const checkSpotifyAuth = async () => {
        try {
            const res = await fetch("/api/spotify/check");
            const data = await res.json();
            setSpotifyAuthStatus(
                data.authenticated
                    ? "Spotify認証済み"
                    : "Spotify未認証"
            );
            return data.authenticated;
        } catch (error) {
            setSpotifyAuthStatus("Spotify認証状態確認エラー");
            return false;
        }
    };

    if (!mounted) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Anime List via Annict
                    </h1>

                    {/* 🔴 使い方のセクションを再構成 */}
                    <div className="text-left bg-gray-700/50 rounded-lg p-4 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">使い方</h2>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: '#E57373' }}>1</div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-200">Annictでログイン</p>
                                        <p className="text-xs text-gray-400">アニメ視聴データを取得</p>
                                    </div>
                                </div>
                                <a
                                    href="/api/annict/auth"
                                    className="px-4 py-2 text-white font-medium text-sm transition rounded-lg"
                                    style={{ backgroundColor: '#E57373' }}
                                >
                                    ログイン
                                </a>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-200">Spotifyでログイン</p>
                                        <p className="text-xs text-gray-400">プレイリスト作成機能</p>
                                    </div>
                                </div>
                                <a
                                    href="/api/spotify/auth"
                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition rounded-lg"
                                >
                                    ログイン
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🔴 認証状態 */}
                <div className="space-y-4 mb-8">
                    <div className={`px-4 py-3 rounded-lg text-sm font-medium ${annictAuthStatus?.includes("認証済み")
                        ? "text-white border"
                        : "text-red-300 border border-red-700"
                        }`}
                        style={annictAuthStatus?.includes("認証済み") ? { backgroundColor: '#E57373', borderColor: '#E57373' } : {}}
                    >
                        <strong>Annict:</strong> {annictAuthStatus}
                    </div>
                    <div className={`px-4 py-3 rounded-lg text-sm font-medium ${spotifyAuthStatus?.includes("認証済み")
                        ? "bg-green-900/40 text-green-200 border border-green-700"
                        : "bg-red-900/40 text-red-300 border border-red-700"
                        }`}>
                        <strong>Spotify:</strong> {spotifyAuthStatus}
                    </div>
                </div>

                {/* 🔴 古い認証ボタンは削除 */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-400 mb-4">
                        両方のサービスで認証が完了しました。作品データの管理を開始できます。
                    </p>
                    <button
                        onClick={() => router.push(`/works?user_id=${userId}`)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition"
                    >
                        作品管理へ →
                    </button>
                </div>
            </div>
        </div>
    );
}
