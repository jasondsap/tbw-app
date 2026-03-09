'use client'
import { cn } from '@/lib/utils'
import { STRENGTHS, LONG_TERM_GOALS, CLASS_CHALLENGES, SCHOOL_CHALLENGES, COPING_SKILLS } from './types'
import type { ToolkitData } from './types'

interface StepToolkitProps {
  data:     ToolkitData
  onUpdate: (data: Partial<ToolkitData>) => void
  onBack:   () => void
  onNext:   () => void
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="border-b border-slate-100 pb-2 mb-4">
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function CheckGrid({ options, selected, onToggle, cols = 3 }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; cols?: number
}) {
  return (
    <div className={cn('grid gap-2', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="w-4 h-4 accent-teal-600 flex-shrink-0"
          />
          <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt}</span>
        </label>
      ))}
    </div>
  )
}

export function StepToolkit({ data, onUpdate, onBack, onNext }: StepToolkitProps) {
  const toggle = (key: 'strengths' | 'longTermGoals' | 'challengeClasses' | 'challengeSchool' | 'copingSkills', val: string) => {
    const arr = data[key] as string[]
    onUpdate({ [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] })
  }

  const updateAdult = (i: number, field: 'name' | 'phone', val: string) => {
    const updated = data.trustedAdults.map((a, idx) => idx === i ? { ...a, [field]: val } : a)
    onUpdate({ trustedAdults: updated })
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-lg font-bold text-slate-800 font-display">Program Completion Toolkit</h2>
        <p className="text-sm text-slate-500 mt-1">
          Fill this out with the learner. They keep the completed copy — we keep a scan on file.
        </p>
      </div>

      {/* Strengths */}
      <div className="card p-5">
        <SectionHead title="Strengths" sub="What are you good at in school or in general? Check all that apply." />
        <CheckGrid options={STRENGTHS} selected={data.strengths} onToggle={v => toggle('strengths', v)} cols={3} />
        <div className="mt-3">
          <label className="form-label">Other</label>
          <input
            className="form-input"
            value={data.strengthsOther}
            onChange={e => onUpdate({ strengthsOther: e.target.value })}
            placeholder="Other strengths…"
          />
        </div>
      </div>

      {/* Long-term goals */}
      <div className="card p-5">
        <SectionHead title="Long-Term Goals" sub="Check all that apply." />
        <CheckGrid options={LONG_TERM_GOALS} selected={data.longTermGoals} onToggle={v => toggle('longTermGoals', v)} cols={2} />
      </div>

      {/* Next steps narrative */}
      <div className="card p-5">
        <SectionHead title="Next Steps" sub="My next steps toward my education and career goals:" />
        <textarea
          rows={3}
          className="form-input"
          value={data.nextStepsNarrative}
          onChange={e => onUpdate({ nextStepsNarrative: e.target.value })}
          placeholder="Specific next steps the learner will take…"
        />
      </div>

      {/* Challenges */}
      <div className="card p-5 space-y-5">
        <SectionHead title="Challenges" />
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-3">Classes</p>
          <CheckGrid options={CLASS_CHALLENGES} selected={data.challengeClasses} onToggle={v => toggle('challengeClasses', v)} cols={2} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-3">School Environment</p>
          <CheckGrid options={SCHOOL_CHALLENGES} selected={data.challengeSchool} onToggle={v => toggle('challengeSchool', v)} cols={2} />
        </div>
      </div>

      {/* When I find a challenge */}
      <div className="card p-5 space-y-5">
        <SectionHead title="When I Find a Challenge at School, I Can…" />

        <div>
          <label className="form-label">Self-advocate by:</label>
          <textarea
            rows={2}
            className="form-input"
            value={data.selfAdvocacyStatement}
            onChange={e => onUpdate({ selfAdvocacyStatement: e.target.value })}
            placeholder="e.g. Speak to my teacher, email my counselor, attend tutoring…"
          />
        </div>

        <div>
          <label className="form-label">Call a trusted adult for help:</label>
          <div className="space-y-2 mt-1">
            <div className="flex gap-3 items-center">
              <span className="text-xs text-slate-500 w-36 flex-shrink-0">TBW Education Advocate</span>
              <input className="form-input text-sm flex-1" value="(Advocate name)" readOnly />
              <input className="form-input text-sm w-32" value="502-276-6136" readOnly />
            </div>
            {data.trustedAdults.map((a, i) => (
              <div key={i} className="flex gap-3 items-center">
                <span className="text-xs text-slate-400 w-36 flex-shrink-0">Adult {i + 1}</span>
                <input
                  type="text"
                  placeholder="Name"
                  value={a.name}
                  onChange={e => updateAdult(i, 'name', e.target.value)}
                  className="form-input text-sm flex-1"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={a.phone}
                  onChange={e => updateAdult(i, 'phone', e.target.value)}
                  className="form-input text-sm w-32"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">Coping skills (circle/check all that apply):</label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {COPING_SKILLS.map(skill => (
              <button
                key={skill}
                onClick={() => toggle('copingSkills', skill)}
                className={cn(
                  'py-2 px-3 rounded-xl text-xs font-medium border-2 transition-all',
                  data.copingSkills.includes(skill)
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 text-slate-600 hover:border-teal-200'
                )}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Crisis numbers — read only */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Mental Health Crisis Resources</p>
          <p className="text-xs text-slate-600">Mental Health Hotline: <strong>Call or text 988</strong></p>
          <p className="text-xs text-slate-600">The Trevor Project (LGBTQ+ youth): <strong>1-866-488-7386</strong> · Text START to 678-678</p>
          <p className="text-xs text-slate-600">Seven Counties: <strong>(502) 589-1100</strong></p>
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
