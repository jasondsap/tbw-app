'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Clock, AlertTriangle, CheckCircle2, Users, BookOpen,
  ChevronRight, FileText, TrendingUp, Calendar, Zap,
  ArrowUpRight, Circle, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  intake_specialist: 'Intake Specialist',
  education_coordinator: 'Education Coordinator',
  advocate: 'Education Advocate',
  data_analyst: 'Data Analyst',
  site_lead: 'Site Lead',
  executive: 'Executive Director',
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  phone_call: 'Phone Call',
  text: 'Text',
  email: 'Email',
  in_person: 'In Person',
  meeting: 'Meeting',
  records_request: 'Records Request',
  other: 'Other',
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / 86400000)
}

function urgencyColor(days: number | null) {
  if (days === null || days >= 14) return 'text-red-600 bg-red-50 border-red-200'
  if (days >= 7) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-slate-500 bg-slate-50 border-slate-200'
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-teal-100 text-teal-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    referred: 'bg-amber-100 text-amber-800',
    stable: 'bg-purple-100 text-purple-800',
  }
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
      map[status] ?? 'bg-slate-100 text-slate-600')}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

interface Props {
  data: {
    myCases: any[]
    overdueNotes: any[]
    recentActivity: any[]
    stats: any
  }
  user: { id: string; role: string; name: string }
}

export function DashboardClient({ data, user }: Props) {
  const { myCases, overdueNotes, recentActivity, stats } = data
  const isAdvocate = user.role === 'advocate'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name.split(' ')[0]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header band */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{ROLE_LABELS[user.role]}</p>
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              {greeting}, {firstName} 👋
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Today</p>
            <p className="text-sm font-semibold text-slate-700">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-7 space-y-7">

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isAdvocate && (
            <KpiCard
              icon={<Users size={18} className="text-teal-600" />}
              label="Active Cases"
              value={stats?.my_active ?? 0}
              bg="bg-teal-50"
              href="/cases"
            />
          )}
          <KpiCard
            icon={<ClipboardList size={18} className="text-amber-600" />}
            label="Pending Intake"
            value={stats?.pending_intake ?? 0}
            bg="bg-amber-50"
            href="/intake"
          />
          <KpiCard
            icon={<CheckCircle2 size={18} className="text-purple-600" />}
            label="Stable Monitoring"
            value={stats?.stable_count ?? 0}
            bg="bg-purple-50"
            href="/stable"
          />
          <KpiCard
            icon={<TrendingUp size={18} className="text-blue-600" />}
            label="Goals In Progress"
            value={stats?.goals_in_progress ?? 0}
            bg="bg-blue-50"
            href="/goals"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Overdue notes alert */}
            {overdueNotes.length > 0 && (
              <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-red-100 bg-red-50">
                  <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                  <h2 className="text-sm font-bold text-red-800">
                    {overdueNotes.length} case{overdueNotes.length > 1 ? 's' : ''} need a note
                  </h2>
                  <span className="text-xs text-red-500 ml-auto">No contact in 7+ days</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {overdueNotes.map((c: any) => {
                    const days = c.days_since ?? daysSince(c.last_note)
                    return (
                      <Link
                        key={c.id}
                        href={`/cases/${c.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0',
                          urgencyColor(days)
                        )}>
                          {days ?? '?'}d
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {c.first_name} {c.last_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {c.case_number} · Last: {fmt(c.last_note)}
                          </p>
                        </div>
                        <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* My caseload */}
            {isAdvocate && myCases.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users size={15} className="text-teal-600" /> My Caseload
                  </h2>
                  <Link href="/cases" className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1">
                    View all <ArrowUpRight size={11} />
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {myCases.map((c: any) => {
                    const days = daysSince(c.last_note_date)
                    return (
                      <Link
                        key={c.id}
                        href={`/cases/${c.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              {c.first_name} {c.last_name}
                            </p>
                            <StatusPill status={c.status} />
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {c.current_school ?? 'No school'} · {c.open_goals ?? 0} open goals
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn(
                            'text-xs font-medium',
                            days !== null && days >= 7 ? 'text-red-600' :
                            days !== null && days >= 3 ? 'text-amber-600' : 'text-slate-400'
                          )}>
                            {days !== null ? `${days}d ago` : 'No notes'}
                          </p>
                          <p className="text-[10px] text-slate-300">last note</p>
                        </div>
                        <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500 ml-1 transition-colors" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent activity */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={15} className="text-slate-500" /> Recent Activity
                </h2>
              </div>
              {recentActivity.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No recent notes</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.map((note: any) => (
                    <Link
                      key={note.id}
                      href={`/cases/${note.case_id}`}
                      className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">
                            {note.first_name} {note.last_name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                            {NOTE_TYPE_LABELS[note.note_type] ?? note.note_type}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto">{fmt(note.interaction_date)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{note.content}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          by {note.author_first} {note.author_last} · {note.case_number}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — Quick links */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Zap size={14} className="text-amber-500" /> Quick Actions
              </h2>
              <div className="space-y-2">
                {[
                  { label: 'New Referral', href: '/intake/new', icon: ClipboardList, color: 'text-teal-600' },
                  { label: 'All Cases', href: '/cases', icon: Users, color: 'text-blue-600' },
                  { label: 'Goals Tracker', href: '/goals', icon: BookOpen, color: 'text-indigo-600' },
                  { label: 'Stable Cases', href: '/stable', icon: CheckCircle2, color: 'text-purple-600' },
                  { label: 'Sites', href: '/sites', icon: Calendar, color: 'text-amber-600' },
                  { label: 'Reports', href: '/reports', icon: TrendingUp, color: 'text-rose-600' },
                ].map(({ label, href, icon: Icon, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <Icon size={15} className={color} />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      {label}
                    </span>
                    <ChevronRight size={13} className="text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Involvement score reminder */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Circle size={8} className="fill-teal-300 text-teal-300" />
                <span className="text-xs font-semibold text-teal-200 uppercase tracking-wide">Tip</span>
              </div>
              <p className="text-sm font-semibold leading-snug mb-3">
                Case notes are due within 2–3 business days of any interaction.
              </p>
              <p className="text-xs text-teal-200 leading-relaxed">
                Timely notes protect against gaps in grant reporting and keep the team informed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon, label, value, bg, href,
}: {
  icon: React.ReactNode
  label: string
  value: number
  bg: string
  href: string
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3.5 group">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 leading-tight">{label}</p>
      </div>
      <ArrowUpRight size={13} className="text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" />
    </Link>
  )
}
