'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, AlertCircle, Phone, Mail } from 'lucide-react'
import { cn, scoreColor, gradeDisplay } from '@/lib/utils'

interface AdvocateCaseloadCardProps {
  advocate: Record<string, any>
  cases:    Record<string, any>[]
}

export function AdvocateCaseloadCard({ advocate, cases }: AdvocateCaseloadCardProps) {
  const [expanded, setExpanded] = useState(true)

  // DB returns snake_case: first_name, last_name, active_cases, overdue_notes, at_risk
  const firstName    = advocate.first_name    ?? ''
  const lastName     = advocate.last_name     ?? ''
  const activeCases  = Number(advocate.active_cases  ?? 0)
  const totalCases   = Number(advocate.total_cases   ?? 0)
  const overdueNotes = Number(advocate.overdue_notes ?? 0)
  const atRisk       = Number(advocate.at_risk       ?? 0)
  const capacity     = activeCases / 10

  // Cases: flag derived from days_since_note
  const withFlag: Record<string, any>[] = cases.map(c => ({
    ...c,
    flag: (c.days_since_note ?? 0) >= 14 ? 'at_risk'
        : (c.days_since_note ?? 0) >= 7  ? 'overdue_note'
        : null,
  }))
  const flagged = withFlag.filter(c => c.flag)
  const healthy = withFlag.filter(c => !c.flag)

  return (
    <div className={cn(
      'card overflow-hidden transition-all',
      atRisk > 0        && 'border-red-200',
      overdueNotes > 0  && !atRisk && 'border-amber-200',
    )}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center
                        text-white font-bold text-sm flex-shrink-0">
          {firstName[0]}{lastName[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-slate-800">
              {firstName} {lastName}
            </span>
            {atRisk > 0 && (
              <span className="badge bg-red-50 text-red-600 ring-1 ring-red-200 text-[10px]">
                {atRisk} at risk
              </span>
            )}
            {overdueNotes > 0 && (
              <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-[10px]">
                {overdueNotes} overdue
              </span>
            )}
          </div>
          {/* Capacity bar */}
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  capacity >= 1   ? 'bg-red-400' :
                  capacity >= 0.8 ? 'bg-amber-400' : 'bg-teal-500'
                )}
                style={{ width: `${Math.min(capacity * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">
              {activeCases} active · {totalCases - activeCases} stable
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-center hidden sm:block">
            <p className="text-lg font-bold text-slate-800 font-display">{activeCases}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Active</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className={cn('text-lg font-bold font-display', overdueNotes > 0 ? 'text-amber-600' : 'text-slate-300')}>
              {overdueNotes}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Overdue</p>
          </div>
          <div className="flex items-center gap-1">
            <a href={`mailto:${advocate.email}`}
               onClick={e => e.stopPropagation()}
               className="p-1.5 text-slate-300 hover:text-teal-600 transition-colors rounded-md hover:bg-teal-50">
              <Mail size={14} />
            </a>
          </div>
          <div className="text-slate-300">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {/* Cases table */}
      {expanded && (
        <div className="border-t border-slate-100">
          {cases.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-6">No active cases</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70">
                  {['Learner', 'School', 'Last Note', 'Score', 'Flag', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...flagged, ...healthy].map((c) => (
                  <tr key={c.id} className={cn(
                    'group transition-colors',
                    c.flag === 'at_risk'      ? 'bg-red-50/30 hover:bg-red-50/60' :
                    c.flag === 'overdue_note' ? 'bg-amber-50/20 hover:bg-amber-50/40' :
                    'hover:bg-slate-50/60'
                  )}>
                    {/* Learner */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-100
                                        flex items-center justify-center text-xs font-bold text-teal-700 flex-shrink-0">
                          {(c.first_name ?? '?')[0]}{(c.last_name ?? '?')[0]}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {c.first_name} {c.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{c.case_number}</p>
                        </div>
                      </div>
                    </td>

                    {/* School */}
                    <td className="px-4 py-2.5">
                      <p className="text-xs text-slate-600 truncate max-w-[140px]">{c.current_school ?? '—'}</p>
                      <p className="text-[10px] text-slate-400">{gradeDisplay(c.current_grade)}</p>
                    </td>

                    {/* Last note */}
                    <td className="px-4 py-2.5">
                      {c.days_since_note != null ? (
                        <span className={cn(
                          'text-xs font-medium',
                          c.days_since_note >= 14 ? 'text-red-600' :
                          c.days_since_note >= 7  ? 'text-amber-600' :
                          'text-slate-500'
                        )}>
                          {Math.round(c.days_since_note)}d ago
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="px-4 py-2.5">
                      {c.involvement_score ? (
                        <span className={cn('badge text-xs font-bold', scoreColor(c.involvement_score))}>
                          {c.involvement_score}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>

                    {/* Flag */}
                    <td className="px-4 py-2.5">
                      {c.flag === 'at_risk' && (
                        <span className="badge text-[10px] bg-red-50 text-red-600 ring-1 ring-red-200">
                          <AlertCircle size={9} /> At Risk
                        </span>
                      )}
                      {c.flag === 'overdue_note' && (
                        <span className="badge text-[10px] bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                          <AlertCircle size={9} /> Overdue
                        </span>
                      )}
                    </td>

                    {/* Open */}
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/cases/${c.id}`}
                        className="opacity-0 group-hover:opacity-100 text-[11px] font-medium text-teal-600
                                   hover:text-teal-800 transition-all whitespace-nowrap"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
