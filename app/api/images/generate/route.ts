import { NextResponse } from "next/server";

export const maxDuration = 300;
export const runtime = "nodejs";

type PromptMode = "coupang" | "horror" | "general";

function normalizePromptLines(input: string, limit = 5) {
  return input
    .split("\n")
    .filter(
      (line: string) =>
        line.trim().match(/^\d+\./) || line.trim().length > 10
    )
    .map((line: string) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((line: string) => line.length > 0)
    .slice(0, limit);
}

function getPromptMode(category: string): PromptMode {
  if (String(category).includes("쿠팡") || String(category).includes("제품")) {
    return "coupang";
  }
  if (
    String(category).includes("괴담") ||
    String(category).includes("공포")
  ) {
    return "horror";
  }
  return "general";
}

function buildPromptInstruction(
  mode: PromptMode,
  stylePreset: string,
  promptCount: number
) {
  const styleGuideMap: Record<string, string> = {
    하이퍼리얼리즘:
      "photorealistic, ultra detailed, realistic lighting, natural material texture, cinematic realism",
    동화풍:
      "storybook illustration, whimsical mood, soft pastel palette, magical atmosphere",
    캐릭터풍:
      "character focused illustration, expressive face, stylized costume design, clean composition",
    애니풍:
      "anime style illustration, vibrant colors, polished shading, cinematic framing",
    웹툰풍:
      "webtoon style art, clean lines, dramatic composition, vivid digital coloring",
    시네마틱:
      "cinematic composition, dramatic lighting, strong depth, premium visual storytelling",
    제품광고풍:
      "commercial product advertising style, premium studio setup, attractive highlights, clean marketing image",
    감성풍:
      "soft emotional atmosphere, warm lighting, tasteful composition, aesthetic storytelling",
    공포풍:
      "tense eerie atmosphere, unsettling composition, dramatic shadows, moody cinematic horror",
  };

  const styleGuide =
    styleGuideMap[stylePreset] ||
    "clean, highly detailed, visually appealing composition";

  if (mode === "coupang") {
    return `Create exactly ${promptCount} premium English image prompts for product or shopping style visuals.
Rules:
1. Output exactly ${promptCount} numbered lines.
2. English only.
3. No parentheses.
4. Each line should be at least 20 words.
5. Reflect the selected style strongly.
Style preset: ${stylePreset}
Style direction: ${styleGuide}`;
  }

  if (mode === "horror") {
    return `Create exactly ${promptCount} premium English image prompts for cinematic horror visuals.
Rules:
1. Output exactly ${promptCount} numbered lines.
2. English only.
3. No parentheses.
4. Each line should be at least 24 words.
5. Match scene progression naturally.
Style preset: ${stylePreset}
Style direction: ${styleGuide}`;
  }

  return `Create exactly ${promptCount} premium English image prompts from the script.
Rules:
1. Output exactly ${promptCount} numbered lines.
2. English only.
3. No parentheses.
4. Each line should be at least 20 words.
5. Match the story flow naturally.
Style preset: ${stylePreset}
Style direction: ${styleGuide}`;
}

function mapGoogleTextModel(model?: string) {
  const raw = String(model || "").trim();
  if (
    !raw ||
    raw.includes("image-preview") ||
    raw.includes("flash-image") ||
    raw.includes("pro-image")
  ) {
    return "gemini-2.5-flash";
  }
  return raw;
}

function mapGoogleImageModel(model?: string) {
  const raw = String(model || "").trim();
  if (!raw || !raw.includes("image")) {
    return "gemini-3.1-flash-image-preview";
  }
  return raw;
}

function mapOpenAITextModel(model?: string) {
  const raw = String(model || "").trim();
  if (!raw || raw.startsWith("gpt-image-")) {
    return "gpt-4.1-mini";
  }
  return raw;
}

function mapOpenAIImageModel(model?: string) {
  const raw = String(model || "").trim();
  if (!raw || !raw.startsWith("gpt-image-")) {
    return "gpt-image-1";
  }
  return raw;
}

async function callGoogleText({
  apiKey,
  model,
  instruction,
  userText,
}: {
  apiKey: string;
  model: string;
  instruction: string;
  userText: string;
}) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: instruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userText }],
          },
        ],
      }),
    }
  );

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Google text API error: ${res.status} - ${raw}`);
  }

  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Google text API 응답을 파싱할 수 없습니다.");
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text || "")
      .join("\n")
      .trim() || "";

  if (!text) {
    throw new Error("Google text API가 텍스트를 반환하지 않았습니다.");
  }

  return text;
}

async function callGoogleImage({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    }
  );

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Google image API error: ${res.status} - ${raw}`);
  }

  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Google image API 응답을 파싱할 수 없습니다.");
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part: any) => part?.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Google image API returned no image data.");
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}

async function callOpenAIText({
  apiKey,
  model,
  instruction,
  userText,
}: {
  apiKey: string;
  model: string;
  instruction: string;
  userText: string;
}) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: instruction,
      input: userText,
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`OpenAI text API error: ${res.status} - ${raw}`);
  }

  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("OpenAI text API 응답을 파싱할 수 없습니다.");
  }

  const outputText =
    data?.output_text ||
    data?.output
      ?.flatMap((item: any) => item?.content || [])
      ?.map((content: any) => content?.text || "")
      ?.join("\n")
      ?.trim() ||
    "";

  if (!outputText) {
    throw new Error("OpenAI text API returned no text.");
  }

  return outputText;
}

async function callOpenAIImage({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1536",
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`OpenAI image API error: ${res.status} - ${raw}`);
  }

  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("OpenAI image API 응답을 파싱할 수 없습니다.");
  }

  const b64 = data?.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("OpenAI image API returned no image data.");
  }

  return `data:image/png;base64,${b64}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      script,
      customPrompt,
      engine,
      category = "제품/광고",
      stylePreset = "하이퍼리얼리즘",
      promptCount = 5,
      provider = "google",
      model,
      userApiKey,
    } = body;

    const apiKey = String(userApiKey || "").trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key가 없습니다." },
        { status: 400 }
      );
    }

    if (engine === "prompt") {
      if (!script || !String(script).trim()) {
        return NextResponse.json(
          { error: "대본 데이터가 없습니다." },
          { status: 400 }
        );
      }

      const safePromptCount = Math.max(
        1,
        Math.min(20, Number(promptCount) || 5)
      );

      const mode = getPromptMode(String(category));
      const instruction = buildPromptInstruction(
        mode,
        String(stylePreset),
        safePromptCount
      );

      const userText = `Category: ${category}
Style preset: ${stylePreset}

Script:
${script}`;

      let extractedPrompt = "";

      if (provider === "google") {
        extractedPrompt = await callGoogleText({
          apiKey,
          model: mapGoogleTextModel(model),
          instruction,
          userText,
        });
      } else if (provider === "openai") {
        extractedPrompt = await callOpenAIText({
          apiKey,
          model: mapOpenAITextModel(model),
          instruction,
          userText,
        });
      } else {
        return NextResponse.json(
          { error: "지원하지 않는 provider입니다." },
          { status: 400 }
        );
      }

      return NextResponse.json({ extractedPrompt });
    }

    if (engine === "whisk") {
      if (!customPrompt || !String(customPrompt).trim()) {
        return NextResponse.json(
          { error: "추출된 프롬프트가 없습니다." },
          { status: 400 }
        );
      }

      const promptArray = normalizePromptLines(customPrompt, 1);

      if (promptArray.length === 0) {
        return NextResponse.json(
          { error: "프롬프트를 분리할 수 없습니다." },
          { status: 400 }
        );
      }

      const imageUrls: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < promptArray.length; i++) {
        try {
          const prompt = `${promptArray[i]}. Style preset: ${stylePreset}. No text in image.`;

          let imageDataUrl = "";

          if (provider === "google") {
            imageDataUrl = await callGoogleImage({
              apiKey,
              model: mapGoogleImageModel(model),
              prompt,
            });
          } else if (provider === "openai") {
            imageDataUrl = await callOpenAIImage({
              apiKey,
              model: mapOpenAIImageModel(model),
              prompt,
            });
          } else {
            throw new Error("지원하지 않는 provider입니다.");
          }

          imageUrls.push(imageDataUrl);
          errors.push("");
        } catch (imgErr: any) {
          console.error(`${i + 1}번째 이미지 생성 실패:`, imgErr.message);
          imageUrls.push("");
          errors.push(imgErr.message || "이미지 생성 실패");
        }
      }

      return NextResponse.json({ imageUrls, errors });
    }

    return NextResponse.json(
      { error: "알 수 없는 요청 방식입니다." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Image Generate API Error:", error.message);
    return NextResponse.json(
      { error: error.message || "이미지 생성 API 오류" },
      { status: 500 }
    );
  }
}