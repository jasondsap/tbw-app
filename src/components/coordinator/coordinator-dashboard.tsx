'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  UserPlus, AlertTriangle, Clock, CheckCircle2,
  ChevronRight, TrendingUp, Users, ClipboardList,
  BookOpen, ArrowRight, Filter, Zap,
} from 'lucide-react'
import { cn, scoreColor, gradeDisplay, formatDate } from '@/lib/utils'
import { AssignmentModal } from './assignment-modal'
import { AdvocateCaseloadCard } from './advocate-caseload-card'

// ─── Stat card ────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon, urgent,
}: {
  label: string; value: number; sub?: string
  color: string; icon: React.ElementType; urgent?: boolean
}) {
  return (
    <div className={cn('card px-5 py-4 flex items-start gap-4', urgent && value > 0 && 'border-red-200 bg-red-50/30')}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={17} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold font-display text-slate-900">{value}</p>
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Assignment queue row ─────────────────────────────────────

function QueueRow({
  item, onAssign,
}: {
  item: Record<string, any>
  onAssign: (item: Record<string, any>) => void
}) {
  const age = item.dateOfBirth
    ? Math.floor((Date.now() - new Date(item.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <tr className="group hover:bg-slate-50/60 transition-colors">
      {/* Urgency indicator */}
      <td className="pl-4 pr-2 py-3 w-1">
        <div className={cn('w-1 h-8 rounded-full', {
          'bg-red-500':    Number(item.involvement_score ?? 0) === 4,
          'bg-orange-400': Number(item.involvement_score ?? 0) === 3,
          'bg-amber-400':  Number(item.involvement_score ?? 0) === 2,
          'bg-slate-300':  Number(item.involvement_score ?? 0) === 1,
        })} />
      </td>

      {/* Score */}
      <td className="px-3 py-3">
        <span className={cn('badge text-sm font-bold', scoreColor(Number(item.involvement_score ?? 0)))}>
          {Number(item.involvement_score ?? 0)}
        </span>
      </td>

      {/* Learner */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100
                          flex items-center justify-center text-xs font-bold text-teal-700 flex-shrink-0">
            {(item.first_name ?? "?")[0]}{(item.last_name ?? "?")[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {item.first_name} {item.last_name}
              {age && <span className="font-normal text-slate-400 text-xs ml-1">· {age}y</span>}
            </p>
            <p className="text-xs text-slate-400">{item.case_number}</p>
          </div>
        </div>
      </td>

      {/* School */}
      <td className="px-3 py-3">
        <p className="text-xs font-medium text-slate-700">{item.current_school}</p>
        <p className="text-[10px] text-slate-400">{gradeDisplay(item.currentGrade)} · {item.neighborhood}</p>
      </td>

      {/* Factors */}
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1 max-w-[240px]">
          {item.factors.slice(0, 2).map((f: string) => (
            <span key={f} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full truncate max-w-[120px]">
              {f}
            </span>
          ))}
          {item.factors.length > 2 && (
            <span className="text-[10px] text-slate-400">+{item.factors.length - 2}</span>
          )}
        </div>
      </td>

      {/* Consents */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', item.consentsSigned === item.consentsTotal ? 'bg-emerald-500' : 'bg-teal-400')}
              style={{ width: `${(item.consentsSigned / item.consentsTotal) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">{item.consentsSigned}/{item.consentsTotal}</span>
        </div>
      </td>

      {/* Days waiting */}
      <td className="px-3 py-3">
        <span className={cn('text-xs font-medium',
          item.daysInStatus >= 3 ? 'text-red-500' : 'text-slate-500'
        )}>
          {item.daysInStatus}d
        </span>
      </td>

      {/* Assign CTA */}
      <td className="px-3 py-3 text-right">
        <button
          onClick={() => onAssign(item)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700
                     text-white text-xs font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
        >
          <UserPlus size={12} /> Assign
        </button>
      </td>
    </tr>
  )
}

// ─── Main dashboard ───────────────────────────────────────────

interface CoordinatorData {
  queue:        any[]
  advocates:    any[]
  stats:        any
  advocateCases: any[]
}

export function CoordinatorDashboard({ data }: { data: CoordinatorData }) {
  const [assigningCase, setAssigningCase]   = useState<Record<string, any> | null>(null)
  const [queueItems,    setQueueItems]      = useState<any[]>(data.queue)
  const [allCases,      setAllCases]        = useState<any[]>(data.advocateCases)
  const [activeView,    setActiveView]      = useState<'caseload' | 'flags'>('caseload')

  const flaggedCases = allCases.filter((c: any) => (c.days_since_note ?? 0) >= 7)
  const atRiskCases  = allCases.filter((c: any) => (c.days_since_note ?? 0) >= 14)

  const handleAssigned = (caseId: string, advocateId: string) => {
    setQueueItems(prev => prev.filter(c => c.id !== caseId))
    setAssigningCase(null)
  }

  return (
    <div className="page-enter min-h-screen bg-slate-50">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy-900 font-display">Coordinator Dashboard</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/intake"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600
                           border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <ClipboardList size={14} /> View Intake Pipeline
              </Link>
              <Link
                href="/reports"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600
                           border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <TrendingUp size={14} /> Reports
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-[1200px] mx-auto space-y-7">

        {/* ── Program stat row ─────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Active Cases"          value={Number(data.stats?.active_cases ?? 0)}          color="bg-teal-600"     icon={Users}         sub="across all advocates" />
          <StatCard label="Awaiting Assignment"   value={queueItems.length}  color="bg-navy-700"     icon={UserPlus}      sub="scored, ready to assign" />
          <StatCard label="Overdue Notes"         value={Number(data.stats?.overdue_notes ?? 0)}          color="bg-amber-500"    icon={Clock}         sub="7+ days since last note" urgent />
          <StatCard label="At Risk of Dropping"   value={atRiskCases.length}                  color="bg-red-500"      icon={AlertTriangle} sub="14+ days no contact"    urgent />
        </div>

        {/* ── Assignment queue ─────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 font-display">Assignment Queue</h2>
              {queueItems.length > 0 && (
                <span className="badge bg-navy-100 text-navy-700 font-bold">{queueItems.length}</span>
              )}
            </div>
            <Link href="/intake" className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1 transition-colors">
              View full pipeline <ArrowRight size={12} />
            </Link>
          </div>

          {queueItems.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">All scored cases have been assigned</p>
              <p className="text-xs text-slate-400 mt-0.5">New cases will appear here once scored by intake</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="pl-4 pr-2 py-2.5 w-1" />
                    {['Score', 'Learner', 'School / Neighborhood', 'Factors', 'Consents', 'Waiting', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {queueItems
                    .sort((a, b) => Number(b.involvement_score ?? 0) - Number(a.involvement_score ?? 0))
                    .map(item => (
                      <QueueRow key={item.id} item={item} onAssign={setAssigningCase} />
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Flags / Attention needed ─────────────────────────── */}
        {flaggedCases.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="text-base font-bold text-slate-800 font-display">Needs Attention</h2>
              <span className="badge bg-red-50 text-red-600 ring-1 ring-red-200 font-bold">
                {flaggedCases.length}
              </span>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    {['Learner', 'Advocate', 'School', 'Last Note', 'Score', 'Issue', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {flaggedCases
                    .sort((a, b) => (Math.round(b.days_since_note ?? 0) ?? 0) - (Math.round(a.days_since_note ?? 0) ?? 0))
                    .map((c) => (
                      <tr key={c.id} className={cn(
                        'group transition-colors',
                        c.flag === 'at_risk' ? 'bg-red-50/30 hover:bg-red-50/60' : 'bg-amber-50/20 hover:bg-amber-50/40'
                      )}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-100
                                            flex items-center justify-center text-xs font-bold text-teal-700 flex-shrink-0">
                              {(c.first_name ?? "?")[0]}{(c.last_name ?? "?")[0]}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{c.first_name} {c.last_name}</p>
                              <p className="text-[10px] text-slate-400">{c.case_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {c.advocateFirst} {c.advocateLast}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-600 truncate max-w-[140px]">{c.current_school}</p>
                          <p className="text-[10px] text-slate-400">{gradeDisplay(c.currentGrade)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-semibold',
                            Math.round(c.days_since_note ?? 0) >= 14 ? 'text-red-600' : 'text-amber-600'
                          )}>
                            {Math.round(c.days_since_note ?? 0)}d ago
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('badge text-xs font-bold', scoreColor(Number(c.involvement_score ?? 0)))}>
                            {Number(c.involvement_score ?? 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('badge text-[10px]',
                            c.flag === 'at_risk'
                              ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                              : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                          )}>
                            {c.flag === 'at_risk' ? '⚠ At risk of dropping' : '⏰ Overdue note'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/cases/${c.id}`}
                            className="opacity-0 group-hover:opacity-100 text-[11px] font-medium text-teal-600
                                       hover:text-teal-800 transition-all whitespace-nowrap"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Caseload by advocate ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 font-display">Caseload by Advocate</h2>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> Healthy
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-3" /> Overdue
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block ml-3" /> At risk
            </div>
          </div>
          <div className="space-y-4">
            {data.advocates.map((advocate: any) => {
              const advocateCases = allCases.filter((c: any) => c.advocate_id === advocate.id)
              return (
                <AdvocateCaseloadCard
                  key={advocate.id}
                  advocate={advocate}
                  cases={advocateCases}
                />
              )
            })}
          </div>
        </section>

        {/* ── Quick program health summary ──────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-slate-800 font-display mb-3">Program Health</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <BookOpen size={13} className="text-teal-500" /> Goals YTD
              </p>
              <p className="text-3xl font-bold font-display text-slate-900">{Number(data.stats?.goals_ytd ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1">goals completed this year</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-500" /> Exits This Month
              </p>
              <p className="text-3xl font-bold font-display text-slate-900">{Number(data.stats?.exits_this_month ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1">learners exited to stable</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Users size={13} className="text-navy-600" /> Total Caseload
              </p>
              <p className="text-3xl font-bold font-display text-slate-900">
                {Number(data.stats?.active_cases ?? 0) + 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {Number(data.stats?.active_cases ?? 0)} active · {0} stable
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* ── Assignment modal ──────────────────────────────────────── */}
      {assigningCase && (
        <AssignmentModal
          caseData={assigningCase}
          advocates={data.advocates}
          onClose={() => setAssigningCase(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  )
}
