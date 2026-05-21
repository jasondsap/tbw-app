'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StepReason }      from './step-reason'
import { StepInterview }   from './step-interview'
import { StepToolkit }     from './step-toolkit'
import { StepGoalsReview } from './step-goals-review'
import { StepCaseNote }    from './step-case-note'
import { StepFinalize }    from './step-finalize'
import type {
  ExitWizardState, ExitReason, GoalOutcome,
  ExitInterviewData, ToolkitData, ContactAttempt, MeetingHeld,
} from './types'
import { DEFAULT_INTERVIEW, DEFAULT_TOOLKIT, STEP_LABELS } from './types'

interface ExitWizardProps {
  caseId:          string
  caseNumber:      string
  participantName: string
  advocateName:    string
  goals: {
    id: string; text: string; category: string; status: string
  }[]
  barriers: string[]
  // Pre-fill from case
  currentSchool: string
  currentGrade:  string
}

// Determine visible steps based on reason + meeting held
function getSteps(reason: ExitReason | null, meetingHeld: MeetingHeld | null): number[] {
  if (!reason) return [1]
  if (reason === 'reached_goals' && meetingHeld === 'yes') return [1, 2, 3, 4, 5, 6]
  if (reason === 'reached_goals' && meetingHeld !== null)  return [1, 4, 5, 6]   // no meeting — skip interview+toolkit
  if (reason === 'reached_goals')                          return [1, 2, 3, 4, 5, 6] // not yet decided
  if (reason === 'referred_but_not_enrolled')              return [1, 5, 6]        // no goals/interview to review
  return [1, 4, 5, 6]   // stopped_responding / requested_exit / change_in_goals
}

function StepBar({ steps, currentStep }: { steps: number[]; currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((stepNum, i) => {
        const done    = steps.indexOf(currentStep) > i
        const current = currentStep === stepNum
        return (
          <div key={stepNum} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              done    ? 'bg-teal-600 text-white' :
              current ? 'bg-navy-800 text-white ring-2 ring-offset-2 ring-navy-300' :
              'bg-slate-100 text-slate-400'
            )}>
              {done ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn(
              'text-xs font-medium hidden sm:block',
              current ? 'text-slate-800' : done ? 'text-teal-600' : 'text-slate-400'
            )}>
              {STEP_LABELS[stepNum]}
            </span>
            {i < steps.length - 1 && (
              <div className={cn('w-8 h-0.5 mx-1', done ? 'bg-teal-400' : 'bg-slate-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ExitWizard({
  caseId, caseNumber, participantName, advocateName,
  goals, barriers, currentSchool, currentGrade,
}: ExitWizardProps) {
  const router = useRouter()

  // Build initial goal outcomes from case goals
  const initGoalOutcomes = (): GoalOutcome[] =>
    goals.map(g => ({ goalId: g.id, goalText: g.text, reached: null, endDate: '', comments: '' }))

  const initBarrierOutcomes = () =>
    barriers.map(b => ({ barrier: b, improved: null, comments: '' }))

  const [state, setState] = useState<ExitWizardState>({
    step:            1,
    reason:          null,
    narrative:       '',
    meetingHeld:     null,
    contactAttempts: [],
    interview: {
      ...DEFAULT_INTERVIEW,
      currentSchool,
      currentGrade,
      goalOutcomes:   initGoalOutcomes(),
      barrierOutcomes: initBarrierOutcomes(),
    },
    toolkit:      DEFAULT_TOOLKIT,
    caseNote:     '',
    exitDate:     new Date().toISOString().slice(0, 10),
    submitting:   false,
    submitted:    false,
  })

  // Keep interview goalOutcomes in sync when goals change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      interview: { ...prev.interview, goalOutcomes: initGoalOutcomes() }
    }))
  }, [goals.length])

  const steps = getSteps(state.reason, state.meetingHeld)
  const stepIdx = steps.indexOf(state.step)

  const goNext = () => {
    const next = steps[stepIdx + 1]
    if (next) setState(prev => ({ ...prev, step: next }))
  }

  const goBack = () => {
    const prev = steps[stepIdx - 1]
    if (prev) setState(s => ({ ...s, step: prev }))
    else router.back()
  }

  const update = (fields: Partial<ExitWizardState>) =>
    setState(prev => ({ ...prev, ...fields }))

  const updateInterview = (fields: Partial<ExitInterviewData>) =>
    setState(prev => ({ ...prev, interview: { ...prev.interview, ...fields } }))

  const updateToolkit = (fields: Partial<ToolkitData>) =>
    setState(prev => ({ ...prev, toolkit: { ...prev.toolkit, ...fields } }))

  // Sync goal outcomes between interview step and goals review step
  const updateGoalOutcomes = (outcomes: GoalOutcome[]) => {
    setState(prev => ({
      ...prev,
      interview: { ...prev.interview, goalOutcomes: outcomes }
    }))
  }

  const handleSubmit = async () => {
    setState(prev => ({ ...prev, submitting: true }))
    try {
      await fetch(`/api/cases/${caseId}/exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason:          state.reason,
          narrative:       state.narrative,
          meetingHeld:     state.meetingHeld,
          contactAttempts: state.contactAttempts,
          exitDate:        state.exitDate,
          goalOutcomes:    state.interview.goalOutcomes,
          interview:       state.interview,
          toolkit:         state.toolkit,
          caseNote:        state.caseNote,
        }),
      })
      setState(prev => ({ ...prev, submitted: true, submitting: false }))
      // Redirect to case after short delay
      setTimeout(() => router.push(`/cases/${caseId}?tab=overview&exited=true`), 1500)
    } catch (err) {
      console.error(err)
      setState(prev => ({ ...prev, submitting: false }))
    }
  }

  if (state.submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <Check size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 font-display">Exit Finalized</h2>
        <p className="text-sm text-slate-500 mt-2">
          {participantName} has been exited. Stable service started and case reassigned to Jess.
        </p>
        <p className="text-xs text-slate-400 mt-1">Redirecting to case…</p>
      </div>
    )
  }

  return (
    <div>
      <StepBar steps={steps} currentStep={state.step} />

      {state.step === 1 && (
        <StepReason
          reason={state.reason}
          narrative={state.narrative}
          meetingHeld={state.meetingHeld}
          contactAttempts={state.contactAttempts}
          onUpdate={fields => update(fields as Partial<ExitWizardState>)}
          onNext={goNext}
        />
      )}

      {state.step === 2 && (
        <StepInterview
          data={state.interview}
          goals={goals}
          onUpdate={updateInterview}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {state.step === 3 && (
        <StepToolkit
          data={state.toolkit}
          onUpdate={updateToolkit}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {state.step === 4 && (
        <StepGoalsReview
          goals={goals}
          outcomes={state.interview.goalOutcomes}
          exitDate={state.exitDate}
          onUpdate={updateGoalOutcomes}
          onDateChange={date => update({ exitDate: date })}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {state.step === 5 && (
        <StepCaseNote
          caseNote={state.caseNote}
          reason={state.reason}
          narrative={state.narrative}
          participantName={participantName}
          goalOutcomes={state.interview.goalOutcomes}
          interview={state.interview}
          onUpdate={note => update({ caseNote: note })}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {state.step === 6 && (
        <StepFinalize
          exitDate={state.exitDate}
          reason={state.reason}
          narrative={state.narrative}
          participantName={participantName}
          advocateName={advocateName}
          submitting={state.submitting}
          onBack={goBack}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
