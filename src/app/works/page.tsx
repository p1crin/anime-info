"use client";

import { useState, useEffect, useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    PaginationState,
    Row,
    SortingFn,
} from "@tanstack/react-table";

// === 型定義 ===
type Theme = {
    title: string;
    theme_type: "op" | "ed";
    episode_range: string;
    spotify_url?: string | null;
};

type Work = {
    id: string | number;
    annict_id: string | number;
    title: string;
    title_kana: string;
    media_text: string;
    season_name_text: string;
    watchers_count: number;
    work_themes: Theme[];
    official_site_url?: string | null;
};

// === プレイリスト作成ダイアログ ===
type PlaylistDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description: string) => void;
    selectedCount: number;
};

function PlaylistDialog({ isOpen, onClose, onCreate, selectedCount }: PlaylistDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await onCreate(name.trim(), description.trim());
            onClose();
            setName('');
            setDescription('');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">
                    Spotifyプレイリスト作成
                </h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            プレイリスト名 *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="プレイリスト名を入力"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            説明 (オプション)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                            rows={3}
                            placeholder="プレイリストの説明を入力"
                        />
                    </div>
                    <div className="text-sm text-gray-400 mb-4">
                        選択された作品のテーマ曲 {selectedCount} 曲をプレイリストに追加します
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                        >
                            {loading ? '作成中...' : '作成'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// === メインコンポーネント ===
export default function ImportButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [authStatus, setAuthStatus] = useState<string | null>(null);
    const [spotifyAuthStatus, setSpotifyAuthStatus] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        checkAuth();
        checkSpotifyAuth();

        // URLパラメータをチェック
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('spotify_success')) {
            setSpotifyAuthStatus('Spotify認証に成功しました！');
            // URLからパラメータを削除
            window.history.replaceState({}, '', window.location.pathname);
        } else if (urlParams.get('spotify_error')) {
            setSpotifyAuthStatus(`Spotify認証エラー: ${urlParams.get('spotify_error')}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleImport = async () => {
        // Annictトークンチェック
        const annictToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('annict_token='))
            ?.split('=')[1];

        if (!annictToken) {
            alert('Annict認証が必要です。まずAnnictアカウントでログインしてください。');
            return;
        }

        setLoading(true);
        setResult(null);
        try {
            const res = await fetch("/api/works/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'インポートに失敗しました');
            }

            const data = await res.json();
            setResult(JSON.stringify(data, null, 2));
            await checkAuth();
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            setResult(`Error: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const checkAuth = async () => {
        try {
            const res = await fetch("/api/auth/check");
            const data = await res.json();
            setAuthStatus(
                data.authenticated
                    ? "Authenticated with Annict"
                    : `Not authenticated: ${data.error || "Unknown error"}`
            );
        } catch (error) {
            setAuthStatus(`Error checking auth: ${error}`);
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
        } catch (error) {
            setSpotifyAuthStatus("Spotify認証状態確認エラー");
        }
    };

    if (!mounted) return <div className="p-6 text-gray-400">Loading...</div>;

    return (
        <div className="max-w-2/3 mx-auto p-6 text-gray-200">
            {/* 認証操作 */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    onClick={checkAuth}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                    Check Annict Auth
                </button>
                <a
                    href="/api/annict/auth"
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition"
                >
                    Login with Annict
                </a>
                <button
                    onClick={checkSpotifyAuth}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg transition"
                >
                    Check Spotify Auth
                </button>
                <a
                    href="/api/spotify/auth"
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition"
                >
                    Login with Spotify
                </a>
            </div>

            {/* 認証状態 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${authStatus?.includes("Authenticated")
                        ? "bg-green-900/40 text-green-200 border border-green-700"
                        : "bg-red-900/40 text-red-300 border border-red-700"
                        }`}
                >
                    <strong>Annict:</strong> {authStatus}
                </div>
                <div
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${spotifyAuthStatus?.includes("認証済み")
                        ? "bg-green-900/40 text-green-200 border border-green-700"
                        : "bg-red-900/40 text-red-300 border border-red-700"
                        }`}
                >
                    <strong>Spotify:</strong> {spotifyAuthStatus}
                </div>
            </div>

            {/* 認証済みならテーブルとボタンを表示 */}
            {authStatus?.includes("Authenticated") ? (
                <>
                    <button
                        onClick={handleImport}
                        disabled={loading}
                        className="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition disabled:opacity-50"
                    >
                        {loading ? "Importing..." : "Import Works"}
                    </button>
                    <WorksTable />
                </>
            ) : (
                <div className="text-center py-16">
                    <p className="text-gray-400 mb-4">
                        Annictでログインしてアニメ情報をインポートしてください
                    </p>
                    <a
                        href="/api/annict/auth"
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-lg font-medium transition"
                    >
                        Annictでログイン
                    </a>
                </div>
            )}

            {/* 結果表示 */}
            {result && (
                <pre className="mt-6 bg-gray-900 text-gray-300 p-4 rounded-lg text-xs overflow-x-auto border border-gray-700">
                    {result}
                </pre>
            )}
        </div>
    );
}

// -----------------------------------------------------------------------------
// WorksTable コンポーネント
// -----------------------------------------------------------------------------

const getSeasonSortValue = (seasonString: string | undefined): number => {
    if (!seasonString) return 0;
    const seasonMap: Record<string, number> = { 春: 1, 夏: 2, 秋: 3, 冬: 4 };
    const match = seasonString.match(/(\d{4})年(春|夏|秋|冬)/);
    if (match) return parseInt(match[1], 10) + seasonMap[match[2]] / 10;
    const yearMatch = seasonString.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1], 10) : 0;
};

const seasonSortingFn: SortingFn<Work> = (rowA, rowB, columnId) => {
    const valA = getSeasonSortValue(rowA.getValue(columnId));
    const valB = getSeasonSortValue(rowB.getValue(columnId));
    return valA - valB;
};

const renderThemeCell = (themes: Theme[], type: "op" | "ed") => {
    const filtered = (themes ?? []).filter((t) => t.theme_type === type);
    return filtered.length ? (
        <div className="space-y-1">
            {filtered.map((t, i) => (
                <div key={i}>
                    {t.spotify_url ? (
                        <a
                            href={t.spotify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                        >
                            {t.title}
                        </a>
                    ) : (
                        <span>{t.title}</span>
                    )}
                    {t.episode_range && (
                        <div className="text-xs text-gray-500">
                            {t.episode_range}
                        </div>
                    )}
                </div>
            ))}
        </div>
    ) : (
        <span className="text-gray-600">-</span>
    );
};

function WorksTable() {
    const [rows, setRows] = useState<Work[]>([]);
    const [q, setQ] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 50,
    });
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
    const [playlistLoading, setPlaylistLoading] = useState(false);

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/works/list");
            const data = await res.json();
            setRows(Array.isArray(data) ? data : []);
        })();
    }, []);

    // チェックボックスの処理
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(table.getFilteredRowModel().rows.map(row => row.original.id.toString()));
            setSelectedRows(allIds);
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedRows);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedRows(newSelected);
    };

    // プレイリスト作成
    const handleCreatePlaylist = async (name: string, description: string) => {
        setPlaylistLoading(true);
        try {
            // 選択された作品のSpotify URLを収集
            const trackUrls: string[] = [];
            selectedRows.forEach(id => {
                const work = rows.find(r => r.id.toString() === id);
                if (work?.work_themes) {
                    work.work_themes.forEach(theme => {
                        if (theme.spotify_url) {
                            trackUrls.push(theme.spotify_url);
                        }
                    });
                }
            });

            if (trackUrls.length === 0) {
                alert('選択された作品にSpotifyリンクのある楽曲がありません。');
                return;
            }

            const response = await fetch('/api/spotify/playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description,
                    trackUrls,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'プレイリスト作成に失敗しました');
            }

            const result = await response.json();

            // 成功したらSpotifyでプレイリストを開く
            if (result.playlistUrl) {
                window.open(result.playlistUrl, '_blank');
                alert(`プレイリスト「${result.playlistName}」を作成しました！\n${result.trackCount}曲を追加しました。`);
            }

            setSelectedRows(new Set());
        } catch (error: any) {
            console.error('Playlist creation error:', error);
            alert(`プレイリスト作成エラー: ${error.message}`);
        } finally {
            setPlaylistLoading(false);
        }
    };

    const columns = useMemo<ColumnDef<Work>[]>(() => [
        // チェックボックス列を追加
        {
            id: 'select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getFilteredRowModel().rows.length > 0 &&
                        table.getFilteredRowModel().rows.every(row => selectedRows.has(row.original.id.toString()))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={selectedRows.has(row.original.id.toString())}
                    onChange={(e) => handleSelectRow(row.original.id.toString(), e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
            ),
        },
        {
            accessorKey: "title",
            header: "タイトル",
            cell: ({ row, getValue }) => {
                const work = row.original;
                const title = getValue<string>();
                return (
                    <div>
                        {work.official_site_url ? (
                            <a
                                href={work.official_site_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline font-medium"
                            >
                                {title}
                            </a>
                        ) : (
                            <span className="font-medium">{title}</span>
                        )}
                        {work.title_kana && (
                            <div className="text-xs text-gray-500">
                                {work.title_kana}
                            </div>
                        )}
                    </div>
                );
            },
        },
        { accessorKey: "media_text", header: "媒体" },
        {
            accessorKey: "season_name_text",
            header: "シーズン",
            sortingFn: seasonSortingFn,
        },
        { accessorKey: "watchers_count", header: "視聴者数" },
        {
            accessorKey: "work_themes",
            header: "OPテーマ",
            cell: (info) => renderThemeCell(info.getValue<Theme[]>(), "op"),
        },
        {
            accessorKey: "work_themes",
            id: "ed_themes",
            header: "EDテーマ",
            cell: (info) => renderThemeCell(info.getValue<Theme[]>(), "ed"),
        },
    ], [selectedRows]);

    const globalFilterFn = (row: Row<Work>, columnId: string, filterValue: string) => {
        const k = filterValue.toLowerCase();
        const r = row.original;
        const themeText = (r.work_themes || [])
            .map((t) => t.title)
            .join(" ")
            .toLowerCase();
        return (
            r.title.toLowerCase().includes(k) ||
            r.title_kana.toLowerCase().includes(k) ||
            r.media_text.toLowerCase().includes(k) ||
            r.season_name_text.toLowerCase().includes(k) ||
            themeText.includes(k)
        );
    };

    const table = useReactTable({
        data: rows,
        columns,
        state: { sorting, pagination, globalFilter: q },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        onGlobalFilterChange: setQ,
        globalFilterFn,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            {/* プレイリスト作成ボタンを検索バー横に追加 */}
            <div className="flex items-center gap-4 mb-4">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="検索..."
                    className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                    onClick={() => setPlaylistDialogOpen(true)}
                    disabled={selectedRows.size === 0 || playlistLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition flex items-center gap-2"
                >
                    {playlistLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            作成中...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 5v10l8-5-8-5z" />
                            </svg>
                            プレイリスト作成 ({selectedRows.size})
                        </>
                    )}
                </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="min-w-full text-sm text-gray-200">
                    <thead className="bg-gray-800 text-gray-300 text-left">
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id}>
                                {hg.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="py-2 px-3 font-medium"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : (
                                                <div
                                                    className={header.column.getCanSort()
                                                        ? "cursor-pointer select-none hover:text-blue-400"
                                                        : ""}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {{
                                                        asc: " ▲",
                                                        desc: " ▼",
                                                    }[
                                                        header.column.getIsSorted() as string
                                                    ] ?? null}
                                                </div>
                                            )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>

                    <tbody>
                        {table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                className="border-b border-gray-800 hover:bg-gray-800/70 transition"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="py-2 px-3 align-top">
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ページネーション */}
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                <div>
                    全 {table.getFilteredRowModel().rows.length} 件中 (
                    {table.getState().pagination.pageIndex + 1} /{" "}
                    {table.getPageCount()} ページ)
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="px-2 py-1 bg-gray-800 border border-gray-700 rounded disabled:opacity-50"
                    >
                        {"<<"}
                    </button>
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="px-2 py-1 bg-gray-800 border border-gray-700 rounded disabled:opacity-50"
                    >
                        {"<"}
                    </button>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="px-2 py-1 bg-gray-800 border border-gray-700 rounded disabled:opacity-50"
                    >
                        {">"}
                    </button>
                    <button
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="px-2 py-1 bg-gray-800 border border-gray-700 rounded disabled:opacity-50"
                    >
                        {">>"}
                    </button>
                </div>
            </div>

            {/* プレイリスト作成ダイアログ */}
            <PlaylistDialog
                isOpen={playlistDialogOpen}
                onClose={() => setPlaylistDialogOpen(false)}
                onCreate={handleCreatePlaylist}
                selectedCount={Array.from(selectedRows).reduce((count, id) => {
                    const work = rows.find(r => r.id.toString() === id);
                    return count + (work?.work_themes?.filter(t => t.spotify_url).length || 0);
                }, 0)}
            />
        </div>
    );
}
