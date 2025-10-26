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

    // 認証状態が変更された時にリダイレクト
    useEffect(() => {
        if (authChecked && annictAuthStatus?.includes("認証済み") && spotifyAuthStatus?.includes("認証済み")) {
            router.push('/works');
        }
    }, [authChecked, annictAuthStatus, spotifyAuthStatus, router]);

    const checkAuth = async () => {
        try {
            const res = await fetch("/api/auth/check");
            const data = await res.json();
            setAnnictAuthStatus(
                data.authenticated
                    ? "Annict認証済み"
                    : "Annict未認証"
            );
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
                    <a
                        href="/api/annict/auth"
                        className="block w-full px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition text-white font-medium text-center"
                    >
                        Login with Annict
                    </a>

                    <a
                        href="/api/spotify/auth"
                        className="block w-full px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition text-white font-medium text-center"
                    >
                        Login with Spotify
                    </a>
                </div>

                {/* 説明文と直接リンクは削除 */}
            </div>
        </div>
    );
}
