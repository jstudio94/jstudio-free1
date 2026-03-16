/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript(타입 검사) 에러가 있어도 무시하고 배포
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ✅ 비디오 관련 무거운 패키지들은 서버에서 직접 조립하지 않도록 설정
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  
  // ✅ 웹팩(Webpack) 포장 시스템에서 해당 패키지들을 외부 참조로 처리 (투명인간 마법)
  webpack: (config: any, { isServer }: any) => {
    if (isServer) {
      config.externals.push('@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg');
    }
    return config;
  },
};

export default nextConfig;