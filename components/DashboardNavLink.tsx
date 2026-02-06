'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/components/ui'

type DashboardNavLinkProps = {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}

export default function DashboardNavLink({ href, icon, children }: DashboardNavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href
  const isSectionActive = href !== '/dashboard' && pathname?.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (isActive) {
          event.preventDefault()
        }
      }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors font-medium',
        (isActive || isSectionActive) && 'bg-blue-50 text-blue-600 font-bold'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      {children}
    </Link>
  )
}
