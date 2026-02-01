import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    // 尝试获取 Cloudflare R2 Binding
    let env
    try {
        const ctx = getRequestContext()
        env = ctx.env
    } catch (e) {
        env = process.env
    }

    // 如果存在 MY_BUCKET 绑定 (Cloudflare 环境)，则上传到 R2
    if (env && env.MY_BUCKET) {
        const timestamp = Date.now()
        // 文件名处理：移除空格，转为 ASCII 安全字符
        const safeName = file.name.replace(/\s+/g, '-').replace(/[^\x00-\x7F]/g, 'file')
        const filename = `${timestamp}-${safeName}`

        await env.MY_BUCKET.put(filename, file.stream(), {
            httpMetadata: { contentType: file.type }
        })

        // 获取 R2 公开访问域名
        const publicUrl = env.R2_PUBLIC_URL || 'https://pub-e0a8ac01b47641388d7e40f5494a6a2e.r2.dev'
        const url = `${publicUrl}/${filename}`

        return NextResponse.json({ success: true, url })
    }

    // 本地开发环境回退方案：转为 Base64 Data URL
    // 因为本地没有 R2 绑定，且 Edge Runtime 本地模拟不支持 fs 写入
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'
    const dataUrl = `data:${mimeType};base64,${base64}`

    return NextResponse.json({ 
      success: true, 
      url: dataUrl 
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 })
  }
}
