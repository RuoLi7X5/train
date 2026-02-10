import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript 构建检查已启用，确保类型安全
  // 注：如需临时跳过检查用于紧急部署，可设置 typescript.ignoreBuildErrors: true
  
  // ESLint 暂时保持忽略，后续可开启
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
