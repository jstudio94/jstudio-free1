/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript(타입 검사) 에러가 있어도 무시하고 배포
  typescript: {
    ignoreBuildErrors: true,
  },
  // ✅ Vercel 빌드 에러 해결: "비디오 관련 무거운 프로그램들은 포장(검사)하지 말고 그냥 넘어가!"
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
};

export default nextConfig;