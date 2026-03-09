'use client'
import { SectionHeader, FieldGroup, YesNoField, DetailInput } from './ui'
import { EDUCATION_LEVELS } from './types'
import type { EducationSection } from './types'
import { cn } from '@/lib/utils'

interface Props {
  data: EducationSection
  onChange: (d: Partial<EducationSection>) => void
}

export function SectionEducation({ data, onChange }: Props) {
  return (
    <div className="space-y-7" id="education">
      <SectionHeader
        title="Education / Employment Status"
        sub="School history and current enrollment status."
      />

      {/* School + Grade */}
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Current School / Last School Attended">
          <input className="form-input" value={data.currentSchool}
            onChange={e => onChange({ currentSchool: e.target.value })}
            placeholder="School name" />
        </FieldGroup>
        <FieldGroup label="Current Grade">
          <input className="form-input" value={data.currentGrade}
            onChange={e => onChange({ currentGrade: e.target.value })}
            placeholder="e.g. 10" />
        </FieldGroup>
      </div>

      {/* Highest ed completed */}
      <FieldGroup label="Highest Level of Education Completed">
        <div className="flex flex-wrap gap-2">
          {EDUCATION_LEVELS.map(level => (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange({ highestEdCompleted: level.value })}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border-2 font-medium transition-all',
                data.highestEdCompleted === level.value
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-teal-300 bg-white'
              )}
            >
              {level.label}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Last attended */}
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="When did you last attend school?">
          <input className="form-input" value={data.lastAttended}
            onChange={e => onChange({ lastAttended: e.target.value })}
            placeholder="e.g. Spring 2024 / Last month" />
        </FieldGroup>
        <FieldGroup label="Where did you last attend?">
          <input className="form-input" value={data.lastAttendedWhere}
            onChange={e => onChange({ lastAttendedWhere: e.target.value })}
            placeholder="School name or city" />
        </FieldGroup>
      </div>

      {/* HS year + graduated */}
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="What year did you start high school?">
          <input className="form-input w-36" value={data.hsStartYear}
            onChange={e => onChange({ hsStartYear: e.target.value })}
            placeholder="e.g. 2021" />
        </FieldGroup>
        <FieldGroup label="Have you graduated from high school?">
          <YesNoField value={data.graduated} onChange={v => onChange({ graduated: v })} />
        </FieldGroup>
      </div>

      <div className="border-t border-slate-100 pt-6 space-y-5">
        {/* Employment */}
        <FieldGroup label="Currently employed?">
          <div className="space-y-3">
            <YesNoField value={data.employed} onChange={v => onChange({ employed: v })} />
            {data.employed && (
              <input className="form-input" value={data.occupation}
                onChange={e => onChange({ occupation: e.target.value })}
                placeholder="Occupation / Employer name" />
            )}
          </div>
        </FieldGroup>

        {/* Health concerns */}
        <FieldGroup
          label="Are there any physical or behavioral health concerns that impact you at school?"
          hint="Including allergies, medical conditions, or anything we should know."
        >
          <textarea
            rows={3}
            className="form-input resize-none"
            value={data.healthConcerns}
            onChange={e => onChange({ healthConcerns: e.target.value })}
            placeholder="Describe any health concerns that impact school attendance or learning…"
          />
        </FieldGroup>
      </div>
    </div>
  )
}
