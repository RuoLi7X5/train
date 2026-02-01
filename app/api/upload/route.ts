import { NextResponse } from 'next/server'

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    // 在 Edge 环境下无法写入文件系统
    // 临时解决方案：将图片转换为 Base64 字符串返回
    // 客户端收到后，将这个 Base64 字符串作为 imageUrl 存储
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'
    const dataUrl = `data:${mimeType};base64,${base64}`

    return NextResponse.json({ 
      success: true, 
      url: dataUrl // 这里返回的是 Base64 数据，前端会把它当做 URL 使用
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 })
  }
}
