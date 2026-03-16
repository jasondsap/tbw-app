'use client'
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, TrendingUp, Calendar, Target,
  Shield, AlertCircle, Download, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
// Data fetched from /api/reports at runtime

// ── Time period selector ───────────────────────────────────────────────────────
type Period = 'thisMonth' | 'thisQuarter' | 'thisYear'
const PERIOD_LABELS: Record<Period, string> = {
  thisMonth:   'This Month',
  thisQuarter: 'This Quarter',
  thisYear:    'This Year (2025)',
}

// ── Tab types ─────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'annual' | 'demographics' | 'missing'

// ── Shared helpers ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold text-slate-700 font-display uppercase tracking-wider mb-4">
      {children}
    </h2>
  )
}

function KpiCard({
  label, value, sub, icon: Icon, color = 'teal',
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: 'teal' | 'amber' | 'blue' | 'slate'
}) {
  const bg = { teal: 'bg-teal-50', amber: 'bg-amber-50', blue: 'bg-blue-50', slate: 'bg-slate-100' }[color]
  const ic = { teal: 'text-teal-600', amber: 'text-amber-600', blue: 'text-blue-600', slate: 'text-slate-500' }[color]
  return (
    <div className="card py-5 flex items-center gap-4">
      <div className={cn('p-3 rounded-xl flex-shrink-0', bg)}>
        <Icon size={18} className={ic} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 font-display leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Custom tooltip for charts ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill || p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Annual Report Table ────────────────────────────────────────────────────────
function AnnualReportTable({ year, annualTable }: { year: number; annualTable: any }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Annual Report {year}</SectionTitle>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600
                           border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Download size={11} /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-44">
                Service
              </th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <div className="font-bold text-slate-700">A</div>
                <div className="font-normal normal-case text-slate-400">People Served</div>
              </th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <div className="font-bold text-slate-700">B</div>
                <div className="font-normal normal-case text-slate-400">Open 12/31</div>
              </th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <div className="font-bold text-teal-600">C</div>
                <div className="font-normal normal-case text-slate-400">Progress at Exit</div>
              </th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <div className="font-bold text-slate-700">D</div>
                <div className="font-normal normal-case text-slate-400">No Progress at Exit</div>
              </th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <div className="font-normal normal-case text-slate-400">Success Rate</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {annualTable.rows.map((row: Record<string, any>) => {
              const rate = row.progress != null && row.served > 0
                ? Math.round((row.progress / (row.progress + (row.noProgress ?? 0))) * 100)
                : null
              return (
                <tr key={row.service} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-700">{row.service}</td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-800">{row.served}</td>
                  <td className="px-4 py-3.5 text-center text-slate-600">{row.openAtEnd}</td>
                  <td className="px-4 py-3.5 text-center">
                    {row.progress != null
                      ? <span className="font-bold text-teal-700">{row.progress}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.noProgress != null
                      ? <span className="text-slate-600">{row.noProgress}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {rate != null ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-bold text-teal-700">{rate}%</span>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800 text-white">
              <td className="px-4 py-3 font-bold text-sm">Unduplicated Total</td>
              <td className="px-4 py-3 text-center font-bold text-lg">{annualTable.unduplicated}</td>
              <td colSpan={4} className="px-4 py-3 text-center text-slate-400 text-xs">
                Unique individuals across all services
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Barriers horizontal bar ───────────────────────────────────────────────────
function BarriersChart({ data }: { data: any[] }) {
  const maxCount = data[0]?.count ?? 1
  return (
    <div className="space-y-2">
      {data.map((b: any) => (
        <div key={b.barrier} className="flex items-center gap-3">
          <div className="w-44 flex-shrink-0 text-xs text-slate-600 text-right truncate">{b.barrier}</div>
          <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full flex items-center justify-end pr-2 transition-all"
              style={{ width: `${(b.count / maxCount) * 100}%` }}
            >
              {b.pct >= 30 && (
                <span className="text-[10px] font-bold text-white">{b.pct}%</span>
              )}
            </div>
          </div>
          <div className="w-10 flex-shrink-0 text-xs font-bold text-slate-700 text-right">{b.count}</div>
        </div>
      ))}
      <p className="text-[10px] text-slate-400 mt-2 text-right">% of enrolled learners with this barrier</p>
    </div>
  )
}

// ── Missing data table ────────────────────────────────────────────────────────
function MissingDataPanel({ missingData }: { missingData: any[] }) {
  const high   = missingData.filter(f => f.severity === 'high')
  const medium = missingData.filter(f => f.severity === 'medium')
  const low    = missingData.filter(f => f.severity === 'low')

  const Section = ({ title, items, color }: { title: string; items: any[]; color: string }) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-2 h-2 rounded-full', color)} />
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title} — {items.length}</h3>
      </div>
      <div className="space-y-2">
        {items.map(flag => (
          <div key={flag.caseNumber} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-800">{flag.name}</span>
                <span className="text-xs text-slate-400 font-mono">{flag.caseNumber}</span>
                <span className="text-xs text-slate-400">· {flag.advocate}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {flag.issues.map(issue => (
                  <span key={issue} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {issue}
                  </span>
                ))}
              </div>
            </div>
            <a href={`/cases/${flag.caseNumber}`}
               className="text-xs text-teal-600 hover:text-teal-800 font-medium flex-shrink-0 mt-0.5">
              Fix →
            </a>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Missing &amp; Incomplete Data</SectionTitle>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600
                           border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>
      <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
        <p className="text-xs text-amber-700">
          <strong>{missingData.length} cases</strong> have missing or incomplete data. Address high-severity items first to avoid gaps in grant reporting.
        </p>
      </div>
      <Section title="High Priority" items={high}   color="bg-red-500" />
      <Section title="Medium"        items={medium} color="bg-amber-400" />
      <Section title="Low"           items={low}    color="bg-slate-300" />
    </div>
  )
}


// ── Fallback empty data while loading ─────────────────────────
const FALLBACK_EXITS = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  reachedGoals: 0, stoppedResponding: 0, requestedExit: 0,
}))
const FALLBACK_EXIT_REASONS = [
  { name: 'Reached Goals',      value: 0, color: '#0d9488' },
  { name: 'Stopped Responding', value: 0, color: '#94a3b8' },
  { name: 'Requested Exit',     value: 0, color: '#3b82f6' },
]

// ── Main dashboard ─────────────────────────────────────────────────────────────
export function ReportsDashboard() {
  const [period,   setPeriod]   = useState<Period>('thisYear')
  const [tab,      setTab]      = useState<Tab>('overview')
  const [loading,  setLoading]  = useState(true)
  const [apiData,  setApiData]  = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports?period=${period}`)
      .then(r => r.json())
      .then(d => { setApiData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  // Fall back to mock-like zeros while loading
  const kpi = apiData?.kpi ?? { learnersServed: 0, goalsReached: 0, totalExited: 0, avgDaysInService: 0, goalCompletionRate: 0, stableRate: 0 }
  const exitsByMonth    = apiData?.exitsByMonth        ?? FALLBACK_EXITS
  const exitReasons     = apiData?.exitReasons         ?? FALLBACK_EXIT_REASONS
  const topBarriers     = apiData?.topBarriers         ?? []
  const scoreDist       = apiData?.scoreDist           ?? []
  const schoolDist      = apiData?.demographics?.schoolDist    ?? []
  const gradeDist       = apiData?.demographics?.gradeDist     ?? []
  const referralSources = apiData?.demographics?.referralSources ?? []
  const missingData     = apiData?.missingData         ?? []
  const annualTable     = apiData?.annualTable         ?? { year: new Date().getFullYear(), rows: [], unduplicated: 0 }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',     label: 'Overview' },
    { id: 'annual',       label: 'Annual Report' },
    { id: 'demographics', label: 'Demographics' },
    { id: 'missing',      label: `Missing Data ${missingData.filter(f => f.severity === 'high').length > 0 ? '🔴' : ''}` },
  ]

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-400 absolute top-6 right-6">
          <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          Refreshing...
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-display">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Program outcomes, demographics, and data quality for leadership &amp; grant reporting.
          </p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-slate-100">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
              tab === t.id
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-8">

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Learners Served"    value={kpi.learnersServed}                     icon={Users}      color="teal"  />
            <KpiCard label="Goals Reached"      value={kpi.goalsReached}                        icon={Target}     color="teal"  />
            <KpiCard label="Exited Program"     value={kpi.totalExited}                         icon={TrendingUp} color="slate" />
            <KpiCard label="Goal Completion"    value={`${kpi.goalCompletionRate}%`} sub="of exited learners" icon={Shield}     color="blue"  />
            <KpiCard label="Avg Days in Service" value={kpi.avgDaysInService}        sub="days"               icon={Calendar}   color="amber" />
            <KpiCard label="Stable Rate"        value={`${kpi.stableRate}%`}         sub="closed stable, not referred back" icon={Shield} color="teal" />
          </div>

          {/* Exits by month */}
          <div>
            <SectionTitle>Exits by Month</SectionTitle>
            <div className="card">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={exitsByMonth} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="reachedGoals"      name="Reached Goals"      fill="#0d9488" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="requestedExit"     name="Requested Exit"     fill="#3b82f6" stackId="a" />
                  <Bar dataKey="stoppedResponding" name="Stopped Responding" fill="#94a3b8" stackId="a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex items-center gap-4 justify-center mt-2">
                {[
                  { label: 'Reached Goals',      color: '#0d9488' },
                  { label: 'Requested Exit',     color: '#3b82f6' },
                  { label: 'Stopped Responding', color: '#94a3b8' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Exit reasons + Score dist */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <SectionTitle>Exit Reasons</SectionTitle>
              <div className="card flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={exitReasons}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {exitReasons.map((r: any, i: number) => <Cell key={i} fill={r.color ?? "#94a3b8"} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [`${v} exits`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 w-full">
                  {exitReasons.map((r: any) => {
                    const total = exitReasons.reduce((s: number, x: any) => s + x.value, 0)
                    return (
                      <div key={r.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: r.color }} />
                          <span className="text-slate-600">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">{r.value}</span>
                          <span className="text-slate-400">({Math.round(r.value / total * 100)}%)</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Involvement Score Distribution</SectionTitle>
              <div className="card">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={scoreDist} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="score" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                      tickFormatter={s => s.split(' ')[0]} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Learners" radius={[4, 4, 0, 0]}>
                      {scoreDist.map((d: any, i: number) => <Cell key={i} fill={d.color ?? '#0d9488'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {scoreDist.map((d: any) => (
                    <div key={d.score} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                        <span className="text-slate-600">{d.score}</span>
                      </div>
                      <span className="font-bold text-slate-700">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top barriers */}
          <div>
            <SectionTitle>Top Barriers at Enrollment</SectionTitle>
            <div className="card">
              <BarriersChart data={topBarriers} />
            </div>
          </div>

        </div>
      )}

      {/* ── Annual Report tab ────────────────────────────────────────────── */}
      {tab === 'annual' && (
        <div className="space-y-8">
          <AnnualReportTable year={annualTable.year ?? new Date().getFullYear()} annualTable={annualTable} />

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-xs text-slate-500">
              <strong>Column definitions:</strong>
              {' '}<strong>A</strong> = Total unique individuals who received services at any point during the year.
              {' '}<strong>B</strong> = Open cases as of December 31st.
              {' '}<strong>C</strong> = Exited learners who made measurable progress toward goals.
              {' '}<strong>D</strong> = Exited learners with no documented progress.
              {' '}<strong>Unduplicated</strong> = unique individuals across all service types.
            </p>
          </div>
        </div>
      )}

      {/* ── Demographics tab ────────────────────────────────────────────── */}
      {tab === 'demographics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">

            {/* Schools */}
            <div>
              <SectionTitle>Schools</SectionTitle>
              <div className="card space-y-2">
                {schoolDist.map(s => {
                  const total = schoolDist.reduce((sum, x) => sum + x.count, 0)
                  const pct = Math.round((s.count / total) * 100)
                  return (
                    <div key={s.school} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 truncate mr-2">{s.school}</span>
                        <span className="font-bold text-slate-700 flex-shrink-0">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Grades */}
            <div>
              <SectionTitle>Grade Levels</SectionTitle>
              <div className="card">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={gradeDist} layout="vertical"
                    margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="grade" tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Learners" fill="#0d9488" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Referral sources */}
            <div className="col-span-2">
              <SectionTitle>Referral Sources</SectionTitle>
              <div className="card">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={referralSources} margin={{ top: 0, right: 20, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="source" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Referrals" fill="#5eead4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Missing Data tab ─────────────────────────────────────────────── */}
      {tab === 'missing' && <MissingDataPanel missingData={missingData} />}

    </div>
  )
}
