'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, ClipboardList, BookOpen,
  BarChart3, MapPin, Settings, LogOut, Bell,
  ChevronDown, BookMarked, Layers, ClipboardCheck,
} from 'lucide-react'

const NAV_ITEMS = [
  {
    label: 'Intake',
    icon: ClipboardList,
    href: '/intake',
    roles: ['admin', 'intake_specialist', 'education_coordinator'],
  },
  {
    label: 'Cases',
    icon: Users,
    href: '/cases',
    roles: ['admin', 'advocate', 'education_coordinator', 'intake_specialist'],
  },
  {
    label: 'Coordinator',
    icon: Layers,
    href: '/coordinator',
    roles: ['admin', 'education_coordinator'],
  },
  {
    label: 'Stable',
    icon: ClipboardCheck,
    href: '/stable',
    roles: ['admin', 'executive', 'data_analyst'],
  },
  {
    label: 'Goals',
    icon: BookOpen,
    href: '/goals',
    roles: ['admin', 'advocate', 'education_coordinator'],
  },
  {
    label: 'Sites',
    icon: MapPin,
    href: '/sites',
    roles: ['admin', 'site_lead', 'education_coordinator'],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    href: '/reports',
    roles: ['admin', 'executive', 'data_analyst', 'education_coordinator'],
  },
]

interface SidebarProps {
  userName?: string
  userRole?: string
  userInitials?: string
  notificationCount?: number
}

export function Sidebar({
  userName = 'Staff User',
  userRole = 'advocate',
  userInitials = 'SU',
  notificationCount = 0,
}: SidebarProps) {
  const pathname = usePathname()

  const roleLabel: Record<string, string> = {
    admin:                 'Admin',
    intake_specialist:     'Intake Specialist',
    education_coordinator: 'Coordinator',
    advocate:              'Advocate',
    data_analyst:          'Data Analyst',
    site_lead:             'Site Lead',
    executive:             'Executive',
  }

  return (
    <aside
      className="flex flex-col w-60 min-h-screen flex-shrink-0"
      style={{ background: 'var(--color-sidebar-bg)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b"
        style={{ borderColor: 'var(--color-sidebar-border)' }}>
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
          <BookMarked size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold font-display leading-tight">
            The Book Works
          </p>
          <p className="text-xs" style={{ color: 'var(--color-sidebar-text)' }}>
            Advocacy Platform
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <Link href="/dashboard" className={cn(
          'nav-item',
          pathname === '/dashboard' && 'active'
        )}>
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </Link>

        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(`/${item.href.replace('/', '')}`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('nav-item', active && 'active')}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t pt-4"
        style={{ borderColor: 'var(--color-sidebar-border)' }}>
        {/* Notifications */}
        <button className="nav-item w-full justify-between">
          <div className="flex items-center gap-3">
            <Bell size={17} />
            <span>Notifications</span>
          </div>
          {notificationCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        <Link href="/settings" className="nav-item">
          <Settings size={17} />
          <span>Settings</span>
        </Link>

        {/* User info */}
        <div className="mt-3 px-2 py-2.5 rounded-lg flex items-center gap-2.5"
          style={{ background: 'var(--color-sidebar-active)' }}>
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--color-sidebar-text)' }}>
              {roleLabel[userRole] ?? userRole}
            </p>
          </div>
          <a href="/api/auth/signout" className="text-slate-400 hover:text-white transition-colors" title="Sign out">
            <LogOut size={15} />
          </a>
        </div>
      </div>
    </aside>
  )
}
