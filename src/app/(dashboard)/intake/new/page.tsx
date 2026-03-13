'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Phone, MapPin, GraduationCap, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Reusable form field components ──────────────────────────

function Field({ label, required, children, hint, className }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string; className?: string
}) {
  return (
    <div className={className}>
      <label className="form-label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('form-input', className)} {...props} />
}

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('form-input', className)} {...props}>
      {children}
    </select>
  )
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('form-input resize-none', className)} {...props} />
}

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-teal-600" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────

export default function NewReferralPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const [form, setForm] = useState({
    // Participant
    firstName: '', lastName: '', preferredName: '', pronouns: '',
    dateOfBirth: '', phonePrimary: '', phoneSecondary: '', email: '',
    // Address
    addressStreet: '', addressCity: 'Louisville', addressZip: '', neighborhood: '',
    // Education
    currentSchool: '', currentGrade: '', highestEdCompleted: '', isEmployed: '',
    healthConcerns: '',
    // Referral
    referralSource: '', howHeard: '', referralNotes: '',
    intakeSpecialistId: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/intake/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to create referral')
      const data = await res.json()
      router.push(`/intake/${data.caseId}`)
    } catch (err) {
      console.error(err)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-enter min-h-screen bg-slate-50">

      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/intake"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={16} />
              Intake Pipeline
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-800">New Referral</span>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  step === s ? 'bg-teal-600 text-white' :
                  step > s  ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'
                )}>
                  {s}
                </div>
                <span className={cn('text-xs font-medium hidden sm:block', step === s ? 'text-slate-700' : 'text-slate-400')}>
                  {s === 1 ? 'Participant Info' : 'Referral Details'}
                </span>
                {s < 2 && <div className="w-8 h-px bg-slate-200 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-8">

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Participant card */}
            <div className="card p-6">
              <SectionHeader icon={User} title="Participant Information"
                subtitle="Basic identifying information for the learner" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required>
                  <Input name="firstName" value={form.firstName} onChange={handleChange}
                    placeholder="First name" required />
                </Field>
                <Field label="Last Name" required>
                  <Input name="lastName" value={form.lastName} onChange={handleChange}
                    placeholder="Last name" required />
                </Field>
                <Field label="Preferred Name" hint="If different from first name">
                  <Input name="preferredName" value={form.preferredName} onChange={handleChange}
                    placeholder="Goes by..." />
                </Field>
                <Field label="Pronouns">
                  <Select name="pronouns" value={form.pronouns} onChange={handleChange}>
                    <option value="">Select...</option>
                    <option value="he/him">he/him</option>
                    <option value="she/her">she/her</option>
                    <option value="they/them">they/them</option>
                    <option value="she/they">she/they</option>
                    <option value="he/they">he/they</option>
                    <option value="prefer not to say">Prefer not to say</option>
                  </Select>
                </Field>
                <Field label="Date of Birth">
                  <Input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
                </Field>
              </div>
            </div>

            {/* Contact card */}
            <div className="card p-6">
              <SectionHeader icon={Phone} title="Contact Information" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary Phone" required>
                  <Input type="tel" name="phonePrimary" value={form.phonePrimary}
                    onChange={handleChange} placeholder="(502) 555-0000" required />
                </Field>
                <Field label="Secondary Phone">
                  <Input type="tel" name="phoneSecondary" value={form.phoneSecondary}
                    onChange={handleChange} placeholder="(502) 555-0000" />
                </Field>
                <Field label="Email" className="col-span-2">
                  <Input type="email" name="email" value={form.email}
                    onChange={handleChange} placeholder="email@example.com" />
                </Field>
              </div>
            </div>

            {/* Address card */}
            <div className="card p-6">
              <SectionHeader icon={MapPin} title="Address"
                subtitle="Used for neighborhood-level reporting" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Street Address" className="col-span-2">
                  <Input name="addressStreet" value={form.addressStreet}
                    onChange={handleChange} placeholder="123 Main St" />
                </Field>
                <Field label="City">
                  <Input name="addressCity" value={form.addressCity}
                    onChange={handleChange} placeholder="Louisville" />
                </Field>
                <Field label="ZIP Code">
                  <Input name="addressZip" value={form.addressZip}
                    onChange={handleChange} placeholder="40202" maxLength={5} />
                </Field>
                <Field label="Neighborhood" hint="West End, South Louisville, etc." className="col-span-2">
                  <Input name="neighborhood" value={form.neighborhood}
                    onChange={handleChange} placeholder="Neighborhood name" />
                </Field>
              </div>
            </div>

            {/* Education card */}
            <div className="card p-6">
              <SectionHeader icon={GraduationCap} title="Education & Employment" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Current / Last School Attended" className="col-span-2">
                  <Input name="currentSchool" value={form.currentSchool}
                    onChange={handleChange} placeholder="School name" />
                </Field>
                <Field label="Current Grade">
                  <Select name="currentGrade" value={form.currentGrade} onChange={handleChange}>
                    <option value="">Select grade...</option>
                    {['6','7','8','9','10','11','12','GED','Post-secondary','Not enrolled'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Highest Level Completed">
                  <Select name="highestEdCompleted" value={form.highestEdCompleted} onChange={handleChange}>
                    <option value="">Select...</option>
                    <option value="elementary">Elementary School</option>
                    {['6','7','8','9','10','11','12'].map(g => (
                      <option key={g} value={`${g}th grade`}>{g}th Grade</option>
                    ))}
                    <option value="ged">GED</option>
                    <option value="diploma">High School Diploma</option>
                    <option value="no_formal">No Formal Education</option>
                  </Select>
                </Field>
                <Field label="Currently Employed?">
                  <Select name="isEmployed" value={form.isEmployed} onChange={handleChange}>
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Health / Medical Concerns"
                  hint="Any physical or behavioral health concerns that impact school">
                  <Textarea name="healthConcerns" value={form.healthConcerns}
                    onChange={handleChange} rows={3}
                    placeholder="Describe any relevant health concerns..." />
                </Field>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold
                           rounded-lg transition-colors shadow-sm">
                Continue to Referral Details →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">

            <div className="card p-6">
              <SectionHeader icon={Send} title="Referral Details"
                subtitle="How they came to us and who will manage intake" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Referral Source" required>
                  <Select name="referralSource" value={form.referralSource}
                    onChange={handleChange} required>
                    <option value="">Select source...</option>
                    <option value="jcps">JCPS School</option>
                    <option value="social_worker">Social Worker</option>
                    <option value="court">Court / Probation</option>
                    <option value="family">Family Member</option>
                    <option value="self">Self-referred</option>
                    <option value="community_org">Community Organization</option>
                    <option value="foster_care">Foster Care / DCS</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>

                <Field label="How Did They Hear About TBW?">
                  <Select name="howHeard" value={form.howHeard} onChange={handleChange}>
                    <option value="">Select...</option>
                    <option value="family_member">Family member</option>
                    <option value="friend">Friend</option>
                    <option value="teacher_counselor">Teacher or school counselor</option>
                    <option value="social_media">Social Media</option>
                    <option value="newspaper">Newspaper</option>
                    <option value="community_org">Community organization</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>

                <Field label="Assigned Intake Specialist" required className="col-span-2">
                  <Select name="intakeSpecialistId" value={form.intakeSpecialistId}
                    onChange={handleChange} required>
                    <option value="">Select intake specialist...</option>
                    {/* TODO: Load from DB */}
                    <option value="mock-gail-id">Gail T. (Intake Specialist)</option>
                  </Select>
                </Field>

                <Field label="Referral Notes" className="col-span-2"
                  hint="Brief notes from the initial referral conversation">
                  <Textarea name="referralNotes" value={form.referralNotes}
                    onChange={handleChange} rows={4}
                    placeholder="Briefly describe the situation and any immediate concerns noted during referral..." />
                </Field>
              </div>

              {/* Consent reminder banner */}
              <div className="mt-5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-medium text-amber-800">
                  📋 After creating this referral, you'll be prompted to send consent forms to the participant/caregiver.
                  The following will be auto-generated: TBW Participation Consent, JCPS ROI, Cascade JCPS, Medical Waiver, and Emergency Contact form.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-800
                           text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">
                <ArrowLeft size={15} />
                Back
              </button>

              <button type="submit" disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700
                           disabled:opacity-60 disabled:cursor-not-allowed
                           text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                {isSubmitting ? (
                  <><Loader2 size={15} className="animate-spin" /> Creating Referral...</>
                ) : (
                  <><Send size={15} /> Create Referral</>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
