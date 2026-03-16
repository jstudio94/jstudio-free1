/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript(타입 검사) 에러가 있어도 무시하고 배포
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;