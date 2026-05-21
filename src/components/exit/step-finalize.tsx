'use client'
import { useState } from 'react'
import { CheckCircle2, Circle, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { ExitReason } from './types'

interface StepFinalizeProps {
  exitDate:        string
  reason:          ExitReason | null
  narrative:       string
  participantName: string
  advocateName:    string
  submitting:      boolean
  onBack:          () => void
  onSubmit:        () => void
}

const REASON_LABELS: Record<ExitReason, string> = {
  reached_goals:             'Reached goals',
  stopped_responding:        'Stopped responding',
  requested_exit:            'Requested exit',
  change_in_goals:           'Change in goals',
  referred_but_not_enrolled: 'Referred — not enrolled',
}

interface CheckItem {
  id:       string
  label:    string
  detail?:  string
  auto:     boolean   // true = we handle it automatically on submit
  external?: boolean  // true = manual step outside the platform
}

export function StepFinalize({
  exitDate, reason, narrative, participantName, advocateName, submitting, onBack, onSubmit,
}: StepFinalizeProps) {
  const stableEndDate = exitDate
    ? formatDate(new Date(new Date(exitDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())
    : '(+30 days from exit date)'

  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => setManualChecks(prev => ({ ...prev, [id]: !prev[id] }))

  const AUTO_ITEMS: CheckItem[] = [
    {
      id: 'goals',
      label: 'Update all goals with end dates and outcomes',
      detail: 'Goal end dates and outcome statuses will be saved.',
      auto: true,
    },
    {
      id: 'casenote',
      label: 'Create exit case note',
      detail: `Note will be attached to ${participantName}'s case.`,
      auto: true,
    },
    {
      id: 'end_service',
      label: 'End "Education Advocacy" service',
      detail: `Outcome: "${narrative || (reason ? REASON_LABELS[reason] : '—')}"`,
      auto: true,
    },
    {
      id: 'stable_service',
      label: 'Start "Stable" service',
      detail: `Exit date: ${exitDate ? formatDate(exitDate) : '—'} · Planned end: ${stableEndDate}. Signals Jess to pull attendance records 30 days later.`,
      auto: true,
    },
    {
      id: 'reassign',
      label: 'Reassign case to Data Specialist (Jess)',
      detail: 'Case stays Active. Jess will be notified.',
      auto: true,
    },
  ]

  const MANUAL_ITEMS: CheckItem[] = [
    ...(reason === 'reached_goals'
      ? [{
          id: 'certificate',
          label: 'Send Program Completion Certificate via Canva',
          detail: 'Fill out and send to the learner by email or text.',
          auto: false,
          external: true,
        }]
      : []),
    {
      id: 'google_voice',
      label: `Update Google Voice contact name`,
      detail: `Change to "${participantName.split(' ')[1] || participantName} Mom (${advocateName.split(' ')[0]} - Closed)" — go to Google Contacts to update.`,
      auto: false,
      external: true,
    },
    {
      id: 'forms_uploaded',
      label: 'Upload any paper forms to case file',
      detail: 'Exit interview, program completion toolkit. Shred paper copies after upload.',
      auto: false,
    },
  ]

  const allManualChecked = MANUAL_ITEMS.every(item => manualChecks[item.id])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800 font-display">Finalize Exit</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review what will happen automatically and confirm any manual steps before submitting.
        </p>
      </div>

      {/* Summary banner */}
      <div className="card p-4 bg-teal-50 border-teal-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-teal-800">{participantName}</p>
            <p className="text-xs text-teal-700 mt-0.5">
              Reason: <strong>{reason ? REASON_LABELS[reason] : '—'}</strong> ·
              Exit date: <strong>{exitDate ? formatDate(exitDate) : '—'}</strong> ·
              Stable service through: <strong>{stableEndDate}</strong>
            </p>
            {narrative && (
              <p className="text-xs text-teal-700 mt-1 italic">
                Narrative: "{narrative}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Automatic actions */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Automatic on Submit</p>
        </div>
        <div className="divide-y divide-slate-50">
          {AUTO_ITEMS.map(item => (
            <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
              <CheckCircle2 size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                {item.detail && <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual steps */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
            Manual Steps — Check When Done
          </p>
        </div>
        <div className="divide-y divide-slate-50">
          {MANUAL_ITEMS.map(item => {
            const checked = !!manualChecks[item.id]
            return (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className={cn(
                  'w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors',
                  checked ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'
                )}
              >
                {checked
                  ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <Circle size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className={cn('text-sm font-medium', checked ? 'line-through text-slate-400' : 'text-slate-800')}>
                    {item.label}
                    {item.external && <ExternalLink size={11} className="inline ml-1 opacity-50" />}
                  </p>
                  {item.detail && (
                    <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {!allManualChecked && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            You can still submit without checking all manual items, but make sure to complete them soon after.
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack}
          className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
          ← Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-7 py-2.5 bg-teal-600 hover:bg-teal-700
                     disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          {submitting
            ? <><Loader2 size={14} className="animate-spin" /> Finalizing Exit…</>
            : <>✓ Finalize Exit</>
          }
        </button>
      </div>
    </div>
  )
}
