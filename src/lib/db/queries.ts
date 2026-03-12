import { sql } from './index'

// ─── PARTICIPANTS ─────────────────────────────────────────────

export async function getParticipantById(id: string) {
  const rows = await sql`
    SELECT * FROM participants WHERE id = ${id} AND is_active = true
  `
  return rows[0] ?? null
}

export async function searchParticipants(query: string) {
  return sql`
    SELECT id, first_name, last_name, preferred_name, date_of_birth, role, phone_primary
    FROM participants
    WHERE is_active = true
      AND (
        lower(first_name) LIKE ${'%' + query.toLowerCase() + '%'}
        OR lower(last_name)  LIKE ${'%' + query.toLowerCase() + '%'}
      )
    ORDER BY last_name, first_name
    LIMIT 25
  `
}

export async function createParticipant(data: {
  firstName: string
  lastName: string
  preferredName?: string | null
  pronouns?: string | null
  dateOfBirth?: string | null
  phonePrimary?: string | null
  phoneSecondary?: string | null
  email?: string | null
  addressStreet?: string | null
  addressCity?: string | null
  addressZip?: string | null
  neighborhood?: string | null
  referralSource?: string | null
  referralDate?: string | null
  howHeard?: string | null
  currentSchool?: string | null
  currentGrade?: string | null
  highestEdCompleted?: string | null
  createdBy: string
}) {
  const rows = await sql`
    INSERT INTO participants (
      first_name, last_name, preferred_name, pronouns, date_of_birth,
      phone_primary, phone_secondary, email,
      address_street, address_city, address_zip, neighborhood,
      referral_source, referral_date, how_heard,
      current_school, current_grade, highest_ed_completed,
      created_by
    ) VALUES (
      ${data.firstName}, ${data.lastName}, ${data.preferredName ?? null},
      ${data.pronouns ?? null}, ${data.dateOfBirth ?? null},
      ${data.phonePrimary ?? null}, ${data.phoneSecondary ?? null},
      ${data.email ?? null}, ${data.addressStreet ?? null},
      ${data.addressCity ?? null}, ${data.addressZip ?? null},
      ${data.neighborhood ?? null}, ${data.referralSource ?? null},
      ${data.referralDate ?? null}, ${data.howHeard ?? null},
      ${data.currentSchool ?? null}, ${data.currentGrade ?? null},
      ${data.highestEdCompleted ?? null}, ${data.createdBy}
    )
    RETURNING *
  `
  return rows[0]
}

// ─── CASES ───────────────────────────────────────────────────

export async function getCaseById(id: string) {
  const rows = await sql`
    SELECT
      c.*,
      p.first_name, p.last_name, p.preferred_name, p.date_of_birth,
      p.phone_primary, p.email, p.current_school, p.current_grade,
      p.race_ethnicity, p.address_zip, p.neighborhood,
      u_adv.first_name   AS advocate_first,
      u_adv.last_name    AS advocate_last,
      u_adv.email        AS advocate_email,
      u_adv.phone        AS advocate_phone,
      u_coord.first_name AS coordinator_first,
      u_coord.last_name  AS coordinator_last,
      u_int.first_name   AS intake_first,
      u_int.last_name    AS intake_last,
      inv.score          AS involvement_score,
      inv.urgency, inv.involvement AS involvement_level, inv.factors
    FROM cases c
    JOIN participants p        ON p.id = c.participant_id
    LEFT JOIN users u_adv      ON u_adv.id = c.advocate_id
    LEFT JOIN users u_coord    ON u_coord.id = c.coordinator_id
    LEFT JOIN users u_int      ON u_int.id = c.intake_specialist_id
    LEFT JOIN involvement_scores inv ON inv.case_id = c.id
    WHERE c.id = ${id}
  `
  return rows[0] ?? null
}

export async function getCasesByAdvocate(advocateId: string) {
  return sql`
    SELECT * FROM v_active_caseload
    WHERE advocate_id = ${advocateId}
    ORDER BY days_since_last_note DESC NULLS LAST
  `
}

export async function getAllActiveCases() {
  return sql`
    SELECT * FROM v_active_caseload
    ORDER BY involvement_score DESC NULLS LAST, days_since_last_note DESC NULLS LAST
  `
}

export async function getIntakePipeline() {
  return sql`
    SELECT * FROM v_intake_pipeline
    ORDER BY days_in_status DESC NULLS LAST
  `
}

export async function createCase(data: {
  participantId: string
  intakeSpecialistId: string
  referralDate: string
  referralSource?: string | null
  createdBy: string
}) {
  const rows = await sql`
    INSERT INTO cases (
      participant_id, intake_specialist_id,
      referral_date, status, created_by
    ) VALUES (
      ${data.participantId}, ${data.intakeSpecialistId},
      ${data.referralDate}, 'referred', ${data.createdBy}
    )
    RETURNING *
  `
  // Auto-create the required consent records for this case
  const newCase = rows[0]
  if (newCase) {
    await sql`
      INSERT INTO consents (participant_id, case_id, form_type, status, requires_notarization)
      VALUES
        (${data.participantId}, ${newCase.id}, 'tbw_participation',   'pending', false),
        (${data.participantId}, ${newCase.id}, 'jcps_roi',            'pending', true),
        (${data.participantId}, ${newCase.id}, 'cascade_jcps',        'pending', false),
        (${data.participantId}, ${newCase.id}, 'medical_waiver',      'pending', false),
        (${data.participantId}, ${newCase.id}, 'emergency_contact',   'pending', false)
    `
  }
  return newCase
}

export async function updateCaseStatus(
  caseId: string,
  status: string,
  updatedBy: string,
  extraFields?: Record<string, unknown>
) {
  await writeAuditLog({
    userId: updatedBy,
    action: 'update',
    resourceType: 'case',
    resourceId: caseId,
    newValues: { status, ...extraFields },
  })

  const rows = await sql`
    UPDATE cases
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${caseId}
    RETURNING *
  `
  return rows[0]
}

export async function assignCaseToAdvocate(
  caseId: string,
  advocateId: string,
  coordinatorId: string,
  updatedBy: string
) {
  await writeAuditLog({
    userId: updatedBy,
    action: 'assign',
    resourceType: 'case',
    resourceId: caseId,
    newValues: { advocateId, status: 'assigned' },
  })
  const rows = await sql`
    UPDATE cases SET
      advocate_id    = ${advocateId},
      coordinator_id = ${coordinatorId},
      status         = 'assigned',
      assigned_date  = CURRENT_DATE,
      updated_at     = NOW()
    WHERE id = ${caseId}
    RETURNING *
  `
  return rows[0]
}

// ─── INVOLVEMENT SCORES ──────────────────────────────────────

export async function upsertInvolvementScore(data: {
  caseId: string
  scoredBy: string
  urgency: 'high' | 'low'
  involvement: 'high' | 'low'
  score: number
  scoreNotes?: string
  factors: string[]
}) {
  const rows = await sql`
    INSERT INTO involvement_scores (case_id, scored_by, urgency, involvement, score, score_notes, factors)
    VALUES (
      ${data.caseId}, ${data.scoredBy}, ${data.urgency}, ${data.involvement},
      ${data.score}, ${data.scoreNotes ?? null}, ${JSON.stringify(data.factors)}
    )
    ON CONFLICT (case_id) DO UPDATE SET
      scored_by    = EXCLUDED.scored_by,
      urgency      = EXCLUDED.urgency,
      involvement  = EXCLUDED.involvement,
      score        = EXCLUDED.score,
      score_notes  = EXCLUDED.score_notes,
      factors      = EXCLUDED.factors,
      scored_at    = NOW()
    RETURNING *
  `
  // Advance case status to 'scored'
  await sql`
    UPDATE cases SET status = 'scored', updated_at = NOW()
    WHERE id = ${data.caseId} AND status IN ('referred','intake_scheduled','consent_pending')
  `
  return rows[0]
}

export async function getInvolvementScoreFactors() {
  return sql`
    SELECT * FROM involvement_score_factors ORDER BY score DESC, category, label
  `
}

// ─── GOALS ───────────────────────────────────────────────────

export async function getGoalsByCase(caseId: string) {
  return sql`
    SELECT * FROM goals
    WHERE case_id = ${caseId}
    ORDER BY display_order, created_at
  `
}

export async function createGoal(data: {
  caseId: string
  title: string
  description?: string | null
  category?: string | null
  targetDate?: string | null
  aiGenerated?: boolean
  aiPromptContext?: string | null
  createdBy: string
}) {
  const rows = await sql`
    INSERT INTO goals (
      case_id, title, description, category,
      target_date, ai_generated, ai_prompt_context, created_by
    ) VALUES (
      ${data.caseId}, ${data.title}, ${data.description ?? null},
      ${data.category ?? null}, ${data.targetDate ?? null},
      ${data.aiGenerated ?? false}, ${data.aiPromptContext ?? null},
      ${data.createdBy}
    )
    RETURNING *
  `
  return rows[0]
}

export async function updateGoalProgress(
  goalId: string,
  progressPct: number,
  status: string,
  outcomeNotes?: string
) {
  const rows = await sql`
    UPDATE goals SET
      progress_pct  = ${progressPct},
      status        = ${status},
      outcome_notes = ${outcomeNotes ?? null},
      completed_date = CASE WHEN ${status} = 'completed' THEN CURRENT_DATE ELSE completed_date END,
      updated_at    = NOW()
    WHERE id = ${goalId}
    RETURNING *
  `
  return rows[0]
}

// ─── CASE NOTES ──────────────────────────────────────────────

export async function getNotesByCase(caseId: string, limit = 50) {
  return sql`
    SELECT
      cn.*,
      u.first_name AS author_first,
      u.last_name  AS author_last
    FROM case_notes cn
    LEFT JOIN users u ON u.id = cn.author_id
    WHERE cn.case_id = ${caseId}
    ORDER BY cn.interaction_date DESC, cn.created_at DESC
    LIMIT ${limit}
  `
}

export async function createCaseNote(data: {
  caseId: string
  noteType: string
  interactionDate: string
  contactMethod?: string | null
  strengths?: string | null
  goalsDiscussed?: string | null
  barriers?: string | null
  nextSteps?: string | null
  fullNote: string
  aiDrafted?: boolean
  aiRawInput?: string | null
  goalIds?: string[] | null
  authorId: string
}) {
  const rows = await sql`
    INSERT INTO case_notes (
      case_id, note_type, interaction_date, contact_method,
      strengths, goals_discussed, barriers, next_steps,
      full_note, ai_drafted, ai_raw_input, goal_ids, author_id
    ) VALUES (
      ${data.caseId}, ${data.noteType}, ${data.interactionDate},
      ${data.contactMethod ?? null}, ${data.strengths ?? null},
      ${data.goalsDiscussed ?? null}, ${data.barriers ?? null},
      ${data.nextSteps ?? null}, ${data.fullNote},
      ${data.aiDrafted ?? false}, ${data.aiRawInput ?? null},
      ${data.goalIds ?? null}, ${data.authorId}
    )
    RETURNING *
  `
  return rows[0]
}

// ─── CONSENTS ────────────────────────────────────────────────

export async function getConsentsByCase(caseId: string) {
  return sql`
    SELECT * FROM consents
    WHERE case_id = ${caseId}
    ORDER BY form_type
  `
}

export async function updateConsentStatus(
  consentId: string,
  status: string,
  signedByName?: string,
  ipAddress?: string
) {
  const rows = await sql`
    UPDATE consents SET
      status         = ${status},
      signed_at      = CASE WHEN ${status} = 'signed' THEN NOW() ELSE signed_at END,
      signed_by_name = ${signedByName ?? null},
      ip_address     = ${ipAddress ?? null},
      updated_at     = NOW()
    WHERE id = ${consentId}
    RETURNING *
  `
  return rows[0]
}

// ─── RECORDS REQUESTS ────────────────────────────────────────

export async function getRecordsClerkBySchool(schoolName: string) {
  return sql`
    SELECT * FROM jcps_records_clerks
    WHERE lower(school_name) LIKE ${'%' + schoolName.toLowerCase() + '%'}
    LIMIT 5
  `
}

// ─── USERS / STAFF ───────────────────────────────────────────

export async function getUserByCognitoSub(cognitoSub: string) {
  const rows = await sql`
    SELECT * FROM users WHERE cognito_sub = ${cognitoSub} AND is_active = true
  `
  return rows[0] ?? null
}

export async function getUsersByRole(role: string) {
  return sql`
    SELECT id, first_name, last_name, email, role, phone
    FROM users
    WHERE role = ${role} AND is_active = true
    ORDER BY last_name, first_name
  `
}

export async function getAdvocates() {
  return sql`
    SELECT
      u.id, u.first_name, u.last_name, u.email,
      COUNT(c.id) FILTER (WHERE c.status IN ('active','stable')) AS active_cases
    FROM users u
    LEFT JOIN cases c ON c.advocate_id = u.id
    WHERE u.role = 'advocate' AND u.is_active = true
    GROUP BY u.id
    ORDER BY u.last_name
  `
}

export async function getAllStaff() {
  return sql`
    SELECT id, first_name, last_name, email, role
    FROM users
    WHERE is_active = true
    ORDER BY last_name, first_name
  `
}

// ─── NOTIFICATIONS ───────────────────────────────────────────

export async function getNotificationsForUser(userId: string) {
  return sql`
    SELECT
      n.*,
      c.case_number,
      p.first_name AS participant_first,
      p.last_name  AS participant_last
    FROM notifications n
    LEFT JOIN cases c       ON c.id = n.case_id
    LEFT JOIN participants p ON p.id = c.participant_id
    WHERE n.user_id = ${userId}
      AND n.is_dismissed = false
    ORDER BY n.priority DESC, n.created_at DESC
    LIMIT 50
  `
}

export async function markNotificationRead(notificationId: string) {
  await sql`UPDATE notifications SET is_read = true WHERE id = ${notificationId}`
}

export async function createNotification(data: {
  userId: string
  caseId?: string
  type: string
  title: string
  body?: string
  priority?: number
  dueDate?: string
}) {
  await sql`
    INSERT INTO notifications (user_id, case_id, type, title, body, priority, due_date)
    VALUES (
      ${data.userId}, ${data.caseId ?? null}, ${data.type},
      ${data.title}, ${data.body ?? null},
      ${data.priority ?? 0}, ${data.dueDate ?? null}
    )
  `
}

// ─── REPORTS ─────────────────────────────────────────────────

export async function getAnnualReport(year: number) {
  return sql`
    SELECT * FROM v_annual_report WHERE report_year = ${year}
    ORDER BY service_type
  `
}

export async function getMissingDataReport() {
  return sql`SELECT * FROM v_missing_data ORDER BY case_number`
}

// ─── AUDIT LOG ───────────────────────────────────────────────

export async function writeAuditLog(data: {
  userId: string
  action: string
  resourceType: string
  resourceId?: string
  oldValues?: object
  newValues?: object
  ipAddress?: string
}) {
  await sql`
    INSERT INTO audit_log (
      user_id, action, resource_type, resource_id,
      old_values, new_values, ip_address
    ) VALUES (
      ${data.userId}, ${data.action}, ${data.resourceType},
      ${data.resourceId ?? null},
      ${data.oldValues ? JSON.stringify(data.oldValues) : null},
      ${data.newValues ? JSON.stringify(data.newValues) : null},
      ${data.ipAddress ?? null}
    )
  `
}

// ─── EXIT WORKFLOW ────────────────────────────────────────────

export async function getCaseForExit(caseId: string): Promise<{
  id: string; case_number: string; status: string
  current_school: string | null; current_grade: string | null
  first_name: string; last_name: string; preferred_name: string | null
  advocate_name: string | null
  goals: Record<string, any>[]; barriers: string[]
} | null> {
  const rows = await sql`
    SELECT
      c.id, c.case_number, c.status, p.current_school, p.current_grade,
      p.first_name, p.last_name, p.preferred_name,
      u_adv.first_name || ' ' || u_adv.last_name AS advocate_name
    FROM cases c
    JOIN participants p   ON p.id = c.participant_id
    LEFT JOIN users u_adv ON u_adv.id = c.advocate_id
    WHERE c.id = ${caseId}
  `
  const c = rows[0]
  if (!c) return null

  const goals = await sql`
    SELECT id, title, category, status
    FROM goals
    WHERE case_id = ${caseId}
      AND status IN ('in_progress','not_started','completed')
    ORDER BY display_order, created_at
  `

  const enrollmentRow = await sql`
    SELECT barriers_data FROM enrollment_forms WHERE case_id = ${caseId} LIMIT 1
  `
  const barriers: string[] = []
  if (enrollmentRow[0]?.barriers_data) {
    const b = enrollmentRow[0].barriers_data as Record<string, any>
    Object.keys(b).forEach(k => { if (k !== 'primaryBarrier') barriers.push(k.replace(/_/g, ' ')) })
  }

  return { ...c, goals, barriers } as any
}

// ─── ENROLLMENT FORM ─────────────────────────────────────────

export async function getCaseForEnrollment(caseId: string): Promise<{
  id: string; case_number: string; current_school: string | null; current_grade: string | null
  first_name: string; last_name: string; preferred_name: string | null
  pronouns: string | null; how_heard: string | null; referral_source: string | null
  existingForm: Record<string, any> | null
} | null> {
  const rows = await sql`
    SELECT
      c.id, c.case_number, p.current_school, p.current_grade,
      p.first_name, p.last_name, p.preferred_name, p.pronouns,
      p.how_heard, p.referral_source
    FROM cases c
    JOIN participants p ON p.id = c.participant_id
    WHERE c.id = ${caseId}
  `
  const c = rows[0]
  if (!c) return null

  const existing = await sql`
    SELECT * FROM enrollment_forms WHERE case_id = ${caseId} LIMIT 1
  `

  return { ...c, existingForm: existing[0] ?? null } as any
}

// ─── STABLE MONITORING ────────────────────────────────────────

export async function getStableCases() {
  return sql`
    SELECT
      c.id, c.case_number, c.status, c.exit_date, c.exit_reason,
      p.current_school, p.current_grade,
      p.first_name, p.last_name,
      u_adv.first_name || ' ' || u_adv.last_name AS former_advocate,
      sv.id               AS service_id,
      sv.start_date       AS stable_started,
      sv.planned_end_date,
      sv.status           AS stable_status,
      sv.outcome          AS stable_outcome,
      COALESCE(
        json_agg(
          json_build_object(
            'id',               sal.id,
            'pull_date',        sal.pull_date,
            'days_reviewed',    sal.days_reviewed,
            'uea_count',        sal.unexcused_absences,
            'ea_count',         sal.excused_absences,
            'tardy_count',      sal.tardies,
            'still_enrolled',   sal.currently_enrolled,
            'notes',            sal.notes,
            'outcome',          sal.outcome,
            'logged_at',        sal.logged_at
          ) ORDER BY sal.logged_at DESC
        ) FILTER (WHERE sal.id IS NOT NULL),
        '[]'
      ) AS attendance_logs
    FROM services sv
    JOIN cases c        ON c.id = sv.case_id
    JOIN participants p ON p.id = c.participant_id
    LEFT JOIN users u_adv ON u_adv.id = sv.former_advocate_id
    LEFT JOIN stable_attendance_logs sal ON sal.service_id = sv.id
    WHERE sv.service_type = 'stable'
    GROUP BY c.id, c.case_number, c.status, c.exit_date, c.exit_reason,
             p.current_school, p.current_grade,
             p.first_name, p.last_name,
             u_adv.first_name, u_adv.last_name,
             sv.id, sv.start_date, sv.planned_end_date, sv.status, sv.outcome
    ORDER BY
      CASE sv.status WHEN 'not_started' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
      sv.planned_end_date ASC
  `
}


// ─── COORDINATOR DASHBOARD ────────────────────────────────────

export async function getCoordinatorDashboard() {
  const [queue, advocates, stats] = await Promise.all([
    // Unassigned cases sorted by score
    sql`
      SELECT
        c.id, c.case_number, c.status, p.current_school, p.current_grade,
        c.created_at AS referral_date,
        p.first_name, p.last_name,
        inv.score AS involvement_score,
        EXTRACT(EPOCH FROM (NOW() - c.created_at))/86400 AS days_waiting
      FROM cases c
      JOIN participants p ON p.id = c.participant_id
      LEFT JOIN involvement_scores inv ON inv.case_id = c.id
      WHERE c.advocate_id IS NULL
        AND c.status NOT IN ('closed')
      ORDER BY inv.score DESC NULLS LAST, c.created_at ASC
    `,

    // Advocates with caseload + overdue stats
    sql`
      SELECT
        u.id, u.first_name, u.last_name, u.email,
        COUNT(c.id) FILTER (WHERE c.status = 'active')          AS active_cases,
        COUNT(c.id) FILTER (WHERE c.status IN ('active','stable')) AS total_cases,
        COUNT(c.id) FILTER (
          WHERE c.status = 'active'
            AND (SELECT MAX(cn.created_at) FROM case_notes cn WHERE cn.case_id = c.id)
                < NOW() - INTERVAL '7 days'
        ) AS overdue_notes,
        COUNT(c.id) FILTER (
          WHERE c.status = 'active'
            AND (SELECT MAX(cn.created_at) FROM case_notes cn WHERE cn.case_id = c.id)
                < NOW() - INTERVAL '14 days'
        ) AS at_risk
      FROM users u
      LEFT JOIN cases c ON c.advocate_id = u.id
      WHERE u.role = 'advocate' AND u.is_active = true
      GROUP BY u.id
      ORDER BY u.last_name
    `,

    // Program stats
    sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')  AS active_cases,
        COUNT(*) FILTER (WHERE advocate_id IS NULL
          AND status NOT IN ('closed'))             AS awaiting_assignment,
        COUNT(*) FILTER (
          WHERE status = 'active'
            AND (SELECT MAX(cn.created_at) FROM case_notes cn WHERE cn.case_id = cases.id)
                < NOW() - INTERVAL '7 days'
        ) AS overdue_notes,
        COUNT(*) FILTER (
          WHERE status = 'active'
            AND (SELECT MAX(cn.created_at) FROM case_notes cn WHERE cn.case_id = cases.id)
                < NOW() - INTERVAL '14 days'
        ) AS at_risk,
        COUNT(*) FILTER (
          WHERE exit_date >= date_trunc('month', NOW())
        ) AS exits_this_month,
        (SELECT COUNT(*) FROM goals WHERE status = 'completed'
          AND target_date >= date_trunc('year', NOW())) AS goals_ytd
      FROM cases
    `,
  ])

  // Load active cases per advocate for caseload cards
  const advocateCases = await sql`
    SELECT
      c.id, c.case_number, c.status, p.current_school, p.current_grade,
      c.advocate_id,
      p.first_name, p.last_name,
      inv.score AS involvement_score,
      EXTRACT(EPOCH FROM (NOW() - MAX(cn.created_at)))/86400 AS days_since_note
    FROM cases c
    JOIN participants p ON p.id = c.participant_id
    LEFT JOIN involvement_scores inv ON inv.case_id = c.id
    LEFT JOIN case_notes cn ON cn.case_id = c.id
    WHERE c.status = 'active'
      AND c.advocate_id IS NOT NULL
    GROUP BY c.id, c.case_number, c.status, p.current_school,
             p.current_grade, c.advocate_id, p.first_name, p.last_name, inv.score
    ORDER BY inv.score DESC NULLS LAST
  `

  return { queue, advocates, stats: stats[0], advocateCases }
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

export async function getDashboardData(userId: string, role: string) {
  // My cases (if advocate)
  const myCases = role === 'advocate' ? await sql`
    SELECT
      c.id, c.case_number, c.status, c.updated_at,
      p.first_name, p.last_name, p.current_school, p.current_grade,
      (SELECT COUNT(*) FROM goals g WHERE g.case_id = c.id AND g.status = 'in_progress') AS open_goals,
      (SELECT MAX(cn.interaction_date) FROM case_notes cn WHERE cn.case_id = c.id) AS last_note_date
    FROM cases c
    JOIN participants p ON p.id = c.participant_id
    WHERE c.advocate_id = ${userId}
      AND c.status IN ('active','assigned')
    ORDER BY last_note_date ASC NULLS FIRST
    LIMIT 10
  ` : []

  // Overdue notes (no note in 7+ days)
  const overdueNotes = role === 'advocate' ? await sql`
    SELECT
      c.id, c.case_number,
      p.first_name, p.last_name,
      MAX(cn.interaction_date) AS last_note,
      NOW()::date - MAX(cn.interaction_date)::date AS days_since
    FROM cases c
    JOIN participants p ON p.id = c.participant_id
    LEFT JOIN case_notes cn ON cn.case_id = c.id
    WHERE c.advocate_id = ${userId}
      AND c.status IN ('active','assigned')
    GROUP BY c.id, c.case_number, p.first_name, p.last_name
    HAVING MAX(cn.interaction_date) < NOW() - INTERVAL '7 days'
       OR MAX(cn.interaction_date) IS NULL
    ORDER BY days_since DESC NULLS FIRST
    LIMIT 5
  ` : []

  // Recent activity (last 5 notes across my cases)
  const recentActivity = role === 'advocate' ? await sql`
    SELECT
      cn.id, cn.interaction_date, cn.note_type, cn.full_note AS content,
      c.id AS case_id, c.case_number,
      p.first_name, p.last_name,
      u.first_name AS author_first, u.last_name AS author_last
    FROM case_notes cn
    JOIN cases c ON c.id = cn.case_id
    JOIN participants p ON p.id = c.participant_id
    LEFT JOIN users u ON u.id = cn.author_id
    WHERE c.advocate_id = ${userId}
    ORDER BY cn.interaction_date DESC
    LIMIT 5
  ` : await sql`
    SELECT
      cn.id, cn.interaction_date, cn.note_type, cn.full_note AS content,
      c.id AS case_id, c.case_number,
      p.first_name, p.last_name,
      u.first_name AS author_first, u.last_name AS author_last
    FROM case_notes cn
    JOIN cases c ON c.id = cn.case_id
    JOIN participants p ON p.id = c.participant_id
    LEFT JOIN users u ON u.id = cn.author_id
    ORDER BY cn.interaction_date DESC
    LIMIT 5
  `

  // Summary stats
  const stats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE c.status IN ('active','assigned') AND c.advocate_id = ${userId})::int AS my_active,
      COUNT(*) FILTER (WHERE c.status = 'referred')::int AS pending_intake,
      COUNT(*) FILTER (WHERE c.status = 'stable')::int  AS stable_count,
      (SELECT COUNT(*) FROM goals WHERE status = 'in_progress')::int AS goals_in_progress
    FROM cases c
  `

  return { myCases, overdueNotes, recentActivity, stats: stats[0] }
}

// ─── GOALS CROSS-CASE VIEW ───────────────────────────────────────────────────

export async function getAllGoals(userId: string, role: string) {
  const baseQuery = `
    SELECT
      g.id, g.title, g.category, g.status, g.progress_pct, g.target_date,
      c.id AS case_id, c.case_number,
      p.first_name, p.last_name,
      u.first_name AS advocate_first, u.last_name AS advocate_last,
      p.current_school
    FROM goals g
    JOIN cases c ON c.id = g.case_id
    JOIN participants p ON p.id = c.participant_id
    LEFT JOIN users u ON u.id = c.advocate_id
    WHERE c.status IN ('active','assigned','stable')
  `
  const orderClause = `
    ORDER BY
      CASE g.status
        WHEN 'in_progress'  THEN 0
        WHEN 'not_started'  THEN 1
        WHEN 'completed'    THEN 2
        ELSE 3
      END,
      g.target_date ASC NULLS LAST
  `

  if (role === 'advocate') {
    return sql`
      SELECT
        g.id, g.title, g.category, g.status, g.progress_pct, g.target_date,
        c.id AS case_id, c.case_number,
        p.first_name, p.last_name,
        u.first_name AS advocate_first, u.last_name AS advocate_last,
        p.current_school
      FROM goals g
      JOIN cases c ON c.id = g.case_id
      JOIN participants p ON p.id = c.participant_id
      LEFT JOIN users u ON u.id = c.advocate_id
      WHERE c.status IN ('active','assigned','stable')
        AND c.advocate_id = ${userId}
      ORDER BY
        CASE g.status
          WHEN 'in_progress'  THEN 0
          WHEN 'not_started'  THEN 1
          WHEN 'completed'    THEN 2
          ELSE 3
        END,
        g.target_date ASC NULLS LAST
    `
  }

  return sql`
    SELECT
      g.id, g.title, g.category, g.status, g.progress_pct, g.target_date,
      c.id AS case_id, c.case_number,
      p.first_name, p.last_name,
      u.first_name AS advocate_first, u.last_name AS advocate_last,
      p.current_school
    FROM goals g
    JOIN cases c ON c.id = g.case_id
    JOIN participants p ON p.id = c.participant_id
    LEFT JOIN users u ON u.id = c.advocate_id
    WHERE c.status IN ('active','assigned','stable')
    ORDER BY
      CASE g.status
        WHEN 'in_progress'  THEN 0
        WHEN 'not_started'  THEN 1
        WHEN 'completed'    THEN 2
        ELSE 3
      END,
      g.target_date ASC NULLS LAST
  `
}

// ─── SITES ───────────────────────────────────────────────────────────────────

export async function getSites() {
  try {
    return await sql`
      SELECT
        s.id, s.name, s.short_name, s.address, s.is_active,
        u.first_name || ' ' || u.last_name AS site_lead,
        (SELECT COUNT(*) FROM site_attendance sa
         WHERE sa.site_id = s.id
           AND sa.attendance_date = CURRENT_DATE
           AND sa.present = true)::int AS todays_count,
        (SELECT COUNT(*) FROM site_attendance sa
         WHERE sa.site_id = s.id
           AND sa.attendance_date >= CURRENT_DATE - 30
           AND sa.present = true)::int AS monthly_visits,
        NULL AS todays_session_id
      FROM sites s
      LEFT JOIN users u ON u.id = s.site_lead_id
      WHERE s.is_active = true
      ORDER BY s.name
    `
  } catch (err: any) {
    console.error('getSites error:', err?.message)
    return []
  }
}

export async function getSiteDetail(siteId: string) {
  try {
    const site = await sql`
      SELECT s.*, u.first_name || ' ' || u.last_name AS site_lead
      FROM sites s LEFT JOIN users u ON u.id = s.site_lead_id
      WHERE s.id = ${siteId}
    `

    // Daily attendance summary (last 30 days)
    const sessions = await sql`
      SELECT
        sa.attendance_date AS session_date,
        COUNT(*) FILTER (WHERE sa.present = true)::int  AS attendee_count,
        COUNT(*) FILTER (WHERE sa.present = false)::int AS absent_count,
        u.first_name || ' ' || u.last_name AS opened_by_name,
        MIN(sa.check_in_time)  AS opened_at,
        MAX(sa.check_out_time) AS closed_at,
        NULL AS id,
        NULL AS notes
      FROM site_attendance sa
      LEFT JOIN users u ON u.id = sa.recorded_by
      WHERE sa.site_id = ${siteId}
      GROUP BY sa.attendance_date, u.first_name, u.last_name
      ORDER BY sa.attendance_date DESC
      LIMIT 30
    `

    // Today's attendees
    const todayAttendees = await sql`
      SELECT
        p.id, p.first_name, p.last_name, p.current_school, p.current_grade,
        sa.check_in_time  AS signed_in_at,
        sa.check_out_time AS signed_out_at,
        sa.id             AS attendance_id,
        sa.present
      FROM site_attendance sa
      JOIN participants p ON p.id = sa.site_enrollment_id
      WHERE sa.site_id = ${siteId}
        AND sa.attendance_date = CURRENT_DATE
        AND sa.present = true
      ORDER BY sa.check_in_time DESC
    `

    return { site: site[0], sessions, todayAttendees }
  } catch (err: any) {
    console.error('getSiteDetail error:', err?.message)
    return { site: null, sessions: [], todayAttendees: [] }
  }
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

export async function getDocumentsByCase(caseId: string) {
  try {
    return await sql`
      SELECT
        d.id, d.file_name, d.file_size, d.mime_type,
        d.s3_key, d.doc_type, d.created_at,
        u.first_name || ' ' || u.last_name AS uploaded_by_name
      FROM case_documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      WHERE d.case_id = ${caseId}
        AND d.deleted_at IS NULL
      ORDER BY d.created_at DESC
    `
  } catch {
    // Table may not exist yet — return empty until migration is run
    return []
  }
}
