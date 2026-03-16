import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { storyContent, artStyle, subStyle } = await req.json();

    // 1. 스타일별 프롬프트 가이드 설정
    const styleGuide = subStyle === "한국형" 
      ? `
        [STYLE: KOREAN HORROR (K-HORROR)]
        - Character: Strictly South Korean people (East Asian features, black hair).
        - Location: 1990s South Korean hallway-style apartments (Bogdo-shik), old villas in Seoul, cramped Gosiwon, or Shamanic shrines (Mudang-jip).
        - Atmosphere: Damp walls, flickering green/cold-white fluorescent lights, digital door locks, Korean signs (Hangul) on walls.
        - Cinematic: Gritty, humid, and grudge-filled "Han" aesthetic.
        `
      : `
        [STYLE: GLOBAL/WESTERN HORROR]
        - Character: Diverse western or generic characters.
        - Location: Classic gothic mansions, deep dark woods, abandoned hospitals, or western suburban basements.
        - Atmosphere: Dim candlelight, heavy shadows, old wooden doors, dusty antique furniture.
        - Cinematic: Classic Hollywood horror aesthetic with high contrast lighting.
        `;

    const SYSTEM_PROMPT = `
너는 세계 최고의 비주얼 디렉터야. 
[${storyContent}] 대본을 [${artStyle}] 화풍으로 시각화하기 위한 이미지 프롬프트를 3개 작성해.

[필수 지시 사항]:
1. 현재 선택된 서브 스타일은 [${subStyle}]이야.
2. 아래 가이드를 엄격히 준수하여 영문 프롬프트를 작성해:
   ${styleGuide}
3. ${subStyle === "한국형" ? "반드시 'South Korean' 단어를 포함하고 서양 요소를 배제해." : "한국적 요소를 완전히 배제해."}

반드시 이 JSON 구조로 응답해:
{
  "prompts": [
    { "scene": "장면 설명(한글)", "prompt": "영문 프롬프트 내용" }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) throw new Error("AI 응답이 없습니다.");

    const data = JSON.parse(responseText);
    return NextResponse.json({ items: data.prompts || [] });

  } catch (error: any) {
    console.error("프롬프트 생성 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}