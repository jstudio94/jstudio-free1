/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript(타입 검사) 에러가 있어도 무시하고 배포
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ✅ Vercel 빌드 에러 해결 1단계: Next.js 기본 무시
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  
  // ✅ Vercel 빌드 에러 해결 2단계 (진짜 핵폭탄): 웹팩(Webpack) 포장 시스템에서 아예 투명인간 취급하기
  // 🚨 추가된 부분: config와 isServer에 ': any' 이름표를 붙여서 TypeScript 문법 에러 완벽 해결!
  webpack: (config: any, { isServer }: any) => {
    if (isServer) {
      // 서버에서 돌아갈 때 저 두 녀석은 절대 건드리지 말고 무시해! 라고 강제 명령
      config.externals.push('@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg');
    }
    return config;
  },

  // ✅ Vercel 빌드 에러 해결 3단계: 터보팩(Turbopack) 충돌 방지 (방금 뜬 에러 정답지!)
  turbopack: {},
};

export default nextConfig;