import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import StudentsClient from './StudentsClient'
import SuperAdminStudentsClient from './SuperAdminStudentsClient'

export const runtime = 'edge';

export default async function StudentsPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role === 'SUPER_ADMIN') {
    return <SuperAdminStudentsClient />
  }

  return <StudentsClient userRole={session.user.role} userId={session.user.id} />
}
