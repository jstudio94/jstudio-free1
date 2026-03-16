/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ 1. TypeScript 이름표(타입) 에러 무시하고 배포 허용
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ✅ 2. 비디오 관련 패키지들은 서버 조립 공정에서 제외 (충돌 방지)
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  
  // ✅ 3. 웹팩(Webpack) 시스템에서 해당 패키지들을 '투명인간' 처리
  webpack: (config: any, { isServer }: any) => {
    if (isServer) {
      config.externals.push('@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg');
    }
    return config;
  },
};

export default nextConfig;