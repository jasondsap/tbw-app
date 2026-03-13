'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, Wand2, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SECTIONS, DEFAULT_FORM } from './types'
import type { EnrollmentFormData } from './types'
import { SectionParticipant } from './section-participant'
import { SectionEducation }   from './section-education'
import { SectionGoals }       from './section-goals'
import { SectionChallenges }  from './section-challenges'
import { SectionBarriers }    from './section-barriers'
import { SectionResources }   from './section-resources'

interface Props {
  caseId:          string
  participantName: string
  // Pre-fill from intake / case record
  prefill?: Partial<EnrollmentFormData>
  existingData?: EnrollmentFormData | null
}

// ── Completeness score ────────────────────────────────────────────────────────
function calcCompleteness(form: EnrollmentFormData): number {
  let filled = 0, total = 0

  const req = (v: unknown) => { total++; if (v && (Array.isArray(v) ? v.length > 0 : String(v).trim())) filled++ }

  req(form.participant.firstName)
  req(form.participant.lastName)
  req(form.participant.tbwGoals.length)
  req(form.education.currentSchool)
  req(form.education.currentGrade)
  req(form.education.highestEdCompleted)
  req(form.education.graduated)
  req(form.goals.strengths.length)
  req(form.goals.longTermGoals.length)
  req(form.meetingDate)

  return Math.round((filled / total) * 100)
}

// ── Completeness ring SVG ─────────────────────────────────────────────────────
function CompletenessRing({ pct }: { pct: number }) {
  const r = 16, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? '#0d9488' : pct >= 50 ? '#f59e0b' : '#94a3b8'
  return (
    <svg width={40} height={40} viewBox="0 0 40 40">
      <circle cx={20} cy={20} r={r} fill="none" stroke="#e2e8f0" strokeWidth={4} />
      <circle cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 20 20)" />
      <text x={20} y={24} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
        {pct}%
      </text>
    </svg>
  )
}

export function EnrollmentForm({ caseId, participantName, prefill, existingData }: Props) {
  const [form, setForm]           = useState<EnrollmentFormData>(() => ({
    ...DEFAULT_FORM,
    ...prefill,
    ...(existingData ?? {}),
  }))
  const [activeSection, setActive] = useState('participant')
  const [saving, setSaving]        = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(form.status === 'submitted')
  const [generatingGoals, setGen]   = useState(false)
  const [goalsGenerated, setGoalsGenerated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const pct = calcCompleteness(form)

  // ── Auto-save draft on change ────────────────────────────────────────────
  const saveDraft = useCallback(async (data: EnrollmentFormData) => {
    setSaving(true)
    try {
      await fetch(`/api/cases/${caseId}/enrollment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...data, status: 'draft' }),
      })
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [caseId])

  const update = (patch: Partial<EnrollmentFormData>) => {
    setForm(prev => {
      const next = { ...prev, ...patch }
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveDraft(next), 1500)
      return next
    })
  }

  const updateSection = <K extends keyof EnrollmentFormData>(
    key: K,
    patch: Partial<EnrollmentFormData[K]>
  ) => {
    setForm(prev => {
      const next = { ...prev, [key]: { ...(prev[key] as object), ...patch } }
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveDraft(next), 1500)
      return next
    })
  }

  // ── Scroll spy for active nav ────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' }
    )
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) { sectionRefs.current[s.id] = el; observer.observe(el) }
    })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await fetch(`/api/cases/${caseId}/enrollment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, status: 'submitted' }),
      })
      setForm(prev => ({ ...prev, status: 'submitted' }))
      setSubmitted(true)
    } catch {
      setSaveStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── AI Goal Generation ────────────────────────────────────────────────────
  const generateGoals = async () => {
    setGen(true)
    try {
      await fetch(`/api/ai/generate-goals`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ caseId, enrollmentForm: form }),
      })
      setGoalsGenerated(true)
    } catch {
      console.error('Goal generation failed')
    } finally {
      setGen(false)
    }
  }

  return (
    <div className="flex gap-0 min-h-screen">

      {/* ── Sticky left nav ─────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 sticky top-0 h-screen overflow-y-auto
                        border-r border-slate-100 bg-white pt-6 pb-10 px-3">
        {/* Completeness ring */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <CompletenessRing pct={pct} />
          <div>
            <p className="text-xs font-bold text-slate-700">Form progress</p>
            <p className="text-[10px] text-slate-400">{pct >= 80 ? 'Ready to submit' : 'Keep filling in'}</p>
          </div>
        </div>

        {/* Section links */}
        <nav className="space-y-0.5">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                activeSection === s.id
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <span className="text-base leading-none">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        {/* Save status */}
        <div className="mt-6 px-2">
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 size={11} className="animate-spin" /> Saving…
            </div>
          )}
          {saveStatus === 'saved' && !saving && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 size={11} /> Draft saved
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle size={11} /> Save failed
            </div>
          )}
          {saveStatus === 'idle' && !saving && form.status === 'draft' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={11} /> Auto-saves as you type
            </div>
          )}
        </div>

        {/* Meeting meta */}
        <div className="mt-6 px-2 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
              Meeting Date
            </label>
            <input
              type="date"
              value={form.meetingDate}
              onChange={e => update({ meetingDate: e.target.value })}
              className="form-input text-xs py-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
              Meeting Type
            </label>
            <div className="flex gap-1">
              {(['in_person', 'virtual'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => update({ meetingType: t })}
                  className={cn(
                    'flex-1 py-1 rounded text-[10px] font-medium border transition-all',
                    form.meetingType === t
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'border-slate-200 text-slate-500 hover:border-teal-300'
                  )}>
                  {t === 'in_person' ? 'In-person' : 'Virtual'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 px-8 py-8 space-y-14 max-w-2xl">

        {submitted && (
          <div className="sticky top-4 z-10 flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200
                          rounded-xl shadow-sm mb-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium text-emerald-800">
              Enrollment form submitted — it's on file for this case.
            </p>
          </div>
        )}

        <SectionParticipant
          data={form.participant}
          onChange={p => updateSection('participant', p)}
        />
        <div className="border-t border-slate-100" />

        <SectionEducation
          data={form.education}
          onChange={e => updateSection('education', e)}
        />
        <div className="border-t border-slate-100" />

        <SectionGoals
          data={form.goals}
          onChange={g => updateSection('goals', g)}
        />
        <div className="border-t border-slate-100" />

        <SectionChallenges
          data={form.challenges}
          onChange={c => updateSection('challenges', c)}
        />
        <div className="border-t border-slate-100" />

        <SectionBarriers
          data={form.barriers}
          onChange={b => updateSection('barriers', b)}
        />
        <div className="border-t border-slate-100" />

        <SectionResources
          data={form.resources}
          onChange={r => updateSection('resources', r)}
        />

        {/* Additional notes */}
        <div>
          <label className="form-label">Advocate Notes</label>
          <p className="text-xs text-slate-400 mb-1">
            Anything else from the enrollment meeting that isn't captured above.
          </p>
          <textarea
            rows={4}
            className="form-input resize-none"
            value={form.notes}
            onChange={e => update({ notes: e.target.value })}
            placeholder="Additional context, family dynamics, follow-up items, impressions from the meeting…"
          />
        </div>

        {/* Bottom action bar */}
        <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-white/95 backdrop-blur
                        border-t border-slate-100 flex items-center gap-4">
          {/* AI Generate Goals */}
          <button
            onClick={generateGoals}
            disabled={generatingGoals || pct < 40}
            title={pct < 40 ? 'Fill in more of the form first' : 'Generate case goals from enrollment data'}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2',
              goalsGenerated
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100',
              (generatingGoals || pct < 40) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {generatingGoals
              ? <><Loader2 size={14} className="animate-spin" /> Generating goals…</>
              : goalsGenerated
                ? <><CheckCircle2 size={14} /> Goals generated</>
                : <><Wand2 size={14} /> Generate case goals</>
            }
          </button>

          <div className="flex-1" />

          {/* Manual save */}
          <button
            onClick={() => saveDraft(form)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600
                       text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Save size={14} />
            Save Draft
          </button>

          {/* Submit */}
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || pct < 40}
              title={pct < 40 ? 'Fill in at least the required fields first' : undefined}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              {submitting
                ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
                : <>Submit Enrollment Form</>
              }
            </button>
          ) : (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200
                            text-emerald-700 text-sm font-semibold rounded-xl">
              <CheckCircle2 size={14} /> Submitted
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
