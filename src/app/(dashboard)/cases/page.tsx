export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Search, Filter, AlertCircle } from 'lucide-react'
import { cn, statusColor, statusDot, statusLabel, fullName, formatDate, scoreColor, gradeDisplay } from '@/lib/utils'
import { getAllActiveCases } from '@/lib/db/queries'

function DaysChip({ days }: { days: number | null | undefined }) {
  if (days == null) return <span className="text-xs text-slate-300">—</span>
  const color = days >= 7 ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
    : days >= 3 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-slate-50 text-slate-500'
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {days >= 7 && <AlertCircle size={10} />}{Math.round(days)}d ago
    </span>
  )
}

export default async function CasesPage() {
  const cases = await getAllActiveCases()
  const active  = cases.filter((c: any) => c.status === 'active').length
  const stable  = cases.filter((c: any) => c.status === 'stable').length
  const overdue = cases.filter((c: any) => (c.days_since_last_note ?? 0) >= 7).length

  return (
    <div className="page-enter p-6 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">My Caseload</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {active} active · {stable} stable
            {overdue > 0 && <span className="text-red-500 ml-2">· {overdue} overdue notes</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 w-52" placeholder="Search cases..." />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter size={14} />Filter
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Learner','Status','School / Grade','Last Note','Goals','Score',''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cases.map((c: any) => {
              const name = fullName(c.first_name, c.last_name, c.preferred_name)
              const age  = c.date_of_birth
                ? Math.floor((Date.now() - new Date(c.date_of_birth).getTime()) / (365.25*24*60*60*1000))
                : null
              const completedGoals = c.completed_goals ?? 0
              const totalGoals     = (c.open_goals ?? 0) + completedGoals
              return (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-teal-700">{c.first_name?.[0]}{c.last_name?.[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{name}</p>
                        <p className="text-xs text-slate-400">{c.case_number}{age ? ` · ${age}y` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={cn('badge', statusColor(c.status))}><span className={cn('stage-dot', statusDot(c.status))} />{statusLabel(c.status)}</span></td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-700 font-medium truncate max-w-[160px]">{c.current_school ?? '—'}</p>
                    {c.current_grade && <p className="text-xs text-slate-400">{gradeDisplay(c.current_grade)} Grade</p>}
                  </td>
                  <td className="px-4 py-3"><DaysChip days={c.days_since_last_note} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-teal-700">{completedGoals}</span>
                      <span className="text-xs text-slate-300">/</span>
                      <span className="text-xs text-slate-500">{totalGoals}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{c.involvement_score ? <span className={cn('badge text-xs font-bold', scoreColor(c.involvement_score))}>{c.involvement_score}</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                  <td className="px-4 py-3"><Link href={`/cases/${c.id}`} className="opacity-0 group-hover:opacity-100 text-xs font-medium text-teal-600 hover:text-teal-800 transition-all px-2.5 py-1 rounded-md hover:bg-teal-50">Open →</Link></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {cases.length === 0 && <div className="text-center py-16"><p className="text-slate-400 text-sm">No active cases</p></div>}
      </div>
    </div>
  )
}
