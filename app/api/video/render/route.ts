import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// @ts-ignore
import ffmpeg from "fluent-ffmpeg";
// @ts-ignore
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export const runtime = "nodejs";
export const maxDuration = 600;

function toFfmpegPath(p: string) {
  return p.replace(/\\/g, "/");
}

function escapeDrawtext(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/%/g, "\\%")
    .replace(/\n/g, " ");
}

function parseBase64DataUrl(dataUrl: string) {
  const match = dataUrl.match(
    /^data:([a-zA-Z0-9/+.-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/
  );
  if (!match) return null;

  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getImageExtensionFromMime(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  return "jpg";
}

function getAudioExtensionFromMime(mimeType: string) {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "mp3";
}

async function saveImageInputToFile(input: string, outputBasePath: string) {
  const parsed = parseBase64DataUrl(input);

  if (parsed && parsed.mimeType.startsWith("image/")) {
    const ext = getImageExtensionFromMime(parsed.mimeType);
    const filePath = `${outputBasePath}.${ext}`;
    fs.writeFileSync(filePath, Buffer.from(parsed.base64Data, "base64"));
    return filePath;
  }

  if (typeof input === "string" && input.startsWith("/")) {
    const absolutePath = path.join(
      process.cwd(),
      "public",
      input.replace(/^\//, "")
    );

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`로컬 이미지 파일을 찾을 수 없습니다: ${input}`);
    }

    const ext = path.extname(absolutePath) || ".jpg";
    const filePath = `${outputBasePath}${ext}`;
    fs.copyFileSync(absolutePath, filePath);
    return filePath;
  }

  if (typeof input === "string" && /^https?:\/\//i.test(input)) {
    const response = await fetch(input, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`외부 이미지 다운로드 실패: ${input}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = getImageExtensionFromMime(contentType);
    const arrayBuffer = await response.arrayBuffer();
    const filePath = `${outputBasePath}.${ext}`;

    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    return filePath;
  }

  throw new Error("지원하지 않는 이미지 형식입니다.");
}

async function saveAudioInputToFile(input: string, outputBasePath: string) {
  const parsed = parseBase64DataUrl(input);

  if (parsed && parsed.mimeType.startsWith("audio/")) {
    const ext = getAudioExtensionFromMime(parsed.mimeType);
    const filePath = `${outputBasePath}.${ext}`;
    fs.writeFileSync(filePath, Buffer.from(parsed.base64Data, "base64"));
    return filePath;
  }

  if (typeof input === "string" && input.startsWith("/")) {
    const absolutePath = path.join(
      process.cwd(),
      "public",
      input.replace(/^\//, "")
    );

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`로컬 오디오 파일을 찾을 수 없습니다: ${input}`);
    }

    const ext = path.extname(absolutePath) || ".mp3";
    const filePath = `${outputBasePath}${ext}`;
    fs.copyFileSync(absolutePath, filePath);
    return filePath;
  }

  if (typeof input === "string" && /^https?:\/\//i.test(input)) {
    const response = await fetch(input, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        Accept: "audio/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`외부 오디오 다운로드 실패: ${input}`);
    }

    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const ext = getAudioExtensionFromMime(contentType);
    const arrayBuffer = await response.arrayBuffer();
    const filePath = `${outputBasePath}.${ext}`;

    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    return filePath;
  }

  throw new Error("지원하지 않는 오디오 형식입니다.");
}

function cleanupFiles(paths: string[]) {
  try {
    paths.forEach((p) => {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    });
  } catch (e) {
    console.warn("Cleanup error:", e);
  }
}

export async function POST(req: Request) {
  let tempDir = "";
  let audioPath = "";
  let outputPath = "";
  let imagePaths: string[] = [];

  try {
    const body = await req.json();
    const { images, audio, title, script, style, bgmType } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });
    }

    if (!audio || typeof audio !== "string") {
      return NextResponse.json({ error: "오디오가 없습니다." }, { status: 400 });
    }

    const safeStyle = {
      position: style?.position || "bottom",
      color: style?.color || "#ffffff",
      fontSize: Number(style?.fontSize) || 48,
    };

    tempDir = path.join(process.cwd(), "public", "temp_video");
    ensureDir(tempDir);

    const timestamp = Date.now();
    outputPath = path.join(tempDir, `output_${timestamp}.mp4`);

    audioPath = await saveAudioInputToFile(
      audio,
      path.join(tempDir, `audio_${timestamp}`)
    );

    for (let i = 0; i < images.length; i++) {
      const savedPath = await saveImageInputToFile(
        images[i],
        path.join(tempDir, `img_${timestamp}_${i}`)
      );
      imagePaths.push(savedPath);
    }

    if (imagePaths.length === 0) {
      return NextResponse.json(
        { error: "저장된 이미지가 없습니다." },
        { status: 400 }
      );
    }

    const bgmPathRaw =
      bgmType && bgmType !== "none"
        ? path.join(process.cwd(), "public", "bgm", `${bgmType}.mp3`)
        : null;

    const bgmPath = bgmPathRaw ? toFfmpegPath(path.resolve(bgmPathRaw)) : null;
    const ffmpegAudioPath = toFfmpegPath(path.resolve(audioPath));
    const ffmpegOutputPath = toFfmpegPath(path.resolve(outputPath));
    const ffmpegImagePaths = imagePaths.map((p) => toFfmpegPath(path.resolve(p)));

    const scriptLines =
      typeof script === "string"
        ? script
            .split("\n")
            .map((line: string) => line.trim())
            .filter((line: string) => line && !line.includes("("))
        : [];

    const rawText =
      scriptLines.length > 0
        ? scriptLines[0]
        : typeof title === "string" && title.trim()
        ? title.trim()
        : "J-STUDIO Shorts";

    const cleanText = escapeDrawtext(rawText);
    const fontPath = "C\\:/Windows/Fonts/malgun.ttf";

    let yPos = "h-text_h-100";
    if (safeStyle.position === "top") yPos = "100";
    else if (safeStyle.position === "middle") yPos = "(h-text_h)/2";

    const durationPerImage = 12;

    return await new Promise<Response>((resolve) => {
      let command = ffmpeg();

      ffmpegImagePaths.forEach((imgPath) => {
        command = command
          .input(imgPath)
          .inputOptions(["-loop 1", "-t 12"]);
      });

      command = command.input(ffmpegAudioPath);

      const filterParts: string[] = [];
      const videoLabels: string[] = [];

      for (let i = 0; i < ffmpegImagePaths.length; i++) {
        const label = `v${i}`;
        videoLabels.push(`[${label}]`);
        filterParts.push(
          `[${i}:v]scale=768:1344,setsar=1,fps=30,format=yuv420p,trim=duration=${durationPerImage},setpts=PTS-STARTPTS[${label}]`
        );
      }

      filterParts.push(
        `${videoLabels.join("")}concat=n=${ffmpegImagePaths.length}:v=1:a=0[vcat]`
      );

      filterParts.push(
        `[vcat]drawtext=fontfile='${fontPath}':text='${cleanText}':fontcolor=${safeStyle.color}:fontsize=${safeStyle.fontSize}:x=(w-text_w)/2:y=${yPos}[vout]`
      );

      const audioInputIndex = ffmpegImagePaths.length;

      if (bgmPath && bgmPathRaw && fs.existsSync(bgmPathRaw)) {
        const bgmInputIndex = ffmpegImagePaths.length + 1;

        command = command
          .input(bgmPath)
          .complexFilter([
            ...filterParts,
            `[${audioInputIndex}:a]volume=1.0[voice]`,
            `[${bgmInputIndex}:a]volume=0.2[bgm]`,
            `[voice][bgm]amix=inputs=2:duration=first[aout]`,
          ])
          .outputOptions(["-map [vout]", "-map [aout]"]);
      } else {
        command = command
          .complexFilter([
            ...filterParts,
            `[${audioInputIndex}:a]anull[aout]`,
          ])
          .outputOptions(["-map [vout]", "-map [aout]"]);
      }

      command
        .outputOptions([
          "-c:v libx264",
          "-pix_fmt yuv420p",
          "-shortest",
          "-r 30",
        ])
        .save(ffmpegOutputPath)
        .on("end", () => {
          cleanupFiles([audioPath, ...imagePaths]);

          resolve(
            NextResponse.json({
              videoUrl: `/temp_video/${path.basename(outputPath)}`,
            })
          );
        })
        .on("error", (err: any) => {
          console.error("FFmpeg Error Full:", err);

          cleanupFiles([audioPath, ...imagePaths]);

          resolve(
            NextResponse.json(
              {
                error: err?.message || "비디오 생성 중 오류 발생",
                detail: String(err),
                tempDir,
                audioPath: ffmpegAudioPath,
                imageCount: imagePaths.length,
                outputPath: ffmpegOutputPath,
                bgmPath: bgmPath || null,
                imagePaths: ffmpegImagePaths,
                filterParts,
              },
              { status: 500 }
            )
          );
        });
    });
  } catch (error: any) {
    console.error("POST Error Full:", error);

    cleanupFiles([audioPath, ...imagePaths]);

    return NextResponse.json(
      {
        error: error?.message || "서버 오류",
        detail: String(error),
        tempDir,
        audioPath: audioPath ? toFfmpegPath(path.resolve(audioPath)) : "",
        imageCount: imagePaths.length,
        outputPath: outputPath ? toFfmpegPath(path.resolve(outputPath)) : "",
      },
      { status: 500 }
    );
  }
}