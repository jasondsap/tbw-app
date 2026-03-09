'use client'
import { useState } from 'react'
import { X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InvolvementScoreModalProps {
  caseId:   string
  onClose:  () => void
  onScored: (score: number) => void
}

type Urgency    = 'high' | 'low'
type Involvement = 'high' | 'low'

// Score matrix: urgency × involvement → score
const SCORE_MATRIX: Record<Urgency, Record<Involvement, number>> = {
  high: { high: 4, low: 3 },
  low:  { high: 2, low: 1 },
}

// From involvement_score_factors table
const FACTORS_BY_SCORE: Record<number, { category: string; label: string }[]> = {
  4: [
    { category: 'Housing',       label: 'Housing instability - hotel/car/street/evicted' },
    { category: 'Mental Health', label: 'Ongoing self-harm/suicidal ideation/mental health crisis' },
    { category: 'Safety',        label: 'Ongoing severe bullying' },
    { category: 'Foster Care',   label: 'New to foster care' },
    { category: 'Legal',         label: 'New court-involved truant' },
    { category: 'Language',      label: 'Multilingual learner needing language support' },
  ],
  3: [
    { category: 'Transfer',    label: 'Immediate transfer needed' },
    { category: 'Enrollment',  label: 'Unenrolled' },
    { category: 'IEP/504',     label: 'ECE - implementation of IEP/504/BIP' },
    { category: 'Credits',     label: 'Credit recovery enrollment' },
    { category: 'Foster Care', label: 'Ongoing foster care involvement' },
    { category: 'Substance',   label: 'Ongoing SA' },
    { category: 'Violence',    label: 'Ongoing community/gun violence' },
    { category: 'Grief',       label: 'Ongoing grief/loss of a loved one' },
    { category: 'ECE',         label: 'Assessment for ECE' },
    { category: 'Parenting',   label: 'Accessing parenting/pregnancy resources' },
    { category: 'Legal',       label: 'Justice involvement' },
  ],
  2: [
    { category: 'Housing',       label: 'Housing instability - safe but unstable' },
    { category: 'Bullying',      label: 'Bullying' },
    { category: 'Violence',      label: 'Community/gun violence' },
    { category: 'Language',      label: 'Multilingual learner' },
    { category: 'Transportation',label: 'Immediate transportation needs' },
    { category: 'Economic',      label: 'Economic needs - referring to resources' },
    { category: 'Legal',         label: 'Court-involved truant monitoring' },
  ],
  1: [
    { category: 'Transition',     label: 'Transitioning back to comprehensive school' },
    { category: 'Transfer',       label: 'Transferring schools' },
    { category: 'Credits',        label: 'Credit recovery help' },
    { category: 'Navigation',     label: 'Navigating education options' },
    { category: 'Enrollment',     label: 'Withdrawn/Gap in enrollment' },
    { category: 'Discipline',     label: 'Reducing suspensions' },
    { category: 'Online',         label: 'Online learning' },
    { category: 'Post-graduation',label: 'Setting post-graduation goals' },
    { category: 'Self-advocacy',  label: 'Self-advocacy' },
  ],
}

const SCORE_LABELS: Record<number, { title: string; desc: string; color: string }> = {
  4: { title: 'Score 4', desc: 'High Urgency + High Involvement', color: 'bg-red-500' },
  3: { title: 'Score 3', desc: 'High Urgency + Low Involvement',  color: 'bg-orange-500' },
  2: { title: 'Score 2', desc: 'Low Urgency + High Involvement',  color: 'bg-amber-500' },
  1: { title: 'Score 1', desc: 'Low Urgency + Low Involvement',   color: 'bg-slate-400' },
}

export function InvolvementScoreModal({ caseId, onClose, onScored }: InvolvementScoreModalProps) {
  const [urgency,      setUrgency]      = useState<Urgency | null>(null)
  const [involvement,  setInvolvement]  = useState<Involvement | null>(null)
  const [selectedFactors, setSelectedFactors] = useState<string[]>([])
  const [notes,        setNotes]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [step,         setStep]         = useState<1 | 2>(1)

  const score = urgency && involvement ? SCORE_MATRIX[urgency][involvement] : null
  const scoreCfg = score ? SCORE_LABELS[score] : null
  const factors = score ? FACTORS_BY_SCORE[score] : []

  const toggleFactor = (label: string) =>
    setSelectedFactors(prev =>
      prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]
    )

  const handleSubmit = async () => {
    if (!score || !urgency || !involvement) return
    setSaving(true)
    try {
      await fetch(`/api/cases/${caseId}/involvement-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urgency, involvement, score, factors: selectedFactors, scoreNotes: notes }),
      })
      onScored(score)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 font-display">Involvement Score</h2>
            <p className="text-xs text-slate-400 mt-0.5">Rate urgency and involvement level (1–4)</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">

              {/* Urgency */}
              <div>
                <label className="form-label">Urgency Level</label>
                <p className="text-xs text-slate-400 mb-3">How immediately does this learner need support?</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['high', 'low'] as Urgency[]).map(u => (
                    <button
                      key={u}
                      onClick={() => setUrgency(u)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        urgency === u
                          ? u === 'high'
                            ? 'border-red-500 bg-red-50'
                            : 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {u === 'high' && <AlertTriangle size={14} className="text-red-500" />}
                        <span className="text-sm font-semibold text-slate-800 capitalize">
                          {u} Urgency
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {u === 'high'
                          ? 'Immediate safety, housing, or crisis concerns'
                          : 'Education barriers without immediate safety risk'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Involvement */}
              <div>
                <label className="form-label">Involvement Level</label>
                <p className="text-xs text-slate-400 mb-3">How complex is this case and our advocacy role?</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['high', 'low'] as Involvement[]).map(inv => (
                    <button
                      key={inv}
                      onClick={() => setInvolvement(inv)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        involvement === inv
                          ? 'border-navy-700 bg-navy-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <span className="text-sm font-semibold text-slate-800 capitalize block mb-1">
                        {inv} Involvement
                      </span>
                      <p className="text-xs text-slate-500">
                        {inv === 'high'
                          ? 'Multiple barriers, ongoing advocacy coordination needed'
                          : 'Focused support on one or two education goals'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resulting score preview */}
              {score && scoreCfg && (
                <div className={cn(
                  'flex items-center gap-4 p-4 rounded-xl',
                  score === 4 ? 'bg-red-50 border border-red-200' :
                  score === 3 ? 'bg-orange-50 border border-orange-200' :
                  score === 2 ? 'bg-amber-50 border border-amber-200' :
                  'bg-slate-50 border border-slate-200'
                )}>
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0', scoreCfg.color)}>
                    {score}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{scoreCfg.desc}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {score === 4 ? 'Highest priority — assign immediately' :
                       score === 3 ? 'High priority — assign within 1-2 days' :
                       score === 2 ? 'Standard priority — assign within the week' :
                       'Routine — assign when capacity allows'}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!score}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40
                           text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Continue — Select Factors →
              </button>
            </div>
          )}

          {step === 2 && score && (
            <div className="space-y-5">
              <button onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                ← Back to Score
              </button>

              <div>
                <label className="form-label">Contributing Factors</label>
                <p className="text-xs text-slate-400 mb-3">Select all that apply for this learner (Score {score})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {factors.map(factor => (
                    <label key={factor.label} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="accent-teal-600 mt-0.5 w-4 h-4 flex-shrink-0"
                        checked={selectedFactors.includes(factor.label)}
                        onChange={() => toggleFactor(factor.label)}
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{factor.category} · </span>
                        <span className="text-xs text-slate-700">{factor.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Additional Notes</label>
                <textarea
                  className="form-input resize-none text-sm"
                  rows={3}
                  placeholder="Any additional context about the scoring decision..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5
                           bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                           text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> Saving Score...</>
                  : <><CheckCircle2 size={15} /> Save Score {score}</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
