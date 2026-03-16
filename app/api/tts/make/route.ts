import OpenAI from "openai";
import { NextResponse } from "next/server";

export const maxDuration = 300;
export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, voice = "nova" } = body;

    // 1. 예외 처리: 대본이 없으면 에러 반환
    if (!text) {
      return NextResponse.json({ error: "TTS 변환할 텍스트가 없습니다. 대본을 먼저 입력하세요." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    // 🌟 2. OpenAI TTS API 호출 (빠르고 자연스러운 tts-1 모델 사용)
    const response = await openai.audio.speech.create({
      model: "tts-1", // 만약 초고음질이 필요하시면 "tts-1-hd"로 변경하세요.
      voice: voice as "nova" | "onyx" | "shimmer" | "alloy" | "echo" | "fable",
      input: text,
    });

    // 🌟 3. 파일 저장 없이 즉시 재생 가능하도록 Base64 URL로 변환
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64Audio = buffer.toString("base64");
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

    // 4. 프론트엔드가 기다리고 있는 { url: "..." } 형태로 반환
    return NextResponse.json({ url: audioUrl });

  } catch (error: any) {
    console.error("TTS Generate Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}