import Link from 'next/link'
import { Plus, AlertCircle, CheckCircle2, Filter } from 'lucide-react'
import { cn, statusLabel, statusColor, statusDot, formatDate, formatPhone, scoreColor } from '@/lib/utils'
import { getIntakePipeline } from '@/lib/db/queries'
import type { CaseStatus } from '@/types'

const STAGES: { status: CaseStatus; label: string }[] = [
  { status: 'referred',         label: 'Referred' },
  { status: 'intake_scheduled', label: 'Intake Scheduled' },
  { status: 'consent_pending',  label: 'Consent Pending' },
  { status: 'scored',           label: 'Scored' },
]

function ConsentProgress({ signed, total }: { signed: number; total: number }) {
  const pct = total > 0 ? (signed / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[48px]">
        <div className={cn('h-full rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-teal-400')}
             style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums">{signed}/{total}</span>
    </div>
  )
}

function DaysChip({ days }: { days: number }) {
  const color = days >= 7 ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
    : days >= 3 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-slate-50 text-slate-500'
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {days >= 3 && <AlertCircle size={10} />}{days}d
    </span>
  )
}

export default async function IntakePage() {
  const pipeline = await getIntakePipeline()
  const totalByStage = STAGES.map(s => ({ ...s, count: pipeline.filter((c: any) => c.status === s.status).length }))
  const needAttention = pipeline.filter((c: any) => (c.days_in_status ?? 0) >= 7).length
  const consentsOut   = pipeline.filter((c: any) => (c.consents_signed ?? 0) > 0 && (c.consents_signed ?? 0) < 5).length
  const readyToScore  = pipeline.filter((c: any) => c.status === 'consent_pending' && c.consents_signed === 5).length
  const STATS = [
    { label: 'In Pipeline',    value: pipeline.length, color: 'text-slate-800' },
    { label: 'Need Attention', value: needAttention,   color: 'text-red-600',   sub: '7+ days' },
    { label: 'Consents Out',   value: consentsOut,     color: 'text-amber-600', sub: 'awaiting' },
    { label: 'Ready to Score', value: readyToScore,    color: 'text-teal-600',  sub: 'consents done' },
  ]
  return (
    <div className="page-enter p-6 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Intake Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track referrals from first contact through advocate assignment</p>
        </div>
        <Link href="/intake/new" className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <Plus size={16} />New Referral
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATS.map((s) => (
          <div key={s.label} className="card px-4 py-3.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{s.label}</p>
            <div className="flex items-end gap-2">
              <span className={cn('text-3xl font-bold font-display', s.color)}>{s.value}</span>
              {s.sub && <span className="text-xs text-slate-400 mb-1">{s.sub}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-0">
          {totalByStage.map((stage, i) => (
            <div key={stage.status} className="flex items-center flex-1">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={cn('stage-dot', statusDot(stage.status))} />
                  <span className="text-xs font-medium text-slate-600">{stage.label}</span>
                  <span className="ml-auto text-xs font-bold text-slate-800">{stage.count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', { 'bg-slate-400': stage.status === 'referred', 'bg-blue-500': stage.status === 'intake_scheduled', 'bg-amber-500': stage.status === 'consent_pending', 'bg-purple-500': stage.status === 'scored' })}
                       style={{ width: stage.count > 0 ? '100%' : '0%' }} />
                </div>
              </div>
              {i < totalByStage.length - 1 && <div className="w-6 flex justify-center"><div className="w-4 h-px bg-slate-200" /></div>}
            </div>
          ))}
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">All Active Referrals <span className="ml-2 text-xs font-normal text-slate-400">({pipeline.length})</span></h2>
          <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors px-2.5 py-1.5 rounded-md hover:bg-slate-50"><Filter size={13} />Filter</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Participant','Status','Days in Stage','Score','Consents','Intake Staff','Referred',''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pipeline.map((c: any) => (
              <tr key={c.case_id} className="hover:bg-slate-50/60 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-teal-700">{c.first_name?.[0]}{c.last_name?.[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-slate-400">{formatPhone(c.phone_primary)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><span className={cn('badge', statusColor(c.status))}><span className={cn('stage-dot', statusDot(c.status))} />{statusLabel(c.status)}</span></td>
                <td className="px-4 py-3"><DaysChip days={Math.round(c.days_in_status ?? 0)} /></td>
                <td className="px-4 py-3">{c.involvement_score ? <span className={cn('badge text-xs font-bold', scoreColor(c.involvement_score))}>{c.involvement_score}</span> : <span className="text-xs text-slate-300 italic">—</span>}</td>
                <td className="px-4 py-3 min-w-[100px]"><ConsentProgress signed={c.consents_signed ?? 0} total={5} /></td>
                <td className="px-4 py-3 text-xs text-slate-500">{c.intake_first ? `${c.intake_first} ${c.intake_last?.[0]}.` : <span className="text-slate-300 italic">Unassigned</span>}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(c.referral_date)}</td>
                <td className="px-4 py-3"><Link href={`/cases/${c.case_id}`} className="opacity-0 group-hover:opacity-100 text-xs font-medium text-teal-600 hover:text-teal-800 transition-all px-2.5 py-1 rounded-md hover:bg-teal-50">Open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {pipeline.length === 0 && <div className="text-center py-16"><CheckCircle2 size={36} className="mx-auto text-slate-200 mb-3" /><p className="text-slate-400 text-sm">No active referrals in the pipeline</p></div>}
      </div>
    </div>
  )
}
