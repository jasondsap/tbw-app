import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { reason, narrative, participantName, goalOutcomes, interview } = await req.json()

    const goalsReached   = goalOutcomes?.filter((g: any) => g.reached === true)  ?? []
    const goalsNotReached = goalOutcomes?.filter((g: any) => g.reached === false) ?? []

    const nextStepsChosen = interview?.nextSteps
      ? Object.entries(interview.nextSteps)
          .filter(([, v]) => v)
          .map(([k]) => ({
            twoYearCollege:  '2-year college',
            fourYearCollege: '4-year college',
            tradeSchool:     'trade or technical school',
            employment:      'employment',
            military:        'military',
            stillPlanning:   'still making plans',
          }[k]))
          .filter(Boolean)
          .join(', ')
      : ''

    const prompt = `You are a trauma-informed education advocate writing a strengths-based exit case note for a case management platform.

Participant: ${participantName}
Exit reason: ${reason === 'reached_goals' ? 'Reached goals' : reason === 'stopped_responding' ? 'Stopped responding after 6+ contact attempts over 2 months' : reason === 'requested_exit' ? 'Requested exit' : reason === 'change_in_goals' ? 'Change in goals' : reason === 'referred_but_not_enrolled' ? 'Referred but not formally enrolled' : 'Other'}${narrative ? `\nService exit narrative (canonical phrase for funder reports): ${narrative}` : ''}

Goals reached (${goalsReached.length}):
${goalsReached.map((g: any) => `- ${g.goalText}${g.comments ? ` (${g.comments})` : ''}`).join('\n') || '(none)'}

Goals not reached (${goalsNotReached.length}):
${goalsNotReached.map((g: any) => `- ${g.goalText}${g.comments ? ` (${g.comments})` : ''}`).join('\n') || '(none)'}

Learner's next steps: ${nextStepsChosen || 'not specified'}
Positive changes noted: ${interview?.positiveChanges || 'not recorded'}
Currently employed: ${interview?.employed === true ? 'Yes' : interview?.employed === false ? 'No' : 'Unknown'}
Graduation status: ${interview?.graduated === true ? 'Graduated' : interview?.graduated === false ? 'Not yet graduated' : 'Unknown'}

Write a professional, warm, strengths-based exit case note. Structure it in prose paragraphs (no bullet lists) covering:
1. Summary of the exit (reason and exit date context)
2. Goals accomplished and progress made — be specific and celebratory
3. Learner's identified strengths and growth observed
4. Any remaining barriers and how they improved (or didn't)
5. Next steps / future plans
6. Closing reminder that the learner can reach back out to The Book Works at any time

Tone: professional but warm, trauma-informed, strengths-based, avoid deficit language. Write in third person.
Length: 250–400 words.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const note = data.content?.[0]?.text ?? ''

    return NextResponse.json({ note })
  } catch (err) {
    console.error('AI exit note error:', err)
    return NextResponse.json({ error: 'Failed to draft note' }, { status: 500 })
  }
}
