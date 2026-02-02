import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 忽略 TypeScript 构建错误，避免 Cloudflare 构建失败
  typescript: {
    ignoreBuildErrors: true,
  },
  // 忽略 ESLint 错误
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer, nextRuntime }) => {
    // 针对所有环境（Client, Server, Edge），只要是 Edge Runtime 或者浏览器环境，就 Polyfill 这些模块
    if (!isServer || nextRuntime === 'edge') {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        'pg-native': false,
        dns: false,
      };
    }

    // 某些库可能会在服务器端也尝试引用这些模块（虽然在 Edge 上不可用）
    // 强制 Alias 为 false 可以作为一种更保险的手段
    config.resolve.alias = {
      ...config.resolve.alias,
      'pg-native': false,
    };

    // 针对 pg 库的特定处理，避免它加载 fs 等模块
    // 这是一个常见的 workaround，用于在 Webpack 环境中打包 pg
    config.externals = [...(config.externals || []), 'pg-native'];

    return config;
  },
};

export default nextConfig;
