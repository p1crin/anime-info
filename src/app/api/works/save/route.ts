import { cookies } from "next/headers";
import { fetchAnnictWorks } from "@/lib/annict";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Supabaseの行データ型を定義
type AnimeRow = {
    annict_id: number;
    title: string;
    season: string;
    director: string;
    writer: string;
    cast: string[];
    op_theme: string;
    ed_theme: string;
    user_id: string;
};

export async function POST() {
    const token = (await cookies()).get("annict_token")?.value;
    if (!token)
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const user_id = (await cookies()).get("sb-user-id")?.value;
    if (!user_id)
        return NextResponse.json({ error: "No user" }, { status: 401 });

    const works = await fetchAnnictWorks(token);

    const animeRows: AnimeRow[] = works.map((w: any) => {
        const staffs = w.staffs.edges.map((e: any) => e.node);
        const casts = w.casts.edges.map((e: any) => e.node.name);

        const director =
            staffs.find((s: any) => s.roleText.includes("監督"))?.name || "";
        const writer =
            staffs.find(
                (s: any) =>
                    s.roleText.includes("シリーズ構成") || s.roleText.includes("脚本")
            )?.name || "";

        return {
            annict_id: Number(w.id),
            title: w.title,
            season: w.seasonName || "",
            director,
            writer,
            cast: casts,
            op_theme: "",
            ed_theme: "",
            user_id,
        };
    });

    // 🟢 型パラメータを指定してupsert()
    const { data, error } = await supabase
        .from("animes")
        .upsert(animeRows, { onConflict: "annict_id,user_id" })
        .select(); // ← dataを返すためにselect()を追加

    if (error) {
        console.error(error);
        return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }

    return NextResponse.json({ message: "Saved", count: data?.length ?? 0 });
}
