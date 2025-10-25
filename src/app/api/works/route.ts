import { cookies } from "next/headers";
import { fetchAnnictWorks } from "@/lib/annict";
import { NextResponse } from "next/server";

export async function GET() {
    const token = (await cookies()).get("annict_token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const works = await fetchAnnictWorks(token);
    return NextResponse.json(works);
}
