"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
    const [annictAuthStatus, setAnnictAuthStatus] = useState<string | null>(null);
    const [spotifyAuthStatus, setSpotifyAuthStatus] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        checkAuth();
        checkSpotifyAuth();

        // URLパラメータをチェックして認証状態を更新
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('spotify_success')) {
            setSpotifyAuthStatus('Spotify認証に成功しました！');
            // 認証済みなら自動で /works にリダイレクト
            setTimeout(() => router.push('/works'), 2000);
            window.history.replaceState({}, '', window.location.pathname);
        } else if (urlParams.get('spotify_error')) {
            setSpotifyAuthStatus(`Spotify認証エラー: ${urlParams.get('spotify_error')}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch("/api/auth/check");
            const data = await res.json();
            setAnnictAuthStatus(
                data.authenticated
                    ? "Annict認証済み"
                    : "Annict未認証"
            );

            // 両方認証済みなら /works にリダイレクト
            if (data.authenticated && spotifyAuthStatus?.includes("認証済み")) {
                router.push('/works');
            }
        } catch (error) {
            setAnnictAuthStatus("Annict認証状態確認エラー");
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

            // 両方認証済みなら /works にリダイレクト
            if (annictAuthStatus?.includes("認証済み") && data.authenticated) {
                router.push('/works');
            }
        } catch (error) {
            setSpotifyAuthStatus("Spotify認証状態確認エラー");
        }
    };

    if (!mounted) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Anime to Spotify
                    </h1>
                    <p className="text-gray-400">
                        AnnictのアニメデータをSpotifyプレイリストに変換
                    </p>
                </div>

                {/* 認証状態 */}
                <div className="space-y-4 mb-8">
                    <div className={`px-4 py-3 rounded-lg text-sm font-medium ${annictAuthStatus?.includes("認証済み")
                            ? "bg-green-900/40 text-green-200 border border-green-700"
                            : "bg-red-900/40 text-red-300 border border-red-700"
                        }`}>
                        <strong>Annict:</strong> {annictAuthStatus}
                    </div>
                    <div className={`px-4 py-3 rounded-lg text-sm font-medium ${spotifyAuthStatus?.includes("認証済み")
                            ? "bg-green-900/40 text-green-200 border border-green-700"
                            : "bg-red-900/40 text-red-300 border border-red-700"
                        }`}>
                        <strong>Spotify:</strong> {spotifyAuthStatus}
                    </div>
                </div>

                {/* 認証ボタン */}
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <button
                            onClick={checkAuth}
                            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white font-medium"
                        >
                            Check Annict Auth
                        </button>
                        <a
                            href="/api/annict/auth"
                            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition text-white font-medium text-center"
                        >
                            Login with Annict
                        </a>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={checkSpotifyAuth}
                            className="flex-1 px-4 py-3 bg-purple-700 hover:bg-purple-600 rounded-lg transition text-white font-medium"
                        >
                            Check Spotify Auth
                        </button>
                        <a
                            href="/api/spotify/auth"
                            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition text-white font-medium text-center"
                        >
                            Login with Spotify
                        </a>
                    </div>
                </div>

                {/* 説明文 */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-400 mb-4">
                        両方のサービスで認証が完了すると、自動的に作品管理ページに移動します。
                    </p>
                    <a
                        href="/works"
                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                        直接作品管理ページへ →
                    </a>
                </div>
            </div>
        </div>
    );
}
