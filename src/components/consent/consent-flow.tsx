'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormDefinition, FormScreen } from '@/lib/consents/forms'

type AnswerValue = string | string[] | null

export interface ConsentFlowProps {
  form:            FormDefinition
  caseId:          string
  mode:            'staff' | 'self_service'
  invitationToken?: string
  prefill?:        Record<string, string>
  onComplete?:     (result: { signatureId: string; outcome: 'signed' | 'declined' }) => void
}

interface ApiResult {
  signatureId?:    string
  outcome?:        'signed' | 'declined'
  pdfDownloadUrl?: string
  error?:          string
}

export function ConsentFlow({
  form, caseId, mode, invitationToken, prefill, onComplete,
}: ConsentFlowProps) {
  // Initial answers: apply prefill values where the form references them.
  const initialAnswers = useMemo<Record<string, AnswerValue>>(() => {
    const out: Record<string, AnswerValue> = {}
    for (const s of form.screens) {
      if (s.prefillFrom && prefill?.[s.prefillFrom]) {
        out[s.key] = prefill[s.prefillFrom]
      } else {
        out[s.key] = s.type === 'multi' ? [] : ''
      }
    }
    return out
  }, [form, prefill])

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(initialAnswers)
  const [stepIndex, setStepIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<ApiResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const screen = form.screens[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === form.screens.length - 1

  const setAnswer = (key: string, value: AnswerValue) =>
    setAnswers(prev => ({ ...prev, [key]: value }))

  const submit = async (outcome: 'signed' | 'declined', outcomeAtScreenKey?: string) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/consents/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          formType:    form.type,
          formVersion: form.version,
          answers,
          signedName:  outcome === 'signed' ? String(answers['signature'] ?? '').trim() : undefined,
          invitationToken: mode === 'self_service' ? invitationToken : undefined,
          outcome,
          outcomeAtScreenKey,
        }),
      })
      const data: ApiResult = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || `Server returned ${res.status}`)
        setSubmitting(false)
        return
      }
      setSubmitResult(data)
      setSubmitting(false)
      if (data.signatureId && data.outcome) {
        onComplete?.({ signatureId: data.signatureId, outcome: data.outcome })
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error')
      setSubmitting(false)
    }
  }

  const handleDecline = () => submit('declined', screen.key)

  const handleAdvance = () => {
    if (isLast) {
      submit('signed')
    } else {
      setStepIndex(i => i + 1)
    }
  }

  const handleBack = () => {
    if (!isFirst) setStepIndex(i => i - 1)
  }

  // Validation per screen — whether the user can advance from the current screen
  const canAdvance = (() => {
    if (!screen.required) return true
    const v = answers[screen.key]
    if (screen.type === 'multi') return Array.isArray(v) && v.length > 0
    if (typeof v === 'string') return v.trim().length > 0
    return false
  })()

  // Final submission view
  if (submitResult) {
    const ok = submitResult.outcome === 'signed'
    return (
      <div className="flex flex-col items-center text-center py-12 px-6">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-4',
          ok ? 'bg-emerald-100' : 'bg-slate-200',
        )}>
          {ok
            ? <ShieldCheck size={32} className="text-emerald-600" />
            : <XCircle    size={32} className="text-slate-500" />}
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          {ok ? 'Thank you — your consent has been recorded.' : 'Your response has been recorded.'}
        </h1>
        <p className="text-sm text-slate-500 max-w-md">
          {ok
            ? 'You can close this page. A signed copy is on file with The Book Works.'
            : 'You can reach out to The Book Works any time if you change your mind.'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-6">
      <ProgressBar current={stepIndex} total={form.screens.length} />

      <div className="mt-6">
        <h2 className="text-lg font-bold text-slate-800 leading-snug">{screen.prompt}</h2>
        {screen.helpText && (
          <p className="mt-2 text-sm text-slate-600 whitespace-pre-line leading-relaxed">{screen.helpText}</p>
        )}
      </div>

      <div className="mt-6">
        {renderInput(screen, answers, setAnswer)}
      </div>

      {screen.type === 'review' && (
        <ReviewSummary form={form} answers={answers} onJump={i => setStepIndex(i)} />
      )}

      {submitError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirst || submitting}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30"
        >
          <ArrowLeft size={15} /> Back
        </button>

        {screen.type === 'attestation' ? (
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDecline}
              disabled={submitting}
              className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {screen.declineLabel ?? 'I do not consent'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAnswer(screen.key, 'agreed')
                handleAdvance()
              }}
              disabled={submitting}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && isLast
                ? <><Loader2 size={14} className="animate-spin" /> Signing…</>
                : <>{screen.agreeLabel ?? 'I agree'}</>}
            </button>
          </div>
        ) : screen.type === 'signature' ? (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={!canAdvance || submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> Signing…</>
              : <>Sign &amp; Submit <CheckCircle2 size={14} /></>}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={!canAdvance || submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            {isLast ? 'Submit' : 'Next'} <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round(((current + 1) / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>Step {current + 1} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function renderInput(
  screen: FormScreen,
  answers: Record<string, AnswerValue>,
  setAnswer: (key: string, value: AnswerValue) => void,
) {
  const v = answers[screen.key]

  switch (screen.type) {
    case 'intro':
    case 'attestation':
    case 'review':
      return null

    case 'text':
      return (
        <input
          type="text"
          value={typeof v === 'string' ? v : ''}
          onChange={e => setAnswer(screen.key, e.target.value)}
          placeholder={screen.placeholder}
          className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      )

    case 'longtext':
      return (
        <textarea
          value={typeof v === 'string' ? v : ''}
          onChange={e => setAnswer(screen.key, e.target.value)}
          placeholder={screen.placeholder}
          rows={5}
          className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      )

    case 'date':
      return (
        <input
          type="date"
          value={typeof v === 'string' ? v : ''}
          onChange={e => setAnswer(screen.key, e.target.value)}
          className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      )

    case 'choice':
      return (
        <div className="space-y-2">
          {(screen.options ?? []).map(opt => {
            const selected = v === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAnswer(screen.key, opt.value)}
                className={cn(
                  'w-full px-4 py-3 text-left rounded-lg border-2 transition-colors text-sm',
                  selected
                    ? 'border-teal-500 bg-teal-50 text-teal-800 font-medium'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )

    case 'multi':
      return (
        <div className="space-y-2">
          {(screen.options ?? []).map(opt => {
            const arr = Array.isArray(v) ? v : []
            const selected = arr.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next = selected
                    ? arr.filter(x => x !== opt.value)
                    : [...arr, opt.value]
                  setAnswer(screen.key, next)
                }}
                className={cn(
                  'w-full px-4 py-3 text-left rounded-lg border-2 transition-colors text-sm flex items-center gap-3',
                  selected
                    ? 'border-teal-500 bg-teal-50 text-teal-800 font-medium'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300',
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center',
                  selected ? 'border-teal-500 bg-teal-500' : 'border-slate-300',
                )}>
                  {selected && <CheckCircle2 size={12} className="text-white" />}
                </span>
                {opt.label}
              </button>
            )
          })}
        </div>
      )

    case 'organizations':
      return <OrganizationsInput value={v} onChange={x => setAnswer(screen.key, x)} />

    case 'signature':
      return (
        <input
          type="text"
          value={typeof v === 'string' ? v : ''}
          onChange={e => setAnswer(screen.key, e.target.value)}
          placeholder="Type your full legal name"
          className="w-full px-4 py-4 text-xl border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-serif italic"
        />
      )
  }
}

function OrganizationsInput({
  value,
  onChange,
}: {
  value: AnswerValue
  onChange: (v: AnswerValue) => void
}) {
  // Stored as a JSON-encoded string so it fits in the same answer shape.
  let parsed: { schools?: string; agencies?: string; community?: string } = {}
  if (typeof value === 'string' && value.length > 0) {
    try { parsed = JSON.parse(value) } catch { parsed = {} }
  }
  const update = (key: string, v: string) => {
    const next = { ...parsed, [key]: v }
    onChange(JSON.stringify(next))
  }
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Schools</label>
        <input type="text" value={parsed.schools ?? ''} onChange={e => update('schools', e.target.value)}
          placeholder="e.g. Waggener HS, Iroquois MS"
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Agencies</label>
        <input type="text" value={parsed.agencies ?? ''} onChange={e => update('agencies', e.target.value)}
          placeholder="Court, DCBS, etc."
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Community organizations</label>
        <input type="text" value={parsed.community ?? ''} onChange={e => update('community', e.target.value)}
          placeholder="Other groups working with the participant"
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
      </div>
    </div>
  )
}

function ReviewSummary({
  form, answers, onJump,
}: {
  form: FormDefinition
  answers: Record<string, AnswerValue>
  onJump: (i: number) => void
}) {
  // Only show screens that have a meaningful answer
  const rows = form.screens
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => {
      if (s.type === 'intro' || s.type === 'review' || s.type === 'signature') return false
      const v = answers[s.key]
      if (Array.isArray(v)) return v.length > 0
      return typeof v === 'string' && v.trim().length > 0
    })
  return (
    <div className="mt-4 border border-slate-200 rounded-lg divide-y divide-slate-100">
      {rows.map(({ s, i }) => {
        const v = answers[s.key]
        let display: string
        if (Array.isArray(v)) {
          display = v.map(x => {
            const opt = s.options?.find(o => o.value === x)
            return opt?.label ?? x
          }).join(', ')
        } else if (s.type === 'choice' || s.type === 'attestation') {
          const opt = s.options?.find(o => o.value === v)
          display = opt?.label ?? String(v)
        } else if (s.type === 'organizations' && typeof v === 'string') {
          try {
            const o = JSON.parse(v)
            const parts: string[] = []
            if (o.schools) parts.push(`Schools: ${o.schools}`)
            if (o.agencies) parts.push(`Agencies: ${o.agencies}`)
            if (o.community) parts.push(`Community: ${o.community}`)
            display = parts.join(' · ') || '—'
          } catch { display = String(v) }
        } else {
          display = String(v)
        }
        return (
          <button
            type="button"
            key={s.key}
            onClick={() => onJump(i)}
            className="w-full p-3 text-left hover:bg-slate-50 transition-colors"
          >
            <p className="text-xs text-slate-500 mb-1">{s.prompt}</p>
            <p className="text-sm text-slate-800 break-words">{display}</p>
          </button>
        )
      })}
    </div>
  )
}
