import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🌟 [핵심] Next.js가 무거운 FFmpeg 실행 파일을 웹용으로 압축하려다 터지는 것을 막습니다.
  serverExternalPackages: ["fluent-ffmpeg", "@ffmpeg-installer/ffmpeg"],
  
  // (만약 기존에 사용하시던 다른 설정들이 있었다면 이 아래에 계속 유지됩니다.)
};

export default nextConfig;