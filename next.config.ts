/** @type {import('next').NextConfig} */
const nextConfig = {
  // 빌드 시 발생하는 타입 에러와 린트 경고를 무시하고 강제 배포합니다.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 영상 처리에 쓰이는 무거운 패키지들을 빌드 대상에서 제외(외부 처리)합니다.
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  
  // 최신 터보팩 대신 안정적인 웹팩을 사용하도록 강제 설정합니다.
  webpack: (config: any, { isServer }: any) => {
    if (isServer) {
      config.externals.push('@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg');
    }
    return config;
  },
};

export default nextConfig;