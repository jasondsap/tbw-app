'use client'
import { CheckCircle2, UserX, LogOut, Plus, Trash2, Phone, MessageSquare, PhoneCall, Shuffle, MailQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExitReason, MeetingHeld, ContactAttempt } from './types'
import { SERVICE_EXIT_NARRATIVES, NARRATIVE_SUGGESTIONS } from './types'

interface StepReasonProps {
  reason:          ExitReason | null
  narrative:       string
  meetingHeld:     MeetingHeld | null
  contactAttempts: ContactAttempt[]
  onUpdate: (fields: {
    reason?:          ExitReason
    narrative?:       string
    meetingHeld?:     MeetingHeld
    contactAttempts?: ContactAttempt[]
  }) => void
  onNext: () => void
}

const REASONS: { value: ExitReason; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  {
    value: 'reached_goals',
    label: 'Reached Goals',
    desc: 'The learner has met the goals established at intake.',
    icon: CheckCircle2,
    color: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'stopped_responding',
    label: 'Stopped Responding',
    desc: 'No contact after 6+ attempts over two months.',
    icon: UserX,
    color: 'border-amber-300 bg-amber-50 text-amber-700',
  },
  {
    value: 'requested_exit',
    label: 'Requested Exit',
    desc: 'The learner or caregiver has asked to leave the program.',
    icon: LogOut,
    color: 'border-slate-300 bg-slate-50 text-slate-600',
  },
  {
    value: 'change_in_goals',
    label: 'Change in Goals',
    desc: 'Learner is shifting to a different service or path.',
    icon: Shuffle,
    color: 'border-blue-300 bg-blue-50 text-blue-700',
  },
  {
    value: 'referred_but_not_enrolled',
    label: 'Referred — Not Enrolled',
    desc: 'Info & referral only; learner never formally enrolled.',
    icon: MailQuestion,
    color: 'border-violet-300 bg-violet-50 text-violet-700',
  },
]

const METHOD_OPTIONS: { value: ContactAttempt['method']; label: string; icon: React.ElementType }[] = [
  { value: 'text',       label: 'Text',      icon: MessageSquare },
  { value: 'phone_call', label: 'Call',       icon: Phone },
  { value: 'voicemail',  label: 'Voicemail',  icon: PhoneCall },
]

const OTHER_NARRATIVE = '__other__'

export function StepReason({ reason, narrative, meetingHeld, contactAttempts, onUpdate, onNext }: StepReasonProps) {
  const addAttempt = () => onUpdate({
    contactAttempts: [...contactAttempts, { date: '', method: 'text', notes: '' }]
  })

  const updateAttempt = (i: number, fields: Partial<ContactAttempt>) => {
    const updated = contactAttempts.map((a, idx) => idx === i ? { ...a, ...fields } : a)
    onUpdate({ contactAttempts: updated })
  }

  const removeAttempt = (i: number) => onUpdate({
    contactAttempts: contactAttempts.filter((_, idx) => idx !== i)
  })

  // When the user changes the short reason, auto-fill the most-likely narrative
  // (first suggestion) so the dropdown is never empty. They can still change it.
  const handleReasonChange = (newReason: ExitReason) => {
    const suggested = NARRATIVE_SUGGESTIONS[newReason]?.[0] ?? ''
    onUpdate({ reason: newReason, narrative: suggested })
  }

  const isCanonical = SERVICE_EXIT_NARRATIVES.includes(narrative as any)
  const isOther = narrative !== '' && !isCanonical
  const dropdownValue = narrative === '' ? '' : isCanonical ? narrative : OTHER_NARRATIVE

  const suggestions = reason ? NARRATIVE_SUGGESTIONS[reason] : []
  const otherNarratives = SERVICE_EXIT_NARRATIVES.filter(n => !suggestions.includes(n))

  const canProceed = (() => {
    if (!reason) return false
    if (narrative.trim() === '') return false
    if (reason === 'reached_goals')      return meetingHeld !== null
    if (reason === 'stopped_responding') return contactAttempts.length >= 1
    return true
  })()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800 font-display">Why is this learner exiting?</h2>
        <p className="text-sm text-slate-500 mt-1">This determines which steps and outcome codes are used.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {REASONS.map(r => {
          const Icon = r.icon
          const selected = reason === r.value
          return (
            <button
              key={r.value}
              onClick={() => handleReasonChange(r.value)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                selected ? r.color + ' ring-2 ring-offset-1 ring-current' : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              <Icon size={20} className="mb-2" />
              <p className="font-semibold text-sm">{r.label}</p>
              <p className="text-xs opacity-70 mt-1 leading-relaxed">{r.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Service exit narrative — the 11 canonical phrases + Other */}
      {reason && (
        <div className="card p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Service exit narrative</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Picked from the canonical phrases used in funder/grant reports. Choose "Other" for an unusual case.
            </p>
          </div>
          <select
            value={dropdownValue}
            onChange={e => {
              const v = e.target.value
              if (v === OTHER_NARRATIVE) {
                // Switching to Other — clear the canonical value so the textarea is empty
                onUpdate({ narrative: '' })
              } else {
                onUpdate({ narrative: v })
              }
            }}
            className="form-input text-sm"
          >
            <option value="" disabled>Choose a narrative…</option>
            {suggestions.length > 0 && (
              <optgroup label="Suggested for this reason">
                {suggestions.map(n => <option key={n} value={n}>{n}</option>)}
              </optgroup>
            )}
            {otherNarratives.length > 0 && (
              <optgroup label="All canonical narratives">
                {otherNarratives.map(n => <option key={n} value={n}>{n}</option>)}
              </optgroup>
            )}
            <option value={OTHER_NARRATIVE}>Other — write your own…</option>
          </select>

          {(isOther || dropdownValue === OTHER_NARRATIVE) && (
            <textarea
              value={narrative}
              onChange={e => onUpdate({ narrative: e.target.value })}
              placeholder="Describe the exit narrative in your own words. This will appear on grant/funder reports — keep it short and observable."
              rows={3}
              className="form-input text-sm"
            />
          )}
        </div>
      )}

      {/* Meeting held? — only for reached_goals */}
      {reason === 'reached_goals' && (
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Was an exit meeting held with the learner and caregiver?</p>
          <div className="flex gap-3">
            {[{ v: 'yes', label: 'Yes — meeting held' }, { v: 'no', label: 'No — could not schedule' }].map(opt => (
              <button
                key={opt.v}
                onClick={() => onUpdate({ meetingHeld: opt.v as MeetingHeld })}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all',
                  meetingHeld === opt.v
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {meetingHeld === 'no' && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
              The exit interview and toolkit steps will be skipped. Try to collect the three reflection questions via phone, text, or email if possible — enter any responses in the case note.
            </div>
          )}
        </div>
      )}

      {/* Contact attempt log — for stopped_responding */}
      {reason === 'stopped_responding' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Log Contact Attempts</p>
              <p className="text-xs text-slate-400 mt-0.5">
                TBW policy requires at least 6 attempts (calls + texts) over 2 months before exiting.
                <span className={cn('ml-2 font-semibold', contactAttempts.length >= 6 ? 'text-emerald-600' : 'text-amber-600')}>
                  {contactAttempts.length}/6 logged
                </span>
              </p>
            </div>
            <button onClick={addAttempt}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors">
              <Plus size={13} /> Add attempt
            </button>
          </div>

          {contactAttempts.length === 0 && (
            <p className="text-xs text-slate-400 italic text-center py-3">No attempts logged yet. Add at least 6.</p>
          )}

          <div className="space-y-2">
            {contactAttempts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <input
                  type="date"
                  value={a.date}
                  onChange={e => updateAttempt(i, { date: e.target.value })}
                  className="form-input text-xs py-1.5 w-36"
                />
                <div className="flex gap-1">
                  {METHOD_OPTIONS.map(m => {
                    const MIcon = m.icon
                    return (
                      <button
                        key={m.value}
                        onClick={() => updateAttempt(i, { method: m.value })}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border',
                          a.method === m.value
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'border-slate-200 text-slate-500 hover:border-teal-300'
                        )}
                      >
                        <MIcon size={11} /> {m.label}
                      </button>
                    )
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={a.notes}
                  onChange={e => updateAttempt(i, { notes: e.target.value })}
                  className="form-input text-xs py-1.5 flex-1"
                />
                <button onClick={() => removeAttempt(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {contactAttempts.length >= 6 && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={14} /> 6+ attempts logged — criteria met to exit for non-response.
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
