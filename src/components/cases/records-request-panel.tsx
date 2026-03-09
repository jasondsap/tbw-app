'use client'
import { useState } from 'react'
import { Search, Send, CheckCircle2, Clock, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface RecordsRequestPanelProps {
  caseId:          string
  participantName: string
  schoolName?:     string | null
  advocateName:    string
}

function buildEmailTemplate(data: {
  clerkName: string; schoolName: string; learnerName: string; advocateName: string
}) {
  const initials = data.learnerName.split(' ').map(n => n[0]).join('').toUpperCase()
  return {
    subject: `Student at ${data.schoolName} -- ${initials}`,
    body: `Good afternoon ${data.clerkName},

The Book Works is supporting and advocating for a student at ${data.schoolName}, ${data.learnerName}. We are working on educational goals with ${data.learnerName} and their family. I have attached their ROI and consent forms — we would like to request their education records and information listed on the ROI to be sent to us. Thank you!

We look forward to hearing from you,

${data.advocateName}
The Book Works Education Advocacy Program`,
  }
}

export function RecordsRequestPanel({
  caseId, participantName, schoolName, advocateName,
}: RecordsRequestPanelProps) {
  const [searchQuery,   setSearchQuery]   = useState(schoolName ?? '')
  const [clerkName,     setClerkName]     = useState('')
  const [clerkEmail,    setClerkEmail]    = useState('')
  const [emailSubject,  setEmailSubject]  = useState('')
  const [emailBody,     setEmailBody]     = useState('')
  const [attachROI,     setAttachROI]     = useState(true)
  const [attachCascade, setAttachCascade] = useState(true)
  const [attachTBW,     setAttachTBW]     = useState(true)
  const [searching,     setSearching]     = useState(false)
  const [sending,       setSending]       = useState(false)
  const [sent,          setSent]          = useState(false)
  const [showPreview,   setShowPreview]   = useState(false)

  // Mock previous request
  const [prevRequests] = useState([
    {
      id: 'rr1', schoolName: 'Waggener High School', status: 'sent',
      sentAt: '2025-03-02T10:30:00Z', recordsClerkName: 'Ms. Patricia J.',
      roiAttached: true, cascadeAttached: true, tbwConsentAttached: true,
    }
  ])

  const handleClerkLookup = async () => {
    setSearching(true)
    await new Promise(r => setTimeout(r, 600))
    // clerk lookup now hits real DB via /api/clerks
    const res = await fetch(`/api/clerks?school=${encodeURIComponent(searchQuery)}`).then(r => r.ok ? r.json() : null)
    const clerk = res
    if (clerk && clerk.clerk_name) {
      const clerkData = { name: clerk.clerk_name, email: clerk.email }
      setClerkName(clerk.name)
      setClerkEmail(clerk.email)
      const tmpl = buildEmailTemplate({
        clerkName: clerk.name, schoolName: searchQuery,
        learnerName: participantName, advocateName,
      })
      setEmailSubject(tmpl.subject)
      setEmailBody(tmpl.body)
    } else {
      setClerkName(''); setClerkEmail('')
      setEmailSubject(`Student at ${searchQuery} -- ${participantName.split(' ').map(n => n[0]).join('')}`)
      setEmailBody(buildEmailTemplate({
        clerkName: '[Records Clerk Name]', schoolName: searchQuery,
        learnerName: participantName, advocateName,
      }).body)
    }
    setSearching(false)
  }

  const handleSend = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 1200)) // TODO: real API
    setSent(true)
    setSending(false)
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    sent:     { label: 'Sent',     color: 'bg-blue-50 text-blue-700' },
    received: { label: 'Received', color: 'bg-emerald-50 text-emerald-700' },
    draft:    { label: 'Draft',    color: 'bg-slate-100 text-slate-500' },
    partial:  { label: 'Partial',  color: 'bg-amber-50 text-amber-700' },
  }

  return (
    <div className="p-6 max-w-2xl">

      {/* Previous requests */}
      {prevRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Previous Requests</h3>
          <div className="space-y-2">
            {prevRequests.map(req => {
              const cfg = statusConfig[req.status] ?? statusConfig.draft
              return (
                <div key={req.id} className="card p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{req.schoolName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      To: {req.recordsClerkName} · Sent {formatDate(req.sentAt)}
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      {req.roiAttached      && <span className="badge bg-slate-50 text-slate-500 text-[10px]">ROI</span>}
                      {req.cascadeAttached  && <span className="badge bg-slate-50 text-slate-500 text-[10px]">Cascade</span>}
                      {req.tbwConsentAttached && <span className="badge bg-slate-50 text-slate-500 text-[10px]">TBW Consent</span>}
                    </div>
                  </div>
                  <span className={cn('badge', cfg.color)}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* New request */}
      {!sent ? (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">New Records Request</h3>

          {/* School search */}
          <div className="mb-4">
            <label className="form-label">School Name</label>
            <div className="flex gap-2">
              <input
                className="form-input flex-1"
                placeholder="e.g. Waggener High School"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button
                onClick={handleClerkLookup}
                disabled={searching || !searchQuery.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700
                           disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Lookup Clerk
              </button>
            </div>
          </div>

          {/* Clerk fields */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="form-label">Records Clerk Name</label>
              <input className="form-input" placeholder="Clerk name"
                value={clerkName} onChange={e => setClerkName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Clerk Email</label>
              <input type="email" className="form-input" placeholder="clerk@school.jcps.edu"
                value={clerkEmail} onChange={e => setClerkEmail(e.target.value)} />
            </div>
          </div>

          {/* Attachments */}
          <div className="mb-4">
            <label className="form-label">Attach Consent Forms</label>
            <div className="flex gap-3">
              {[
                { label: 'ROI',       checked: attachROI,     setter: setAttachROI },
                { label: 'Cascade',   checked: attachCascade, setter: setAttachCascade },
                { label: 'TBW Consent', checked: attachTBW,  setter: setAttachTBW },
              ].map(({ label, checked, setter }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-teal-600 w-4 h-4 rounded"
                    checked={checked} onChange={e => setter(e.target.checked)} />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Email preview */}
          {emailBody && (
            <div className="mb-4">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600
                           hover:text-slate-800 transition-colors mb-2"
              >
                {showPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showPreview ? 'Hide' : 'Preview'} Email
              </button>
              {showPreview && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Subject</p>
                    <input className="form-input text-sm" value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Body</p>
                    <textarea className="form-input text-sm resize-none" rows={8}
                      value={emailBody} onChange={e => setEmailBody(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !clerkEmail.trim() || !emailBody.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5
                       bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                       text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {sending
              ? <><Loader2 size={15} className="animate-spin" /> Sending...</>
              : <><Send size={15} /> Send Records Request</>
            }
          </button>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-base font-semibold text-slate-800 mb-1">Records Request Sent</p>
          <p className="text-sm text-slate-500 mb-4">
            Email sent to <strong>{clerkName}</strong> at {searchQuery}.<br />
            A case note has been logged automatically.
          </p>
          <button onClick={() => setSent(false)}
            className="text-sm text-teal-600 hover:text-teal-800 font-medium transition-colors">
            Send another request
          </button>
        </div>
      )}
    </div>
  )
}
