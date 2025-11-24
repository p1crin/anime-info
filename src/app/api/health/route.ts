import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // 環境変数チェック
        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase environment variables");
            return NextResponse.json(
                {
                    status: "error",
                    message: "Supabase configuration missing",
                    details: {
                        hasUrl: !!supabaseUrl,
                        hasKey: !!supabaseKey
                    }
                },
                { status: 500 }
            );
        }

        // Supabaseクライアント作成
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Supabaseに簡単なクエリを実行してDBを起こす
        const { data, error } = await supabase
            .from("works")
            .select("id")
            .limit(1);

        if (error) {
            console.error("Health check error:", error);
            return NextResponse.json(
                {
                    status: "error",
                    message: error.message,
                    code: error.code
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            message: "Database is active",
            recordsChecked: data?.length || 0
        });
    } catch (error) {
        console.error("Health check exception:", error);
        return NextResponse.json(
            {
                status: "error",
                message: error instanceof Error ? error.message : "Internal server error"
            },
            { status: 500 }
        );
    }
}
