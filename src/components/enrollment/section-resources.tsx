'use client'
import { SectionHeader, FieldGroup, CheckGrid, DetailInput } from './ui'
import { RESOURCES } from './types'
import type { ResourcesSection } from './types'

interface Props {
  data: ResourcesSection
  onChange: (d: Partial<ResourcesSection>) => void
}

export function SectionResources({ data, onChange }: Props) {
  const toggle = (val: string) => {
    onChange({
      resources: data.resources.includes(val)
        ? data.resources.filter(x => x !== val)
        : [...data.resources, val]
    })
  }

  return (
    <div className="space-y-6" id="resources">
      <SectionHeader
        title="Resources Requested"
        sub="Would you like to be connected with any of these resources? Check all that apply."
      />

      <CheckGrid
        options={RESOURCES}
        selected={data.resources}
        onToggle={toggle}
        cols={2}
      />

      <FieldGroup label="Other resources needed">
        <DetailInput
          value={data.resourcesOther}
          onChange={v => onChange({ resourcesOther: v })}
          placeholder="Any other resources or support the learner is requesting…"
          rows={2}
        />
      </FieldGroup>
    </div>
  )
}
