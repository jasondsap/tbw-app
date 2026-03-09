'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BookOpen, Filter, Search, CheckCircle2, Clock,
  AlertCircle, ChevronRight, Circle, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; dot: string }> = {
  in_progress: {
    label: 'In Progress',
    icon: <Clock size={11} />,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  not_started: {
    label: 'Not Started',
    icon: <Circle size={11} />,
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle2 size={11} />,
    color: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  no_progress: {
    label: 'No Progress',
    icon: <AlertCircle size={11} />,
    color: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  discontinued: {
    label: 'Discontinued',
    icon: <AlertCircle size={11} />,
    color: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-300',
  },
}

const CATEGORIES = [
  'enrollment', 'attendance', 'credits', 'graduation',
  'ged', 'online', 'transfer', 'post_secondary', 'other',
]

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide',
      cfg.color
    )}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function ProgressBar({ pct }: { pct: number | null }) {
  const v = Math.min(100, Math.max(0, pct ?? 0))
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${v}%`,
            background: v >= 80 ? '#10b981' : v >= 40 ? '#6366f1' : '#94a3b8',
          }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-500 w-7 text-right">{v}%</span>
    </div>
  )
}

function fmt(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(target: string | null, status: string) {
  if (!target || status === 'completed' || status === 'discontinued') return false
  return new Date(target) < new Date()
}

interface Props {
  initialGoals: any[]
  userRole: string
}

export function GoalsCrossView({ initialGoals, userRole }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    return initialGoals.filter(g => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(q) ||
        g.title?.toLowerCase().includes(q) ||
        g.case_number?.toLowerCase().includes(q) ||
        g.current_school?.toLowerCase().includes(q)

      const matchStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? ['in_progress', 'not_started'].includes(g.status) :
        statusFilter === 'overdue' ? isOverdue(g.target_date, g.status) :
        g.status === statusFilter

      const matchCat = categoryFilter === 'all' || g.category === categoryFilter

      return matchSearch && matchStatus && matchCat
    })
  }, [initialGoals, search, statusFilter, categoryFilter])

  // Summary counts
  const counts = useMemo(() => ({
    total: initialGoals.length,
    inProgress: initialGoals.filter(g => g.status === 'in_progress').length,
    notStarted: initialGoals.filter(g => g.status === 'not_started').length,
    completed: initialGoals.filter(g => g.status === 'completed').length,
    overdue: initialGoals.filter(g => isOverdue(g.target_date, g.status)).length,
  }), [initialGoals])

  const avgProgress = useMemo(() => {
    const active = initialGoals.filter(g => g.status === 'in_progress')
    if (!active.length) return 0
    return Math.round(active.reduce((s, g) => s + (g.progress_pct ?? 0), 0) / active.length)
  }, [initialGoals])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <BookOpen size={17} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-display">Goals Tracker</h1>
                <p className="text-sm text-slate-500">All goals across active caseload</p>
              </div>
            </div>
          </div>

          {/* Summary strip */}
          <div className="flex gap-4 flex-wrap">
            {[
              { label: 'Total', value: counts.total, color: 'text-slate-700' },
              { label: 'In Progress', value: counts.inProgress, color: 'text-indigo-600' },
              { label: 'Not Started', value: counts.notStarted, color: 'text-slate-500' },
              { label: 'Completed', value: counts.completed, color: 'text-green-600' },
              { label: 'Overdue', value: counts.overdue, color: 'text-red-600' },
              { label: 'Avg Progress', value: `${avgProgress}%`, color: 'text-teal-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={cn('text-lg font-bold', color)}>{value}</span>
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search learner, goal, school..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-64"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {[
              { id: 'active', label: 'Active' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'not_started', label: 'Not Started' },
              { id: 'completed', label: 'Completed' },
              { id: 'overdue', label: '🚨 Overdue' },
              { id: 'all', label: 'All' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setStatusFilter(opt.id)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  statusFilter === opt.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400 ml-auto">{filtered.length} goals</span>
        </div>

        {/* Goals table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No goals match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-48">Learner</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Goal</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-28">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-36">Progress</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-24">Due</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-32">Advocate</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((g: any) => {
                    const overdue = isOverdue(g.target_date, g.status)
                    return (
                      <tr
                        key={g.id}
                        className={cn(
                          'hover:bg-slate-50/50 transition-colors',
                          overdue && 'bg-red-50/30'
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-800">{g.first_name} {g.last_name}</p>
                          <p className="text-xs text-slate-400">{g.case_number}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-700 leading-snug">{g.title}</p>
                          {g.category && (
                            <span className="text-[10px] text-slate-400 capitalize">
                              {g.category.replace(/_/g, ' ')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={g.status} />
                        </td>
                        <td className="px-4 py-3.5 w-36">
                          <ProgressBar pct={g.progress_pct} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {g.target_date ? (
                            <span className={cn(
                              'text-xs font-medium',
                              overdue ? 'text-red-600 font-bold' : 'text-slate-500'
                            )}>
                              {overdue && '⚠ '}{fmt(g.target_date)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {g.advocate_first ? (
                            <span className="text-xs text-slate-500">
                              {g.advocate_first} {g.advocate_last}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/cases/${g.case_id}`}
                            className="text-slate-300 hover:text-teal-600 transition-colors"
                            title="Open case"
                          >
                            <ChevronRight size={15} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-5 mt-4 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
              <span className="text-xs text-slate-500">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
