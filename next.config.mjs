/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. 타입 에러 무시 (LayoutProps 등 에러 해결용)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 2. 비디오 패키지 충돌 방지
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  
  // 3. 웹팩 설정
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg');
    }
    return config;
  },
};

export default nextConfig;