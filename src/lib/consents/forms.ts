// Form definitions live as JSON config files under src/lib/consents/forms/.
// Each form is a sequence of "screens" — one step in the mobile-first flow.

import tbwParticipation from './forms/tbw_participation.json'

export type ScreenType =
  | 'intro'         // pure text, advance-only
  | 'attestation'   // Y/N (yes advances, no declines)
  | 'text'          // free-text input
  | 'longtext'      // textarea
  | 'date'          // date picker
  | 'choice'        // single-select radio
  | 'multi'         // multi-select checkboxes
  | 'signature'     // typed-name signature
  | 'review'        // read-only summary of answers
  | 'organizations' // 3 free-text fields for Schools/Agencies/Community Orgs

export interface ScreenOption {
  value: string
  label: string
}

export interface FormScreen {
  key:           string         // stable identifier for outcome_at_screen_key
  type:          ScreenType
  prompt:        string         // shown to user AND used as PDF question text
  helpText?:     string
  required?:     boolean
  // for attestation screens
  declineLabel?: string         // default "I do not consent"
  agreeLabel?:   string         // default "I agree / consent"
  // for choice / multi
  options?:      ScreenOption[]
  // for text / longtext
  placeholder?:  string
  // for prefill from case data
  prefillFrom?:  string         // e.g. "participant.firstName"
}

export interface FormDefinition {
  type:           string                // 'tbw_participation' etc.
  version:        string                // 'tbw_participation_2025_08'
  name:           string                // human-readable doc title for PDF
  description:    string
  screens:        FormScreen[]
}

const FORMS: Record<string, FormDefinition> = {
  tbw_participation: tbwParticipation as unknown as FormDefinition,
}

export function getFormDefinition(type: string): FormDefinition | null {
  return FORMS[type] ?? null
}

export function listFormTypes(): string[] {
  return Object.keys(FORMS)
}
