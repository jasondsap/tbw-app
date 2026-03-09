import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/cognito'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('[layout] calling getSession...')
  const session = await getSession()
  console.log('[layout] session result:', session ? `OK user=${session.email}` : 'NULL')

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        userName={`${session.firstName} ${session.lastName}`}
        userRole={session.role}
        userInitials={session.initials}
        notificationCount={0}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
