每日打卡系统
================

一个用于学生日常打卡统计与训练管理的 Web 应用。

## 功能特性

- **每日一题**: 管理员发布题目，学生在线解答。
- **打卡统计**: GitHub 风格的热力图展示学习进度。
- **互动交流**: 学生提交解答后可参与评论讨论。
- **图片上传**: 支持图片解答，接入 Cloudflare R2 存储。
- **多端适配**: 响应式设计，支持手机和电脑访问。

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v3
- **数据库**: PostgreSQL (Supabase) + Prisma
- **部署**: Cloudflare Pages

## 部署说明

本项目已配置为适配 Cloudflare Pages (Edge Runtime)。
- 数据库连接需配置 `DATABASE_URL`。
- 图片上传需绑定 Cloudflare R2 Bucket `MY_BUCKET`。
