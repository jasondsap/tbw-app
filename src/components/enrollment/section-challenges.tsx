'use client'
import { SectionHeader, FieldGroup, CheckGrid, DetailInput } from './ui'
import { CLASS_CHALLENGES, SCHOOL_ENV_CHALLENGES } from './types'
import type { ChallengesSection } from './types'
import { cn } from '@/lib/utils'

interface Props {
  data: ChallengesSection
  onChange: (d: Partial<ChallengesSection>) => void
}

export function SectionChallenges({ data, onChange }: Props) {
  const toggleArr = (key: 'classChallenges' | 'schoolChallenges', val: string) => {
    const arr = data[key]
    onChange({ [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] })
  }

  return (
    <div className="space-y-7" id="challenges">
      <SectionHeader
        title="Challenges"
        sub="Academic and school environment challenges the learner is experiencing."
      />

      <FieldGroup label="Classes" hint="Check all that apply.">
        <CheckGrid
          options={CLASS_CHALLENGES}
          selected={data.classChallenges}
          onToggle={v => toggleArr('classChallenges', v)}
          cols={2}
        />
      </FieldGroup>

      <FieldGroup label="School Environment" hint="Check all that apply.">
        <CheckGrid
          options={SCHOOL_ENV_CHALLENGES}
          selected={data.schoolChallenges}
          onToggle={v => toggleArr('schoolChallenges', v)}
          cols={2}
        />
      </FieldGroup>

      {/* Suspensions - standalone with detail */}
      <div>
        <button
          type="button"
          onClick={() => onChange({ suspensions: !data.suspensions })}
          className="flex items-center gap-3 group w-full text-left"
        >
          <div className={cn(
            'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
            data.suspensions
              ? 'bg-teal-600 border-teal-600'
              : 'border-slate-300 group-hover:border-teal-400'
          )}>
            {data.suspensions && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm font-semibold text-slate-700">Suspensions</span>
        </button>

        {data.suspensions && (
          <div className="mt-3 ml-7">
            <DetailInput
              label="How often? How many?"
              value={data.suspensionsDetail}
              onChange={v => onChange({ suspensionsDetail: v })}
              placeholder="e.g. 3 suspensions this year, mostly for tardiness disputes"
              rows={2}
            />
          </div>
        )}
      </div>
    </div>
  )
}
