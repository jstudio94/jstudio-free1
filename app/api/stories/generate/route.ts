import OpenAI from "openai";
import { NextResponse } from "next/server";

export const maxDuration = 300;
export const runtime = "nodejs";

// 1. 타입 정의
type Category = "쿠팡" | "괴담";

type GenerateRequestBody = {
  keyword?: string;
  category?: string;
  prompt?: string; // 프론트엔드 호환용
};

type ScriptItem = {
  text: string;
};

type GenerateResponseBody = {
  scripts: ScriptItem[];
};

// 2. OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 3. 카테고리 검증 함수
function isValidCategory(value: string): value is Category {
  return value === "쿠팡" || value === "괴담";
}

// 4. 시스템 프롬프트 빌더 (E님의 기획안 100% 반영)
function buildSystemPrompt(category: Category, keyword: string): string {
  if (category === "쿠팡") {
    return `너는 20년 경력의 유튜브 쇼츠 제작자다.
목표: 유튜브 쇼츠용 60초 스크립트를 작성한다. 제품을 구매하려는 사람들이 "이거 모르고 살 뻔했다"라고 느끼게 만들어야 한다.
주제: ${keyword} 사기 전에 후회하지 않는 3가지

반드시 지켜야 할 규칙:
- 결과는 정확히 10개의 scripts 배열 요소로만 구성된 JSON이어야 한다.
- 각 줄은 3~4문장 이상의 매우 상세하고 긴 설명으로 작성하여 60초 분량을 확보한다.
- 첫 줄은 무조건: "아직도 ${keyword} 이렇게 사세요? 이러면 무조건 손해 봅니다!" 로 시작한다.
- 본문은 1번, 2번, 3번 형식의 핵심 팁과 그 이유를 아주 자세히 설명해야 한다.
- 마지막 줄은 무조건: "제가 비교해서 가성비 좋은 제품 몇 개만 골라놨습니다. 프로필 링크에 걸어놨으니까 확인 한번 해보세요." 로 끝낸다.
- 문장은 짧고 말하듯이 쓰되, 내용은 풍부하고 구체적으로 작성한다.
- 각 줄의 맨 끝에는 반드시 괄호를 열고 닫아 ( ) 20단어 이상의 상세한 Flux AI용 영어 이미지 프롬프트를 넣는다.
- JSON 외 다른 텍스트는 절대 출력하지 마라.`.trim();
  }

  return `너는 한국형 공포 쇼츠를 쓰는 숙련된 공포 작가다.
목표: 으스스하고 기괴한 60초 분량의 공포 대본을 만든다.
규칙:
- 정확히 10줄의 scripts 배열로 작성한다.
- 한국적 공포 키워드를 활용해 시각적 묘사를 극대화하고 4문장 이상 상세히 써라.
- 각 줄 끝에 ( )를 열고 Flux AI용 영어 이미지 프롬프트를 20단어 이상 상세히 포함하라.
- JSON 외 다른 텍스트는 절대 출력하지 마라.`.trim();
}

// 5. 메인 POST 핸들러
export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const body: GenerateRequestBody = await req.json();
    
    // 프론트엔드에서 keyword로 보내든 prompt로 보내든 모두 대응
    const keyword = (body.keyword || body.prompt || "제품").trim();
    const category = (body.category || "쿠팡").trim();

    if (!isValidCategory(category)) {
      return NextResponse.json({ error: "category는 '쿠팡' 또는 '괴담'이어야 합니다." }, { status: 400 });
    }

    const instructions = buildSystemPrompt(category, keyword);

    // OpenAI 호출 (가장 안정적인 Chat Completion 문법)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: `주제: ${keyword} 사기 전에 후회하지 않는 3가지` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const rawOutput = response.choices[0].message.content;

    if (!rawOutput) {
      return NextResponse.json({ error: "모델 응답이 비어 있습니다." }, { status: 500 });
    }

    // JSON 파싱 및 반환
    const parsed = JSON.parse(rawOutput) as GenerateResponseBody;

    // 만약 scripts 배열이 없거나 비어있으면 에러 처리
    if (!parsed.scripts || !Array.isArray(parsed.scripts)) {
      return NextResponse.json({ error: "응답 형식이 올바르지 않습니다." }, { status: 500 });
    }

    return NextResponse.json(parsed, { status: 200 });

  } catch (error: any) {
    console.error("Generate API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}