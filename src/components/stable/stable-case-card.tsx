'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Clock, CheckCircle2, AlertTriangle, AlertCircle,
  User, School, Calendar, ChevronRight, FileSearch,
  RotateCcw, GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  daysElapsed, daysRemaining, getUrgency,
  EXIT_REASON_LABELS,
  type StableCase,
  type AttendanceLog,
} from './types'
import { LogAttendanceDrawer } from './log-attendance-drawer'

interface Props {
  stableCase: StableCase
  onUpdated:  (updated: StableCase) => void
}

const PULL_STATUS_LABELS = {
  not_started: 'Records not requested',
  requested:   'Records requested',
  received:    'Records received',
}
const PULL_STATUS_COLORS = {
  not_started: 'bg-slate-100 text-slate-600',
  requested:   'bg-amber-50 text-amber-700 border border-amber-200',
  received:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

export function StableCaseCard({ stableCase: sc, onUpdated }: Props) {
  const [showDrawer, setShowDrawer] = useState(false)

  const elapsed   = daysElapsed(sc.exitDate)
  const remaining = daysRemaining(sc.stableDueDate)
  const urgency   = getUrgency(sc.stableDueDate)
  const pct       = Math.min(100, (elapsed / 30) * 100)
  const isClosed  = !!sc.closedAt

  const exitReasonColor = {
    reached_goals:      'bg-emerald-50 text-emerald-700 border border-emerald-200',
    stopped_responding: 'bg-slate-100 text-slate-600',
    requested_exit:     'bg-blue-50 text-blue-700 border border-blue-200',
  }[sc.exitReason]

  const urgencyBar = isClosed
    ? 'bg-slate-200'
    : urgency === 'overdue'  ? 'bg-red-500'
    : urgency === 'due_soon' ? 'bg-amber-400'
    : 'bg-teal-400'

  const progressFill = isClosed
    ? 'bg-slate-300'
    : urgency === 'overdue'  ? 'bg-red-400'
    : urgency === 'due_soon' ? 'bg-amber-400'
    : 'bg-teal-500'

  const handleLogged = (log: AttendanceLog) => {
    const updated: StableCase = {
      ...sc,
      attendanceLogs: [...sc.attendanceLogs, log],
      pullStatus:     'received',
      outcome:        log.outcome,
      closedAt:       log.outcome === 'stable' ? new Date().toISOString() : sc.closedAt,
    }
    onUpdated(updated)
    setShowDrawer(false)
  }

  return (
    <>
      <div className={cn(
        'flex rounded-xl border overflow-hidden transition-all',
        isClosed
          ? 'border-slate-100 bg-slate-50/60 opacity-75'
          : urgency === 'overdue'  ? 'border-red-200 bg-white shadow-sm'
          : urgency === 'due_soon' ? 'border-amber-200 bg-white shadow-sm'
          : 'border-slate-200 bg-white',
      )}>
        {/* Urgency stripe */}
        <div className={cn('w-1 flex-shrink-0', urgencyBar)} />

        <div className="flex-1 p-4 space-y-3">
          {/* Row 1: Name + badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/cases/${sc.id}`}
                className="text-sm font-bold text-slate-800 hover:text-teal-700 transition-colors"
              >
                {sc.participantName}
              </Link>
              <span className="text-xs text-slate-400 font-mono">{sc.caseNumber}</span>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', exitReasonColor)}>
                {EXIT_REASON_LABELS[sc.exitReason]}
              </span>
              {isClosed && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Closed
                </span>
              )}
              {sc.outcome === 'refer_back' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  ⚑ Referred Back
                </span>
              )}
            </div>

            {/* Pull status chip */}
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0',
              PULL_STATUS_COLORS[sc.pullStatus]
            )}>
              {PULL_STATUS_LABELS[sc.pullStatus]}
            </span>
          </div>

          {/* Row 2: Info pills */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <School size={11} /> {sc.school} · Gr. {sc.grade}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={11} /> Exited {new Date(sc.exitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <User size={11} /> {sc.formerAdvocate}
            </span>
          </div>

          {/* Row 3: 30-day progress bar */}
          {!isClosed && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Day {Math.min(elapsed, 30)} of 30
                </span>
                {urgency === 'overdue' && (
                  <span className="flex items-center gap-1 text-red-600 font-semibold">
                    <AlertCircle size={11} /> {Math.abs(remaining)} days overdue
                  </span>
                )}
                {urgency === 'due_soon' && (
                  <span className="flex items-center gap-1 text-amber-600 font-semibold">
                    <Clock size={11} /> Due in {remaining} day{remaining !== 1 ? 's' : ''}
                  </span>
                )}
                {urgency === 'upcoming' && (
                  <span className="text-slate-400">
                    Due {new Date(sc.stableDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', progressFill)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Attendance log summary (if logged) */}
          {sc.attendanceLogs.length > 0 && (
            <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <FileSearch size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-600 space-y-0.5">
                {sc.attendanceLogs.map(log => (
                  <div key={log.id}>
                    <span className="font-semibold">
                      {log.daysReviewed} days reviewed:
                    </span>{' '}
                    {log.unexcusedAbsences} UEA · {log.excusedAbsences} EA · {log.tardies} T
                    {log.currentlyEnrolled !== null && (
                      <span className={cn('ml-2', log.currentlyEnrolled ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium')}>
                        · {log.currentlyEnrolled ? '✓ Enrolled' : '✗ Not enrolled'}
                      </span>
                    )}
                    {log.notes && (
                      <p className="text-slate-500 mt-0.5 italic">"{log.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!isClosed && (
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => setShowDrawer(true)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all',
                  urgency === 'overdue'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : urgency === 'due_soon'
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                )}
              >
                <FileSearch size={12} />
                {sc.attendanceLogs.length > 0 ? 'Update Attendance Log' : 'Log Attendance Pull'}
              </button>

              <Link
                href={`/cases/${sc.id}`}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600
                           border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                View Case <ChevronRight size={11} />
              </Link>
            </div>
          )}

          {isClosed && sc.outcome === 'stable' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 size={12} />
              Closed as stable on {new Date(sc.closedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}

          {isClosed && sc.outcome === 'refer_back' && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <RotateCcw size={12} />
              Referred back for re-advocacy on {new Date(sc.closedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      {showDrawer && (
        <LogAttendanceDrawer
          stableCase={sc}
          onClose={() => setShowDrawer(false)}
          onSubmitted={handleLogged}
        />
      )}
    </>
  )
}
