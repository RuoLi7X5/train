import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 强制所有路由使用 Edge Runtime，适配 Cloudflare Pages
export const runtime = 'edge';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "每日打卡系统",
  description: "日常学生打卡统计与训练管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
