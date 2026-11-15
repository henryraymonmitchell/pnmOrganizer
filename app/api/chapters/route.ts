import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/server/sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = getDatabase().prepare("SELECT name FROM chapters ORDER BY name COLLATE NOCASE").all() as { name: string }[];
    return NextResponse.json(rows.map((row) => row.name));
  } catch {
    return NextResponse.json({ error: "Could not load chapters." }, { status: 500 });
  }
}
