'use client'
import { SectionHeader, FieldGroup, CheckGrid, DetailInput } from './ui'
import { HOW_HEARD_OPTIONS, TBW_GOALS } from './types'
import type { ParticipantSection } from './types'

interface Props {
  data: ParticipantSection
  onChange: (d: Partial<ParticipantSection>) => void
}

export function SectionParticipant({ data, onChange }: Props) {
  const toggleArr = (key: 'howHeard' | 'tbwGoals', val: string) => {
    const arr = data[key]
    onChange({ [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] })
  }

  return (
    <div className="space-y-7" id="participant">
      <SectionHeader
        title="Participant Information"
        sub="Fill out before or during the enrollment meeting. Pre-filled fields come from intake."
      />

      {/* Name row */}
      <div className="grid grid-cols-3 gap-4">
        <FieldGroup label="First Name" required>
          <input className="form-input" value={data.firstName}
            onChange={e => onChange({ firstName: e.target.value })} placeholder="First name" />
        </FieldGroup>
        <FieldGroup label="Last Name" required>
          <input className="form-input" value={data.lastName}
            onChange={e => onChange({ lastName: e.target.value })} placeholder="Last name" />
        </FieldGroup>
        <FieldGroup label="Preferred Name">
          <input className="form-input" value={data.preferredName}
            onChange={e => onChange({ preferredName: e.target.value })} placeholder="If different" />
        </FieldGroup>
      </div>

      <FieldGroup label="Pronouns">
        <input className="form-input w-40" value={data.pronouns}
          onChange={e => onChange({ pronouns: e.target.value })} placeholder="e.g. she/her" />
      </FieldGroup>

      {/* How heard */}
      <FieldGroup label="How did you hear about The Book Works?">
        <CheckGrid
          options={HOW_HEARD_OPTIONS}
          selected={data.howHeard}
          onToggle={v => toggleArr('howHeard', v)}
          cols={3}
        />
        {data.howHeard.includes('Community organization') && (
          <div className="mt-2 ml-6">
            <DetailInput
              label="Organization name"
              value={data.howHeardOrg}
              onChange={v => onChange({ howHeardOrg: v })}
              placeholder="Which community organization?"
            />
          </div>
        )}
        {data.howHeard.includes('Other') && (
          <div className="mt-2 ml-6">
            <DetailInput
              label="Other — please describe"
              value={data.howHeardOther}
              onChange={v => onChange({ howHeardOther: v })}
              placeholder="How they heard about TBW"
            />
          </div>
        )}
      </FieldGroup>

      {/* TBW Goals */}
      <FieldGroup
        label="What are your goals for working with The Book Works?"
        hint="Check all that apply."
      >
        <CheckGrid
          options={TBW_GOALS}
          selected={data.tbwGoals}
          onToggle={v => toggleArr('tbwGoals', v)}
          cols={2}
        />
        <div className="mt-3">
          <DetailInput
            label="Other goal"
            value={data.tbwGoalsOther}
            onChange={v => onChange({ tbwGoalsOther: v })}
            placeholder="Describe any other goals…"
          />
        </div>
      </FieldGroup>
    </div>
  )
}
