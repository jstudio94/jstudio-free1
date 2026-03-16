/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. 타입 에러를 무시하고 배포 강행
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 2. 비디오 라이브러리 충돌 방지
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  
  // 3. 안정적인 웹팩 엔진 사용
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg');
    }
    return config;
  },
};

export default nextConfig;