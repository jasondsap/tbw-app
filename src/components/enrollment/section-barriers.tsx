'use client'
import { cn } from '@/lib/utils'
import { SectionHeader, FieldGroup, YesNoField, DetailInput } from './ui'
import type { BarriersSection } from './types'

interface Props {
  data: BarriersSection
  onChange: (d: Partial<BarriersSection>) => void
}

// Reusable barrier row - checkbox + label + expand on check
function BarrierRow({
  label, active, onToggle, children,
}: {
  label: string
  active: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div className={cn(
      'rounded-xl border-2 transition-all',
      active ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100 bg-white hover:border-slate-200'
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={cn(
          'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
          active ? 'bg-amber-500 border-amber-500' : 'border-slate-300 group-hover:border-amber-300'
        )}>
          {active && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className={cn('text-sm font-semibold', active ? 'text-amber-800' : 'text-slate-700')}>
          {label}
        </span>
      </button>
      {active && children && (
        <div className="px-4 pb-4 space-y-3 border-t border-amber-100 pt-3">
          {children}
        </div>
      )}
    </div>
  )
}

export function SectionBarriers({ data, onChange }: Props) {
  const upd = <K extends keyof Omit<BarriersSection, 'primaryBarrier'>>(
    key: K, fields: Partial<BarriersSection[K]>
  ) => {
    onChange({ [key]: { ...data[key], ...fields } } as Partial<BarriersSection>)
  }

  const toggle = (key: keyof Omit<BarriersSection, 'primaryBarrier'>) => {
    const cur = data[key] as { active: boolean }
    onChange({ [key]: { ...data[key], active: !cur.active } } as Partial<BarriersSection>)
  }

  const activeCount = Object.entries(data)
    .filter(([k, v]) => k !== 'primaryBarrier' && (v as any).active)
    .length

  return (
    <div className="space-y-4" id="barriers">
      <SectionHeader
        title="Barriers"
        sub="Select each barrier the learner is experiencing and add details. These will inform goal generation."
      />

      {activeCount > 0 && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs text-amber-700 font-medium">
            {activeCount} barrier{activeCount !== 1 ? 's' : ''} identified
          </p>
        </div>
      )}

      <BarrierRow
        label="Chronic Absences"
        active={data.chronicAbsences.active}
        onToggle={() => toggle('chronicAbsences')}
      >
        <DetailInput
          label="How long since consistently attending?"
          value={data.chronicAbsences.howLong}
          onChange={v => upd('chronicAbsences', { howLong: v })}
          placeholder="e.g. Since start of this school year"
        />
        <DetailInput
          label="Why did they stop attending?"
          value={data.chronicAbsences.why}
          onChange={v => upd('chronicAbsences', { why: v })}
          placeholder="Reason for absences…"
          rows={2}
        />
      </BarrierRow>

      <BarrierRow
        label="Withdrawal or Gap in Enrollment"
        active={data.withdrawalGap.active}
        onToggle={() => toggle('withdrawalGap')}
      >
        <DetailInput
          label="How long since withdrawal or gap began?"
          value={data.withdrawalGap.howLong}
          onChange={v => upd('withdrawalGap', { howLong: v })}
          placeholder="e.g. 6 months / since January"
        />
      </BarrierRow>

      <BarrierRow
        label="Online Learner"
        active={data.onlineLearner.active}
        onToggle={() => toggle('onlineLearner')}
      >
        <DetailInput
          label="How long have they been an online learner?"
          value={data.onlineLearner.howLong}
          onChange={v => upd('onlineLearner', { howLong: v })}
          placeholder="e.g. 2 years"
        />
        <DetailInput
          label="Why did they start learning online?"
          value={data.onlineLearner.why}
          onChange={v => upd('onlineLearner', { why: v })}
          placeholder="Reason for online enrollment…"
          rows={2}
        />
      </BarrierRow>

      <BarrierRow
        label="School Safety Issues or Bullying"
        active={data.schoolSafety.active}
        onToggle={() => toggle('schoolSafety')}
      >
        <DetailInput
          label="How long has this been occurring?"
          value={data.schoolSafety.howLong}
          onChange={v => upd('schoolSafety', { howLong: v })}
          placeholder="e.g. Past 3 months"
        />
        <DetailInput
          label="Has it been addressed? How?"
          value={data.schoolSafety.addressed}
          onChange={v => upd('schoolSafety', { addressed: v })}
          placeholder="e.g. Reported to school counselor, no action taken…"
          rows={2}
        />
      </BarrierRow>

      <BarrierRow
        label="Foster Care"
        active={data.fosterCare.active}
        onToggle={() => toggle('fosterCare')}
      >
        <DetailInput
          label="Length of involvement"
          value={data.fosterCare.length}
          onChange={v => upd('fosterCare', { length: v })}
          placeholder="e.g. In care for 2 years"
        />
      </BarrierRow>

      <BarrierRow
        label="Justice-Involved"
        active={data.justiceInvolved.active}
        onToggle={() => toggle('justiceInvolved')}
      >
        <DetailInput
          label="Status of court involvement"
          value={data.justiceInvolved.status}
          onChange={v => upd('justiceInvolved', { status: v })}
          placeholder="e.g. Probation, case pending, charges dropped…"
          rows={2}
        />
      </BarrierRow>

      <BarrierRow
        label="ECE / Special Education"
        active={data.ece.active}
        onToggle={() => toggle('ece')}
      >
        <DetailInput
          label="Does the learner have an IEP or 504 Plan? What services are provided?"
          value={data.ece.hasIep}
          onChange={v => upd('ece', { hasIep: v })}
          placeholder="e.g. IEP for learning disability — speech therapy + resource room…"
          rows={2}
        />
        <DetailInput
          label="Does the learner need to be evaluated or re-evaluated for services?"
          value={data.ece.needsEval}
          onChange={v => upd('ece', { needsEval: v })}
          placeholder="Yes / No — describe…"
        />
      </BarrierRow>

      <BarrierRow
        label="Multilingual Learner"
        active={data.multilingual.active}
        onToggle={() => toggle('multilingual')}
      >
        <DetailInput
          label="Does the learner need additional language support?"
          value={data.multilingual.support}
          onChange={v => upd('multilingual', { support: v })}
          placeholder="Language spoken at home, what supports are needed…"
          rows={2}
        />
      </BarrierRow>

      <BarrierRow
        label="Mental Health Needs"
        active={data.mentalHealth.active}
        onToggle={() => toggle('mentalHealth')}
      >
        <DetailInput
          label="Does the learner need to be referred for mental health services?"
          value={data.mentalHealth.referral}
          onChange={v => upd('mentalHealth', { referral: v })}
          placeholder="Current services, unmet needs, referral urgency…"
          rows={2}
        />
      </BarrierRow>

      <BarrierRow
        label="Economic Needs"
        active={data.economicNeeds.active}
        onToggle={() => toggle('economicNeeds')}
      >
        <DetailInput
          label="Does the learner need assistance finding a job, applying for food stamps, etc.?"
          value={data.economicNeeds.assistance}
          onChange={v => upd('economicNeeds', { assistance: v })}
          placeholder="Describe the economic needs…"
          rows={2}
        />
      </BarrierRow>

      <BarrierRow
        label="Transportation Issues"
        active={data.transportation.active}
        onToggle={() => toggle('transportation')}
      >
        <DetailInput
          label="How long has this been occurring?"
          value={data.transportation.howLong}
          onChange={v => upd('transportation', { howLong: v })}
          placeholder="e.g. No bus route, car issues since September"
        />
        <DetailInput
          label="Is there any support we can provide?"
          value={data.transportation.support}
          onChange={v => upd('transportation', { support: v })}
          placeholder="e.g. Bus pass, ride-share coordination…"
        />
      </BarrierRow>

      <BarrierRow
        label="Houselessness"
        active={data.houselessness.active}
        onToggle={() => toggle('houselessness')}
      >
        <DetailInput
          label="Does the learner need to be connected with housing assistance?"
          value={data.houselessness.assistance}
          onChange={v => upd('houselessness', { assistance: v })}
          placeholder="Current situation, urgency, services already connected to…"
          rows={2}
        />
      </BarrierRow>

      {/* Primary barrier */}
      {activeCount > 1 && (
        <div className="pt-2">
          <FieldGroup
            label="Primary Barrier"
            hint="Out of the barriers above, which is the primary barrier this learner is facing in reconnecting with school?"
          >
            <input
              className="form-input"
              value={data.primaryBarrier}
              onChange={e => onChange({ primaryBarrier: e.target.value })}
              placeholder="Name the single most significant barrier…"
            />
          </FieldGroup>
        </div>
      )}
    </div>
  )
}
