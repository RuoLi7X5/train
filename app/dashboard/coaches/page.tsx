import CoachesClient from './CoachesClient'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const runtime = 'edge'

export default async function CoachesPage() {
  const session = await getSession()
  
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard')
  }

  return <CoachesClient />
}