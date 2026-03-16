/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. 타입 에러 무시 (필수)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 2. 비디오 패키지 외부 참조 (필수)
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  
  // 3. 웹팩 설정 (필수)
  webpack: (config: any, { isServer }: any) => {
    if (isServer) {
      config.externals.push('@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg');
    }
    return config;
  },
};

export default nextConfig;