'use client'
import { useState } from 'react'
import { X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StableCase, AttendanceLog, StableOutcome } from './types'

interface Props {
  stableCase:  StableCase
  onClose:     () => void
  onSubmitted: (log: AttendanceLog) => void
}

export function LogAttendanceDrawer({ stableCase, onClose, onSubmitted }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [pullDate,          setPullDate]          = useState(today)
  const [daysReviewed,      setDaysReviewed]      = useState<number | ''>('')
  const [unexcused,         setUnexcused]         = useState<number | ''>('')
  const [excused,           setExcused]           = useState<number | ''>('')
  const [tardies,           setTardies]           = useState<number | ''>('')
  const [enrolled,          setEnrolled]          = useState<boolean | null>(null)
  const [notes,             setNotes]             = useState('')
  const [outcome,           setOutcome]           = useState<StableOutcome>(null)
  const [referBackReason,   setReferBackReason]   = useState('')
  const [saving,            setSaving]            = useState(false)

  const canSubmit = pullDate && daysReviewed !== '' && enrolled !== null && outcome !== null
    && (outcome === 'stable' || (outcome === 'refer_back' && referBackReason.trim()))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    const log: AttendanceLog = {
      id:                crypto.randomUUID(),
      loggedAt:          new Date().toISOString(),
      loggedBy:          'Jess', // TODO real auth
      pullDate,
      daysReviewed:      Number(daysReviewed),
      unexcusedAbsences: Number(unexcused || 0),
      excusedAbsences:   Number(excused || 0),
      tardies:           Number(tardies || 0),
      currentlyEnrolled: enrolled,
      notes,
      outcome,
      referBackReason,
    }
    try {
      await fetch(`/api/stable/${stableCase.id}/log`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })
      onSubmitted(log)
    } catch {
      console.error('Failed to log attendance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-slate-800 font-display">Log Attendance Pull</h2>
            <p className="text-sm text-slate-500 mt-0.5">{stableCase.participantName} · {stableCase.school}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-5">
          {/* Pull date */}
          <div className="space-y-1.5">
            <label className="form-label">Date Records Were Pulled <span className="text-red-400">*</span></label>
            <input type="date" className="form-input w-44" value={pullDate}
              onChange={e => setPullDate(e.target.value)} />
          </div>

          {/* Days reviewed */}
          <div className="space-y-1.5">
            <label className="form-label">How many school days of data did you review? <span className="text-red-400">*</span></label>
            <input type="number" min={1} max={30} className="form-input w-28"
              value={daysReviewed} placeholder="e.g. 20"
              onChange={e => setDaysReviewed(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>

          {/* Attendance counts */}
          <div className="space-y-2">
            <label className="form-label">Absences & Tardies</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Unexcused (UEA)', val: unexcused, set: setUnexcused, color: 'text-red-600' },
                { label: 'Excused (EA)',    val: excused,   set: setExcused,   color: 'text-amber-600' },
                { label: 'Tardies (T)',     val: tardies,   set: setTardies,   color: 'text-slate-600' },
              ].map(f => (
                <div key={f.label} className="space-y-1">
                  <label className={cn('text-xs font-semibold', f.color)}>{f.label}</label>
                  <input
                    type="number" min={0} className="form-input text-center"
                    value={f.val} placeholder="0"
                    onChange={e => f.set(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Currently enrolled */}
          <div className="space-y-2">
            <label className="form-label">Is the learner currently enrolled in school? <span className="text-red-400">*</span></label>
            <div className="flex gap-2">
              {([true, false] as const).map(v => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setEnrolled(v)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-sm font-medium border-2 transition-all',
                    enrolled === v
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-teal-300 bg-white'
                  )}
                >
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
            {enrolled === false && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg mt-1">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Learner is not enrolled — consider referring back to advocacy.</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="form-label">Attendance Notes</label>
            <textarea
              rows={3}
              className="form-input resize-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What patterns did you notice? Any context from the school? Anything that stands out?"
            />
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <label className="form-label">Outcome <span className="text-red-400">*</span></label>
            <p className="text-xs text-slate-400 -mt-1">Based on the attendance records, what's your recommendation?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOutcome('stable')}
                className={cn(
                  'p-3.5 rounded-xl border-2 text-left transition-all',
                  outcome === 'stable'
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 hover:border-emerald-200 bg-white'
                )}
              >
                <CheckCircle2 size={18} className={cn('mb-1.5', outcome === 'stable' ? 'text-emerald-600' : 'text-slate-300')} />
                <p className={cn('text-sm font-bold', outcome === 'stable' ? 'text-emerald-800' : 'text-slate-700')}>
                  Close as Stable
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attendance looks good. End Stable service and close case.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOutcome('refer_back')}
                className={cn(
                  'p-3.5 rounded-xl border-2 text-left transition-all',
                  outcome === 'refer_back'
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-slate-200 hover:border-amber-200 bg-white'
                )}
              >
                <AlertTriangle size={18} className={cn('mb-1.5', outcome === 'refer_back' ? 'text-amber-600' : 'text-slate-300')} />
                <p className={cn('text-sm font-bold', outcome === 'refer_back' ? 'text-amber-800' : 'text-slate-700')}>
                  Refer Back to Advocacy
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attendance concerns. Flag for re-enrollment or advocacy.
                </p>
              </button>
            </div>

            {outcome === 'refer_back' && (
              <div className="mt-2">
                <label className="form-label text-xs">Reason for referral back <span className="text-red-400">*</span></label>
                <textarea
                  rows={2}
                  className="form-input resize-none mt-1"
                  value={referBackReason}
                  onChange={e => setReferBackReason(e.target.value)}
                  placeholder="Describe the attendance concerns or reasons advocacy should resume…"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex items-center gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200
                       rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-700
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-sm font-bold rounded-xl transition-colors"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Logging…</>
              : outcome === 'stable'
                ? <><CheckCircle2 size={14} /> Log & Close Stable Service</>
                : outcome === 'refer_back'
                  ? <><AlertTriangle size={14} /> Log & Flag for Re-Advocacy</>
                  : 'Log Attendance Pull'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
