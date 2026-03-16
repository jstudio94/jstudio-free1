import { NextResponse } from "next/server";

export const runtime = "nodejs";

function toDataUrl(contentType: string, buffer: Buffer) {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "이미지 URL이 없습니다." },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: url,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `이미지 프록시 다운로드 실패: ${url}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return NextResponse.json({
      base64: toDataUrl(contentType, buffer),
    });
  } catch (error: any) {
    console.error("image-proxy error:", error);
    return NextResponse.json(
      {
        error: error?.message || "이미지 프록시 서버 오류",
      },
      { status: 500 }
    );
  }
}