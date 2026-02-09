import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { message: 'Upload disabled in current deployment' },
    { status: 501 }
  )
}
