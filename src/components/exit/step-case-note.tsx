'use client'
import { useState } from 'react'
import { Wand2, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExitReason, ExitInterviewData, GoalOutcome } from './types'

interface StepCaseNoteProps {
  caseNote:    string
  reason:      ExitReason | null
  narrative:   string
  participantName: string
  goalOutcomes:   GoalOutcome[]
  interview:   ExitInterviewData
  onUpdate:    (note: string) => void
  onBack:      () => void
  onNext:      () => void
}

export function StepCaseNote({
  caseNote, reason, narrative, participantName, goalOutcomes, interview, onUpdate, onBack, onNext
}: StepCaseNoteProps) {
  const [drafting, setDrafting] = useState(false)

  const draftNote = async () => {
    setDrafting(true)
    try {
      const res = await fetch('/api/ai/draft-exit-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, narrative, participantName, goalOutcomes, interview }),
      })
      const data = await res.json()
      onUpdate(data.note ?? '')
    } catch (err) {
      console.error(err)
    } finally {
      setDrafting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800 font-display">Exit Case Note</h2>
        <p className="text-sm text-slate-500 mt-1">
          Write or AI-draft the case note summarizing the exit meeting, goals completed, and next steps.
        </p>
      </div>

      {/* Outcome label reminder */}
      {narrative && (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
          <p className="text-sm text-slate-700">
            Service outcome will be recorded as: <strong className="text-teal-700">{narrative}</strong>
          </p>
        </div>
      )}

      {/* AI draft button */}
      <div className="flex items-center gap-3">
        <button
          onClick={draftNote}
          disabled={drafting}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700
                     disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {drafting
            ? <><Loader2 size={14} className="animate-spin" /> Drafting…</>
            : caseNote
              ? <><RefreshCw size={14} /> Re-draft with AI</>
              : <><Wand2 size={14} /> Draft with AI</>
          }
        </button>
        <p className="text-xs text-slate-400">Uses exit interview responses and goal outcomes</p>
      </div>

      {/* Note editor */}
      <div>
        <label className="form-label">Exit Case Note</label>
        <textarea
          rows={14}
          className="form-input font-mono text-sm leading-relaxed"
          value={caseNote}
          onChange={e => onUpdate(e.target.value)}
          placeholder={`Write a case note summarizing:\n• Goals reached and the learner's progress\n• What went well and the learner's strengths\n• Exit circumstances and next steps\n• Reminder to the learner that they can reach back out anytime`}
        />
        <p className="text-xs text-slate-400 mt-1">This note will be attached to the case when finalized.</p>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack}
          className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
          ← Back
        </button>
        <button onClick={onNext} disabled={!caseNote.trim()}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white text-sm font-semibold rounded-xl transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}
