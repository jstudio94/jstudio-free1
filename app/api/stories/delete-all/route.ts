import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // 모든 데이터를 삭제하는 쿼리
    // id가 비어있지 않은 모든 행을 삭제합니다.
    const { error } = await supabase
      .from("stories")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); 

    if (error) throw error;

    return NextResponse.json({ success: true, message: "모든 데이터가 삭제되었습니다." });
  } catch (error: any) {
    console.error("삭제 오류:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}