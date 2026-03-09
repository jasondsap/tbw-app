'use client'
import { SectionHeader, FieldGroup, CheckGrid, DetailInput } from './ui'
import { STRENGTHS, LONG_TERM_GOALS } from './types'
import type { GoalsSection } from './types'

interface Props {
  data: GoalsSection
  onChange: (d: Partial<GoalsSection>) => void
}

export function SectionGoals({ data, onChange }: Props) {
  const toggle = (key: 'strengths' | 'longTermGoals', val: string) => {
    const arr = data[key]
    onChange({ [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] })
  }

  return (
    <div className="space-y-7" id="goals">
      <SectionHeader
        title="Goals & Strengths"
        sub="A strengths-first view of the learner's assets and future plans."
      />

      <FieldGroup
        label="What are your strengths?"
        hint="What are you good at in school or in general? Check all that apply."
      >
        <CheckGrid
          options={STRENGTHS}
          selected={data.strengths}
          onToggle={v => toggle('strengths', v)}
          cols={3}
        />
        <div className="mt-3">
          <DetailInput
            label="Other strength"
            value={data.strengthsOther}
            onChange={v => onChange({ strengthsOther: v })}
            placeholder="Any other strengths to note…"
          />
        </div>
      </FieldGroup>

      <FieldGroup label="What are your long-term goals?" hint="Check all that apply.">
        <CheckGrid
          options={LONG_TERM_GOALS}
          selected={data.longTermGoals}
          onToggle={v => toggle('longTermGoals', v)}
          cols={3}
        />
      </FieldGroup>

      <FieldGroup label="What career fields interest you?">
        <textarea
          rows={3}
          className="form-input resize-none"
          value={data.careerInterests}
          onChange={e => onChange({ careerInterests: e.target.value })}
          placeholder="Describe career interests, dream jobs, industries they're curious about…"
        />
      </FieldGroup>
    </div>
  )
}
