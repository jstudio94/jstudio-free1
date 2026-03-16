// ✅ Vercel 빌드 검사 프리패스: "미리 검사하지 말고 실제 호출될 때만 실행해!"
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGET_BLOGGERS = ["wlstl0120"]; // 타겟 블로거 ID

export async function POST(req: Request) {
  try {
    const { keyword } = await req.json();
    let totalInserted = 0;
    const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

    for (const bloggerId of TARGET_BLOGGERS) {
      // ✅ 검색 대신 블로그 '전용 RSS' 주소를 직접 호출 (이게 직빵입니다)
      const rssUrl = `https://rss.blog.naver.com/${bloggerId}.xml`;

      const response = await fetch(rssUrl);
      if (!response.ok) continue;

      const xmlData = await response.text();
      const jsonObj = parser.parse(xmlData);
      const items = jsonObj.rss?.channel?.item || [];
      const itemsArray = Array.isArray(items) ? items : [items];

      for (const item of itemsArray) {
        const title = String(item.title || "");
        const description = String(item.description || "");
        
        // ✅ 우리 서버에서 키워드가 포함되어 있는지 직접 검사
        if (title.includes(keyword) || description.includes(keyword)) {
          const cleanContent = description.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim();
          
          const { error } = await supabase
            .from("stories")
            .upsert({
              title: title,
              content: cleanContent,
              source_url: item.link,
              created_at: new Date(item.pubDate || new Date()).toISOString(),
            }, { onConflict: "title" });

          if (!error) totalInserted++;
        }
      }
    }

    return NextResponse.json({ totalInserted }); // ✅ 숫자 정확히 전달
  } catch (error: any) {
    return NextResponse.json({ totalInserted: 0, error: error.message });
  }
}