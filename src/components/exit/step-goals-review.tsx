'use client'
import { cn } from '@/lib/utils'
import type { GoalOutcome } from './types'

interface StepGoalsReviewProps {
  goals:        { id: string; text: string; category: string; status: string }[]
  outcomes:     GoalOutcome[]
  exitDate:     string
  onUpdate:     (outcomes: GoalOutcome[]) => void
  onDateChange: (date: string) => void
  onBack:       () => void
  onNext:       () => void
}

const GOAL_OUTCOMES = [
  { value: 'reached',       label: 'Reached',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'in_progress',   label: 'In Progress',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'not_reached',   label: 'Not Reached',     color: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'not_applicable', label: 'N/A',            color: 'bg-slate-50 text-slate-500 border-slate-200' },
]

export function StepGoalsReview({ goals, outcomes, exitDate, onUpdate, onDateChange, onBack, onNext }: StepGoalsReviewProps) {
  const updateOutcome = (goalId: string, fields: Partial<GoalOutcome>) => {
    onUpdate(outcomes.map(o => o.goalId === goalId ? { ...o, ...fields } : o))
  }

  const allMarked = outcomes.every(o => o.reached !== null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800 font-display">Goals Review</h2>
        <p className="text-sm text-slate-500 mt-1">
          Update every goal with an end date and outcome. This is required before finalizing exit.
        </p>
      </div>

      {/* Exit date */}
      <div className="card p-5">
        <label className="form-label">Exit Date</label>
        <p className="text-xs text-slate-400 mb-2">
          The date advocacy services end. The Stable service planned end date will auto-calculate to +30 days.
        </p>
        <input
          type="date"
          className="form-input w-48"
          value={exitDate}
          onChange={e => onDateChange(e.target.value)}
        />
      </div>

      {/* Goals table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {goals.length} Goal{goals.length !== 1 ? 's' : ''} · {outcomes.filter(o => o.reached !== null).length} reviewed
          </p>
        </div>

        {goals.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-8">No goals on file for this case.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {goals.map(goal => {
              const outcome = outcomes.find(o => o.goalId === goal.id)
              if (!outcome) return null
              return (
                <div key={goal.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">{goal.category}</span>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{goal.text}</p>
                    </div>
                    <span className={cn(
                      'badge text-[10px] flex-shrink-0',
                      goal.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      goal.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-50 text-slate-500'
                    )}>
                      {goal.status}
                    </span>
                  </div>

                  {/* Outcome buttons */}
                  <div className="flex flex-wrap gap-2">
                    {GOAL_OUTCOMES.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updateOutcome(goal.id, {
                          reached: opt.value === 'reached' ? true : opt.value === 'not_reached' ? false : null
                        })}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all',
                          (opt.value === 'reached' && outcome.reached === true) ||
                          (opt.value === 'not_reached' && outcome.reached === false) ||
                          (opt.value === 'in_progress' && outcome.reached === null && outcome.comments === 'in_progress') ||
                          (opt.value === 'not_applicable' && outcome.comments === 'n/a')
                            ? opt.color + ' ring-2 ring-offset-1 ring-current'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* End date + comments row */}
                  <div className="flex gap-3">
                    <div className="w-40 flex-shrink-0">
                      <label className="form-label text-[10px]">End Date</label>
                      <input
                        type="date"
                        value={outcome.endDate || exitDate}
                        onChange={e => updateOutcome(goal.id, { endDate: e.target.value })}
                        className="form-input text-xs py-1.5"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="form-label text-[10px]">Notes / Outcome description</label>
                      <input
                        type="text"
                        value={outcome.comments}
                        onChange={e => updateOutcome(goal.id, { comments: e.target.value })}
                        placeholder="Brief outcome notes…"
                        className="form-input text-xs py-1.5"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack}
          className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
          ← Back
        </button>
        <button onClick={onNext} disabled={!exitDate}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white text-sm font-semibold rounded-xl transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}
