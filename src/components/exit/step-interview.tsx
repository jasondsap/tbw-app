'use client'
import { cn } from '@/lib/utils'
import { PROGRAMS } from './types'
import type { ExitInterviewData, GoalOutcome } from './types'

interface StepInterviewProps {
  data:       ExitInterviewData
  goals:      { id: string; text: string; category: string }[]
  onUpdate:   (data: Partial<ExitInterviewData>) => void
  onBack:     () => void
  onNext:     () => void
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="border-b border-slate-100 pb-2 mb-4">
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(opt => (
        <button
          key={String(opt.v)}
          onClick={() => onChange(opt.v)}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-medium border transition-all',
            value === opt.v
              ? 'bg-teal-600 text-white border-teal-600'
              : 'border-slate-200 text-slate-500 hover:border-teal-300'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function GoalRow({
  goal, outcome, onChange,
}: {
  goal: { id: string; text: string }
  outcome: GoalOutcome
  onChange: (o: Partial<GoalOutcome>) => void
}) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-3 pr-4 text-xs text-slate-700 align-top w-1/2">{goal.text}</td>
      <td className="py-3 pr-4 align-top w-20">
        <YesNo value={outcome.reached} onChange={v => onChange({ reached: v })} />
      </td>
      <td className="py-3 align-top">
        <input
          type="text"
          placeholder="Notes…"
          value={outcome.comments}
          onChange={e => onChange({ comments: e.target.value })}
          className="form-input text-xs py-1.5 w-full"
        />
      </td>
    </tr>
  )
}

export function StepInterview({ data, goals, onUpdate, onBack, onNext }: StepInterviewProps) {
  const updateGoal = (goalId: string, fields: Partial<GoalOutcome>) => {
    onUpdate({
      goalOutcomes: data.goalOutcomes.map(g =>
        g.goalId === goalId ? { ...g, ...fields } : g
      ),
    })
  }

  const updateBarrier = (i: number, fields: Partial<{ barrier: string; improved: boolean | null; comments: string }>) => {
    onUpdate({
      barrierOutcomes: data.barrierOutcomes.map((b, idx) => idx === i ? { ...b, ...fields } : b)
    })
  }

  const toggleProgram = (p: string) => {
    const has = data.programsParticipated.includes(p)
    onUpdate({ programsParticipated: has ? data.programsParticipated.filter(x => x !== p) : [...data.programsParticipated, p] })
  }

  const toggleNextStep = (key: keyof typeof data.nextSteps) => {
    onUpdate({ nextSteps: { ...data.nextSteps, [key]: !data.nextSteps[key] } })
  }

  const NEXT_STEP_OPTIONS: { key: keyof typeof data.nextSteps; label: string }[] = [
    { key: 'twoYearCollege',  label: '2-year college' },
    { key: 'fourYearCollege', label: '4-year college' },
    { key: 'tradeSchool',     label: 'Trade or technical school' },
    { key: 'employment',      label: 'Employment' },
    { key: 'military',        label: 'Military' },
    { key: 'stillPlanning',   label: 'Still making plans' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-800 font-display">Exit Interview</h2>
        <p className="text-sm text-slate-500 mt-1">
          Use this form to guide the exit conversation. Fill it out during or after the meeting.
        </p>
      </div>

      {/* ── Page 1 ─────────────────────────────────────────── */}

      {/* Education status */}
      <div className="card p-5">
        <SectionHead title="Education Status" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label">Current / Last School</label>
            <input
              className="form-input"
              value={data.currentSchool}
              onChange={e => onUpdate({ currentSchool: e.target.value })}
              placeholder="School name"
            />
          </div>
          <div>
            <label className="form-label">Current Grade</label>
            <input
              className="form-input"
              value={data.currentGrade}
              onChange={e => onUpdate({ currentGrade: e.target.value })}
              placeholder="e.g. 10"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Graduated from high school?</span>
          <YesNo value={data.graduated} onChange={v => onUpdate({ graduated: v })} />
        </div>
      </div>

      {/* Employment */}
      <div className="card p-5">
        <SectionHead title="Employment Status" />
        <div className="flex items-center gap-4 mb-3">
          <span className="text-sm text-slate-600">Employed?</span>
          <YesNo value={data.employed} onChange={v => onUpdate({ employed: v })} />
        </div>
        {data.employed && (
          <div>
            <label className="form-label">Occupation / Employer</label>
            <input
              className="form-input"
              value={data.occupation}
              onChange={e => onUpdate({ occupation: e.target.value })}
              placeholder="Job title or employer name"
            />
          </div>
        )}
      </div>

      {/* Goals table */}
      <div className="card p-5">
        <SectionHead title="Goals" sub="For each goal, mark whether it was reached and add any notes." />
        {data.goalOutcomes.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No goals found for this case.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2 w-1/2">Goal at Start</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2 w-20">Reached?</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Comments</th>
              </tr>
            </thead>
            <tbody>
              {data.goalOutcomes.map(outcome => {
                const goal = goals.find(g => g.id === outcome.goalId)
                if (!goal) return null
                return (
                  <GoalRow
                    key={outcome.goalId}
                    goal={goal}
                    outcome={outcome}
                    onChange={fields => updateGoal(outcome.goalId, fields)}
                  />
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Next steps */}
      <div className="card p-5">
        <SectionHead title="Next Steps" sub="Check all that apply." />
        <div className="flex flex-wrap gap-2">
          {NEXT_STEP_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleNextStep(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                data.nextSteps[key]
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'border-slate-200 text-slate-600 hover:border-teal-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Barriers */}
      <div className="card p-5">
        <SectionHead title="Barriers" sub="List the barriers identified at the start and note whether they improved." />
        {data.barrierOutcomes.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No barriers pulled from case — add them manually below if needed.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2 w-1/2">Barrier at Start</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2 w-20">Improved?</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Comments</th>
              </tr>
            </thead>
            <tbody>
              {data.barrierOutcomes.map((b, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-3 pr-4 text-xs text-slate-700 align-top">{b.barrier}</td>
                  <td className="py-3 pr-4 align-top">
                    <YesNo value={b.improved} onChange={v => updateBarrier(i, { improved: v })} />
                  </td>
                  <td className="py-3 align-top">
                    <input
                      type="text"
                      placeholder="Notes…"
                      value={b.comments}
                      onChange={e => updateBarrier(i, { comments: e.target.value })}
                      className="form-input text-xs py-1.5 w-full"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Page 2 ─────────────────────────────────────────── */}

      {/* Programs participated */}
      <div className="card p-5">
        <SectionHead title="Programs Participated In" sub="Check all that apply." />
        <div className="space-y-2">
          {PROGRAMS.map(p => (
            <label key={p} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={data.programsParticipated.includes(p)}
                onChange={() => toggleProgram(p)}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">{p}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reflection questions */}
      <div className="card p-5 space-y-5">
        <SectionHead title="Reflection Questions" sub="The three questions from the back of the exit form." />

        <div>
          <label className="form-label">
            What positive changes have you seen in yourself or your experience at school as a result of The Book Works' services?
          </label>
          <textarea
            rows={3}
            className="form-input"
            value={data.positiveChanges}
            onChange={e => onUpdate({ positiveChanges: e.target.value })}
            placeholder="Learner's response…"
          />
        </div>

        <div>
          <label className="form-label">
            Were The Book Works staff accessible, knowledgeable, respectful, and helpful?
          </label>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-400">Not at all</span>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => onUpdate({ satisfactionRating: n })}
                className={cn(
                  'w-9 h-9 rounded-full border-2 text-sm font-bold transition-all',
                  data.satisfactionRating === n
                    ? 'border-teal-500 bg-teal-600 text-white'
                    : 'border-slate-200 text-slate-500 hover:border-teal-300'
                )}
              >
                {n}
              </button>
            ))}
            <span className="text-xs text-slate-400">Yes, always</span>
          </div>
        </div>

        <div>
          <label className="form-label">How can we improve?</label>
          <textarea
            rows={3}
            className="form-input"
            value={data.howToImprove}
            onChange={e => onUpdate({ howToImprove: e.target.value })}
            placeholder="Learner's response…"
          />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack}
          className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
          ← Back
        </button>
        <button onClick={onNext}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}
