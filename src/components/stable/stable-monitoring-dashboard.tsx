'use client'
import { useState, useMemo } from 'react'
import { ClipboardCheck, AlertCircle, Clock, CheckCircle2, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getUrgency,
  type StableCase,
} from './types'
import { StableCaseCard } from './stable-case-card'

type FilterTab = 'all' | 'overdue' | 'due_soon' | 'upcoming' | 'closed'

function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="card flex items-center gap-3 py-4">
      <div className={cn('p-2.5 rounded-xl', color)}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 font-display leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export function StableMonitoringDashboard({ initialCases }: { initialCases: StableCase[] }) {
  const [cases,     setCases]     = useState<StableCase[]>(initialCases)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const updateCase = (updated: StableCase) => {
    setCases(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const open   = cases.filter(c => !c.closedAt)
    const closed = cases.filter(c => !!c.closedAt)
    const overdue  = open.filter(c => getUrgency(c.stableDueDate) === 'overdue')
    const dueSoon  = open.filter(c => getUrgency(c.stableDueDate) === 'due_soon')
    const upcoming = open.filter(c => getUrgency(c.stableDueDate) === 'upcoming')
    return { open: open.length, overdue: overdue.length, dueSoon: dueSoon.length, upcoming: upcoming.length, closed: closed.length }
  }, [cases])

  // ── Filtered + sorted list ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = cases
    if (activeTab === 'overdue')  list = list.filter(c => !c.closedAt && getUrgency(c.stableDueDate) === 'overdue')
    if (activeTab === 'due_soon') list = list.filter(c => !c.closedAt && getUrgency(c.stableDueDate) === 'due_soon')
    if (activeTab === 'upcoming') list = list.filter(c => !c.closedAt && getUrgency(c.stableDueDate) === 'upcoming')
    if (activeTab === 'closed')   list = list.filter(c => !!c.closedAt)
    if (activeTab === 'all')      list = list.filter(c => !c.closedAt)

    // Sort: overdue first (most days over), then due_soon by days remaining, then upcoming
    return [...list].sort((a, b) => {
      const ua = a.closedAt ? 3 : getUrgency(a.stableDueDate) === 'overdue' ? 0 : getUrgency(a.stableDueDate) === 'due_soon' ? 1 : 2
      const ub = b.closedAt ? 3 : getUrgency(b.stableDueDate) === 'overdue' ? 0 : getUrgency(b.stableDueDate) === 'due_soon' ? 1 : 2
      if (ua !== ub) return ua - ub
      return new Date(a.stableDueDate).getTime() - new Date(b.stableDueDate).getTime()
    })
  }, [cases, activeTab])

  const tabs: { id: FilterTab; label: string; count: number; color?: string }[] = [
    { id: 'all',      label: 'Open',      count: stats.open },
    { id: 'overdue',  label: 'Overdue',   count: stats.overdue,  color: 'text-red-600' },
    { id: 'due_soon', label: 'Due Soon',  count: stats.dueSoon,  color: 'text-amber-600' },
    { id: 'upcoming', label: 'Upcoming',  count: stats.upcoming },
    { id: 'closed',   label: 'Closed',    count: stats.closed },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-display">Stable Monitoring</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track the 30-day post-exit window. Pull attendance records at the due date, then close or refer back.
        </p>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="In window"    value={stats.open}     icon={ClipboardCheck} color="bg-teal-500" />
        <StatCard label="Overdue"      value={stats.overdue}  icon={AlertCircle}    color="bg-red-500" />
        <StatCard label="Due this week" value={stats.dueSoon} icon={Clock}          color="bg-amber-500" />
        <StatCard label="Closed"       value={stats.closed}   icon={CheckCircle2}   color="bg-slate-400" />
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-0 -mb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
              activeTab === tab.id
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                activeTab === tab.id
                  ? 'bg-teal-100 text-teal-700'
                  : tab.color
                    ? cn('bg-red-50 text-red-600', tab.id === 'due_soon' && 'bg-amber-50 text-amber-600')
                    : 'bg-slate-100 text-slate-500'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Case list ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">
            <ClipboardCheck size={32} className="mx-auto mb-3 opacity-30" />
            {activeTab === 'overdue'  && 'No overdue cases — great!'}
            {activeTab === 'due_soon' && 'Nothing due this week.'}
            {activeTab === 'upcoming' && 'No upcoming cases.'}
            {activeTab === 'closed'   && 'No closed cases yet.'}
            {activeTab === 'all'      && 'No open Stable cases.'}
          </div>
        ) : (
          filtered.map(sc => (
            <StableCaseCard key={sc.id} stableCase={sc} onUpdated={updateCase} />
          ))
        )}
      </div>

      {/* ── How this works footer ─────────────────────────────────────── */}
      <div className="border-t border-slate-100 pt-4">
        <details className="group">
          <summary className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none
                              hover:text-slate-600 transition-colors list-none">
            <Filter size={11} />
            How does Stable monitoring work?
            <span className="ml-auto group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="mt-3 text-xs text-slate-500 space-y-1.5 pl-5 border-l-2 border-slate-100">
            <p>When a learner is exited (for any reason), their advocate starts a <strong>Stable service</strong> in the system and sets the planned end date 30 days after the exit date.</p>
            <p>The case is reassigned to <strong>Jess</strong> (Data Specialist), who monitors this list.</p>
            <p>At the 30-day mark, Jess pulls the learner's attendance records from their school and logs them here.</p>
            <p>If attendance looks good → <strong>Close as Stable</strong>. If concerns → <strong>Refer Back to Advocacy</strong>.</p>
          </div>
        </details>
      </div>

    </div>
  )
}
