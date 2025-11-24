import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        // Supabaseに簡単なクエリを実行してDBを起こす
        const { data, error } = await supabase
            .from("works")
            .select("id")
            .limit(1);

        if (error) {
            console.error("Health check error:", error);
            return NextResponse.json(
                { status: "error", message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            message: "Database is active",
        });
    } catch (error) {
        console.error("Health check exception:", error);
        return NextResponse.json(
            { status: "error", message: "Internal server error" },
            { status: 500 }
        );
    }
}
