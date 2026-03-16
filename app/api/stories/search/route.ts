import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseAdmin"; // 경로 수정 완료

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryTerm = searchParams.get("q") || "";

    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .ilike("content", `%${queryTerm}%`) // content 컬럼에서 검색
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Search Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}