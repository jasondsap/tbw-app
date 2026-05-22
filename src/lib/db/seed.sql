-- ============================================================
-- TBW Advocacy Platform — Test Seed Data
-- Run AFTER schema.sql + all migration files
-- ============================================================

-- ── Migrations (run once, idempotent) ────────────────────────
-- Service exit narrative (canonical 11-phrase outcome from Casebook Process.pdf).
-- Stored as TEXT so "Other" free-text exits are valid too. Mirrors services.outcome
-- at the case level for funder reporting.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS exit_narrative TEXT;

-- Info & Referral terminal status. case_status is a USER-DEFINED enum in Neon,
-- so the new value has to be added to the type (a TEXT column wouldn't need this).
-- ALTER TYPE ... ADD VALUE must run outside a transaction block — execute this
-- as its own statement in the Neon SQL editor.
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'info_referral_closed';

-- In-app consent signing infrastructure (replaces Dropbox Sign for the four
-- non-notarized forms). Two tables:
--   consent_invitations — one row per (case, form, channel) send; supersedes
--     prior open invitations on resend so history stays clean.
--   consent_signatures  — one row per completed signature attempt (signed
--     OR declined). Stores the PDF s3 key + sha256 for tamper-evidence.
CREATE TABLE IF NOT EXISTS consent_invitations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                  UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  form_type                TEXT NOT NULL,           -- matches consents.form_type
  token                    TEXT NOT NULL UNIQUE,
  channel                  TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  sent_to                  TEXT NOT NULL,            -- phone or email actually sent to
  status                   TEXT NOT NULL DEFAULT 'sent'
                            CHECK (status IN ('sent', 'opened', 'completed', 'expired', 'superseded', 'failed')),
  expires_at               TIMESTAMPTZ NOT NULL,
  sent_by                  UUID REFERENCES users(id),
  sent_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at             TIMESTAMPTZ,
  superseded_at            TIMESTAMPTZ,
  provider_message_id      TEXT,                     -- Twilio sid or Resend id
  send_status              TEXT,
  send_error               TEXT,
  custom_message           TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consent_invitations_case_id ON consent_invitations(case_id);
CREATE INDEX IF NOT EXISTS idx_consent_invitations_token ON consent_invitations(token);
CREATE INDEX IF NOT EXISTS idx_consent_invitations_status ON consent_invitations(status);

CREATE TABLE IF NOT EXISTS consent_signatures (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                  UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  consent_id               UUID REFERENCES consents(id),
  form_type                TEXT NOT NULL,
  form_version             TEXT NOT NULL,            -- e.g. 'tbw_participation_2025_08'
  invitation_id            UUID REFERENCES consent_invitations(id),
  administered_by          TEXT NOT NULL CHECK (administered_by IN ('staff', 'self_service')),
  administered_by_user_id  UUID REFERENCES users(id),
  signed_name              TEXT NOT NULL,
  signed_data              JSONB NOT NULL,           -- captured form answers
  signed_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_ip                INET,
  signed_user_agent        TEXT,
  pdf_s3_key               TEXT NOT NULL,
  pdf_sha256               TEXT NOT NULL,
  outcome                  TEXT NOT NULL DEFAULT 'signed'
                            CHECK (outcome IN ('signed', 'declined')),
  outcome_at_screen_key    TEXT,                     -- when declined: which screen
  requires_notarization    BOOLEAN NOT NULL DEFAULT FALSE,
  notarized_at             TIMESTAMPTZ,
  notarized_by             TEXT,
  notarized_pdf_s3_key     TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT consent_outcome_chk CHECK (
    (outcome = 'signed'   AND outcome_at_screen_key IS NULL) OR
    (outcome = 'declined' AND outcome_at_screen_key IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_consent_signatures_case_id ON consent_signatures(case_id);
CREATE INDEX IF NOT EXISTS idx_consent_signatures_consent_id ON consent_signatures(consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_signatures_form_type ON consent_signatures(form_type);

-- ── Users (staff) ────────────────────────────────────────────
INSERT INTO users (id, cognito_sub, first_name, last_name, email, role, phone, is_active, created_at)
VALUES
  ('04ea10c7-27f6-4b70-b679-4871f97d11a5',  'cognito-admin',  'Jess',    'Whitaker',  'jess@thebookworks.org',    'admin',               '502-555-0100', true, NOW()),
  ('347dd557-58c4-4b00-9969-57dffdf1c786',  'cognito-coord',  'Emily',   'Richardson','emily@thebookworks.org',   'education_coordinator','502-555-0101', true, NOW()),
  ('1fe8d2ed-7da5-4e07-83a2-3161a4f96761',   'cognito-adv1',   'Darius',  'Mitchell',  'darius@thebookworks.org',  'advocate',            '502-555-0102', true, NOW()),
  ('99dbd292-2acf-404b-a002-b40a43bf0c9a',   'cognito-adv2',   'Sam',     'Kowalski',  'sam@thebookworks.org',     'advocate',            '502-555-0103', true, NOW()),
  ('4799407a-c17c-403b-b016-58df0ecaefc6',   'cognito-adv3',   'Maya',    'Torres',    'maya@thebookworks.org',    'advocate',            '502-555-0104', true, NOW()),
  ('e60379de-3dd7-41fc-8d35-779ac193fb4f', 'cognito-intake', 'Gail',    'Perkins',   'gail@thebookworks.org',    'intake_specialist',   '502-555-0105', true, NOW()),
  ('247bf199-1c1f-40cf-946a-e4ea27777a50',   'cognito-data',   'Sophia',  'Chen',      'sophia@thebookworks.org',  'data_analyst',        '502-555-0106', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Participants ──────────────────────────────────────────────
INSERT INTO participants (
  id, first_name, last_name, preferred_name, pronouns, date_of_birth,
  phone_primary, email, address_street, address_city, address_zip,
  neighborhood, current_school, current_grade, highest_ed_completed,
  referral_source, how_heard, is_active, created_by, created_at
) VALUES
  ('1f137165-89c9-4ce3-a27e-dc8a0ab8399d', 'DeShawn',  'Carter',   NULL,      'he/him',    '2007-04-12',
   '502-555-1001', NULL, '1234 Bardstown Rd', 'Louisville', '40205',
   'Highlands', 'Waggener High School', '10', '9',
   'teacher_counselor', 'Teacher or school counselor', true, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '90 days'),

  ('a4945d2e-6e53-4030-a573-ed644c07323b', 'Aaliyah',  'Thompson', 'Lia',     'she/her',   '2006-09-21',
   '502-555-1002', NULL, '567 Preston Hwy', 'Louisville', '40219',
   'Fern Creek', 'Fern Creek Traditional High School', '11', '10',
   'community_org', 'Community organization', true, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '75 days'),

  ('65d00b9b-14bc-4dca-91ef-dc5ab3ba1bbb', 'Jordan',   'Reyes',    NULL,      'they/them', '2008-02-08',
   '502-555-1003', NULL, '890 Outer Loop', 'Louisville', '40228',
   'Okolona', 'Jefferson Traditional Middle School', '8', '7',
   'family', 'Family member', true, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '60 days'),

  ('b230ccf8-e3ce-4cbc-98ea-e80ab7f4eafe', 'Destiny',  'Brown',    'Des',     'she/her',   '2005-11-30',
   '502-555-1004', 'destiny.b@gmail.com', '321 Poplar Level Rd', 'Louisville', '40213',
   'Newburg', 'Iroquois High School', '12', '11',
   'friend', 'Friend', true, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '45 days'),

  ('3dd4b750-f081-4668-97f2-28629996a8f1', 'Kendrick', 'Johnson',  NULL,      'he/him',    '2010-07-15',
   '502-555-1005', NULL, '456 Market St', 'Louisville', '40202',
   'Downtown', 'Thomas Jefferson Middle School', '7', '6',
   'social_media', 'Social Media', true, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '20 days'),

  ('f6d614b1-4aa8-4e69-86cc-28c04bdac33e', 'Brianna',  'Santos',   'Bri',     'she/her',   '2006-03-22',
   '502-555-1006', NULL, '789 Taylor Blvd', 'Louisville', '40215',
   'South Louisville', 'Southern High School', '9', '8',
   'teacher_counselor', 'Teacher or school counselor', true, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '120 days'),

  ('1f350d95-8213-443c-85cc-16f1c5e7c459', 'Marcus',   'Webb',     NULL,      'he/him',    '2007-08-05',
   '502-555-1007', NULL, '234 Shelby St', 'Louisville', '40206',
   'Germantown', 'Manual High School', '11', '10',
   'community_org', 'Community organization', true, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- ── Cases ─────────────────────────────────────────────────────
-- case_number auto-generated by trigger; using explicit IDs here
INSERT INTO cases (
  id, case_number, participant_id, intake_specialist_id, advocate_id, coordinator_id,
  status, referral_date, enrolled_at,
  current_school, current_grade,
  exit_date, exit_reason,
  created_by, created_at
) VALUES
  -- Active cases with advocates
  ('eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'TBW-2025-0001', '1f137165-89c9-4ce3-a27e-dc8a0ab8399d', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', '1fe8d2ed-7da5-4e07-83a2-3161a4f96761', '347dd557-58c4-4b00-9969-57dffdf1c786',
   'active', NOW() - INTERVAL '88 days', NOW() - INTERVAL '80 days',
   'Waggener High School', '10', NULL, NULL, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '88 days'),

  ('a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'TBW-2025-0002', 'a4945d2e-6e53-4030-a573-ed644c07323b', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', '99dbd292-2acf-404b-a002-b40a43bf0c9a', '347dd557-58c4-4b00-9969-57dffdf1c786',
   'active', NOW() - INTERVAL '73 days', NOW() - INTERVAL '65 days',
   'Fern Creek Traditional High School', '11', NULL, NULL, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '73 days'),

  ('4567a973-9102-4af9-a136-306701bba8ef', 'TBW-2025-0003', '65d00b9b-14bc-4dca-91ef-dc5ab3ba1bbb', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', '1fe8d2ed-7da5-4e07-83a2-3161a4f96761', '347dd557-58c4-4b00-9969-57dffdf1c786',
   'active', NOW() - INTERVAL '58 days', NOW() - INTERVAL '50 days',
   'Jefferson Traditional Middle School', '8', NULL, NULL, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '58 days'),

  ('1dde123c-d393-4e2b-94b0-a70af8fcb870', 'TBW-2025-0004', 'b230ccf8-e3ce-4cbc-98ea-e80ab7f4eafe', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', '4799407a-c17c-403b-b016-58df0ecaefc6', '347dd557-58c4-4b00-9969-57dffdf1c786',
   'active', NOW() - INTERVAL '43 days', NOW() - INTERVAL '35 days',
   'Iroquois High School', '12', NULL, NULL, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '43 days'),

  -- New — in intake pipeline, not yet assigned
  ('618dcca2-bfbb-4f9e-982d-2c7fc2735938', 'TBW-2025-0005', '3dd4b750-f081-4668-97f2-28629996a8f1', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NULL, '347dd557-58c4-4b00-9969-57dffdf1c786',
   'intake_scheduled', NOW() - INTERVAL '18 days', NULL,
   'Thomas Jefferson Middle School', '7', NULL, NULL, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '18 days'),

  -- Exited — reached goals (in Stable window)
  ('9f3a4ef3-d257-45c6-a765-fbc897d96728', 'TBW-2025-0006', 'f6d614b1-4aa8-4e69-86cc-28c04bdac33e', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', '99dbd292-2acf-404b-a002-b40a43bf0c9a', '347dd557-58c4-4b00-9969-57dffdf1c786',
   'active', NOW() - INTERVAL '118 days', NOW() - INTERVAL '110 days',
   'Southern High School', '9',
   (NOW() - INTERVAL '26 days')::date, 'reached_goals', '99dbd292-2acf-404b-a002-b40a43bf0c9a', NOW() - INTERVAL '118 days'),

  -- New referral — intake not yet scheduled
  ('5d166db7-66c2-40d1-8792-997f10885752', 'TBW-2025-0007', '1f350d95-8213-443c-85cc-16f1c5e7c459', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NULL, NULL,
   'referred', NOW() - INTERVAL '12 days', NULL,
   'Manual High School', '11', NULL, NULL, 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;

-- ── Involvement Scores ────────────────────────────────────────
INSERT INTO involvement_scores (id, case_id, score, urgency, involvement, factors, notes, scored_by, created_at)
VALUES
  ('883dc6b2-30d0-420f-bfd1-cb494c370020', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 3, 'high',   'low',    ARRAY['chronic_absences','withdrawal_gap'],            'Chronic absenteeism since last semester', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '85 days'),
  ('9fe17884-34fe-4502-95ce-7cedb0c171de', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 4, 'high',   'low',    ARRAY['mental_health','economic','justice_involved'],  'Active court involvement, family economic stress', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '70 days'),
  ('7d6a971d-4cba-4de8-9ab8-e9f569c2e38c', '4567a973-9102-4af9-a136-306701bba8ef', 2, 'medium', 'medium', ARRAY['school_safety','chronic_absences'],             'Bullying related absences', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '55 days'),
  ('89e6c75a-722d-41cc-bff2-4dd08d4de00d', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 3, 'high',   'medium', ARRAY['foster_care','withdrawal_gap'],                 'In foster care, gap in enrollment since spring', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '40 days'),
  ('d2774fb7-c298-4468-b83e-ec9cd27b3d7e', '9f3a4ef3-d257-45c6-a765-fbc897d96728', 3, 'medium', 'low',    ARRAY['chronic_absences','transportation'],            'Transportation barrier resolved at exit', 'e60379de-3dd7-41fc-8d35-779ac193fb4f', NOW() - INTERVAL '115 days')
ON CONFLICT (id) DO NOTHING;

-- ── Goals ────────────────────────────────────────────────────
INSERT INTO goals (
  id, case_id, title, description, category, status, progress,
  target_date, start_date, end_date, outcome, outcome_notes,
  created_by, created_at
) VALUES
  -- DeShawn (c-001)
  ('7d9990ff-9251-4c0a-9ff4-1e76f24509d8', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'Reduce unexcused absences to under 5 per semester',
   'Currently at 14 unexcused absences. Work with school to address root causes and create an attendance plan.',
   'attendance', 'in_progress', 60,
   (NOW() + INTERVAL '45 days')::date, (NOW() - INTERVAL '78 days')::date, NULL, NULL, NULL,
   '1fe8d2ed-7da5-4e07-83a2-3161a4f96761', NOW() - INTERVAL '78 days'),

  ('d7e1df3c-da03-4b7e-b53d-5f07a49a6e40', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'Enroll in credit recovery for failed English 1',
   'Needs to recover English 1 credit from last year to stay on track for graduation.',
   'academics', 'in_progress', 40,
   (NOW() + INTERVAL '60 days')::date, (NOW() - INTERVAL '78 days')::date, NULL, NULL, NULL,
   '1fe8d2ed-7da5-4e07-83a2-3161a4f96761', NOW() - INTERVAL '78 days'),

  -- Aaliyah (c-002)
  ('650f62d4-68a1-4b55-b174-dd45e2dabbf3', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'Connect with mental health services',
   'Referred to Seven Counties for counseling. Goal is first appointment scheduled and attended.',
   'wellness', 'completed', 100,
   (NOW() - INTERVAL '20 days')::date, (NOW() - INTERVAL '63 days')::date,
   (NOW() - INTERVAL '20 days')::date, 'reached', 'Attended first session, ongoing monthly',
   '99dbd292-2acf-404b-a002-b40a43bf0c9a', NOW() - INTERVAL '63 days'),

  ('4713c387-fc3b-47a5-a574-881ed29aac82', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'Maintain passing grades in all current classes',
   'Currently passing 3 of 5 classes. Focus on Math and History.',
   'academics', 'in_progress', 70,
   (NOW() + INTERVAL '30 days')::date, (NOW() - INTERVAL '63 days')::date, NULL, NULL, NULL,
   '99dbd292-2acf-404b-a002-b40a43bf0c9a', NOW() - INTERVAL '63 days'),

  -- Jordan (c-003)
  ('1089309c-2c7a-40ed-ad3b-e7085ad4894c', '4567a973-9102-4af9-a136-306701bba8ef', 'Address school safety concerns with administration',
   'Bullying situation reported. Goal is formal response from school with safety plan.',
   'school_environment', 'in_progress', 50,
   (NOW() + INTERVAL '21 days')::date, (NOW() - INTERVAL '48 days')::date, NULL, NULL, NULL,
   '1fe8d2ed-7da5-4e07-83a2-3161a4f96761', NOW() - INTERVAL '48 days'),

  -- Destiny (c-004)
  ('8245c1e8-9614-4fa2-9532-6c3647e89d2f', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 'Re-enroll in school after gap',
   'Was withdrawn in March. Goal is to enroll at Iroquois and attend consistently.',
   'enrollment', 'completed', 100,
   (NOW() - INTERVAL '10 days')::date, (NOW() - INTERVAL '33 days')::date,
   (NOW() - INTERVAL '10 days')::date, 'reached', 'Successfully enrolled, attended first two weeks',
   '4799407a-c17c-403b-b016-58df0ecaefc6', NOW() - INTERVAL '33 days'),

  ('0da60f04-d4b0-4302-83ed-02845eaa461d', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 'Create graduation plan to finish on time',
   'Needs 6 credits to graduate. Map out remaining requirements and credit recovery options.',
   'academics', 'in_progress', 30,
   (NOW() + INTERVAL '45 days')::date, (NOW() - INTERVAL '33 days')::date, NULL, NULL, NULL,
   '4799407a-c17c-403b-b016-58df0ecaefc6', NOW() - INTERVAL '33 days'),

  -- Brianna (c-006 — exited)
  ('ffe59ec0-7018-4ff1-8715-5385829435e5', '9f3a4ef3-d257-45c6-a765-fbc897d96728', 'Improve attendance to under 5 absences',
   'Chronic absences resolved through transportation support and schedule change.',
   'attendance', 'completed', 100,
   (NOW() - INTERVAL '30 days')::date, (NOW() - INTERVAL '108 days')::date,
   (NOW() - INTERVAL '26 days')::date, 'reached', 'Attendance improved significantly in final quarter',
   '99dbd292-2acf-404b-a002-b40a43bf0c9a', NOW() - INTERVAL '108 days'),

  ('753658c0-74b9-41a2-806d-5c6448334f3a', '9f3a4ef3-d257-45c6-a765-fbc897d96728', 'Enroll in 10th grade at Southern HS',
   'Successfully transitioned from 9th to 10th grade enrollment.',
   'enrollment', 'completed', 100,
   (NOW() - INTERVAL '28 days')::date, (NOW() - INTERVAL '108 days')::date,
   (NOW() - INTERVAL '26 days')::date, 'reached', 'Enrolled and attending regularly',
   '99dbd292-2acf-404b-a002-b40a43bf0c9a', NOW() - INTERVAL '108 days')
ON CONFLICT (id) DO NOTHING;

-- ── Case Notes ────────────────────────────────────────────────
INSERT INTO case_notes (
  id, case_id, note_type, contact_method, content,
  contact_date, goal_ids, created_by, created_at
) VALUES
  ('43165a2c-07a1-4a63-93ac-d9294b7062a0', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'contact', 'phone',
   'Spoke with Ms. Carter (DeShawn''s mom) by phone. She reported DeShawn has been attending more consistently this week — 4 out of 5 days. He has expressed interest in the credit recovery program for English. She mentioned transportation is still an occasional issue on early release days. Next step: schedule meeting with school counselor to discuss credit recovery enrollment.',
   NOW() - INTERVAL '3 days', ARRAY['7d9990ff-9251-4c0a-9ff4-1e76f24509d8', 'd7e1df3c-da03-4b7e-b53d-5f07a49a6e40'], '1fe8d2ed-7da5-4e07-83a2-3161a4f96761', NOW() - INTERVAL '3 days'),

  ('11090624-7494-46d3-b46a-c0b7d618cad1', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'meeting', 'in_person',
   'Enrollment meeting held at TBW office with DeShawn and his mother. Completed enrollment form together. DeShawn identified his strengths as math and working in groups. Primary barriers noted: chronic absences and credit gap from last year. Goals set around attendance improvement and English credit recovery. DeShawn expressed he wants to play basketball in 11th grade, which requires passing grades.',
   NOW() - INTERVAL '78 days', ARRAY['7d9990ff-9251-4c0a-9ff4-1e76f24509d8', 'd7e1df3c-da03-4b7e-b53d-5f07a49a6e40'], '1fe8d2ed-7da5-4e07-83a2-3161a4f96761', NOW() - INTERVAL '78 days'),

  ('9aa2c8ee-7c30-4081-8bfb-a703180c5dcc', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'contact', 'text',
   'Texted Aaliyah''s grandmother (primary caregiver). She confirmed Aaliyah attended her first counseling session at Seven Counties last Tuesday and is open to going back. Grades have been improving — she brought her History grade from an F to a D+ and is working on extra credit. Grandmother expressed gratitude for the advocacy support.',
   NOW() - INTERVAL '5 days', ARRAY['650f62d4-68a1-4b55-b174-dd45e2dabbf3', '4713c387-fc3b-47a5-a574-881ed29aac82'], '99dbd292-2acf-404b-a002-b40a43bf0c9a', NOW() - INTERVAL '5 days'),

  ('7cc64613-7669-4525-b78b-e61275fd7f60', '4567a973-9102-4af9-a136-306701bba8ef', 'meeting', 'virtual',
   'Virtual meeting with Jordan and their parent. Jordan shared that the bullying situation has continued despite a verbal intervention from the assistant principal. Their parent has sent a formal written complaint to the school. Jordan has been avoiding the hallway where incidents occur and has missed 2 days as a result. Next step: request formal meeting with principal and advocate present.',
   NOW() - INTERVAL '8 days', ARRAY['1089309c-2c7a-40ed-ad3b-e7085ad4894c'], '1fe8d2ed-7da5-4e07-83a2-3161a4f96761', NOW() - INTERVAL '8 days'),

  ('f9008ae9-07ba-45d6-be58-fbf97f3afe35', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 'contact', 'phone',
   'Called Destiny. She confirmed she attended her second week of school and is feeling more settled. Her foster placement is stable for now. She is concerned about being short on credits for graduation — brought up needing to take extra classes over the summer. Met with her for 20 minutes to review her transcript and identify the 6 credits needed.',
   NOW() - INTERVAL '2 days', ARRAY['8245c1e8-9614-4fa2-9532-6c3647e89d2f', '0da60f04-d4b0-4302-83ed-02845eaa461d'], '4799407a-c17c-403b-b016-58df0ecaefc6', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ── Consents ──────────────────────────────────────────────────
INSERT INTO consents (id, case_id, consent_type, status, notarized, sent_at, signed_at, created_at)
VALUES
  ('48ede25c-81af-4a8a-aaff-5df6973fff2c', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'tbw_consent',     'signed',  false, NOW() - INTERVAL '85 days', NOW() - INTERVAL '82 days', NOW() - INTERVAL '85 days'),
  ('c18d25fa-5b93-4815-9eb9-84daad510d47', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'jcps_roi',        'signed',  true,  NOW() - INTERVAL '85 days', NOW() - INTERVAL '80 days', NOW() - INTERVAL '85 days'),
  ('c1ea6764-435c-48ad-8255-97b32973c443', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'cascade',         'signed',  false, NOW() - INTERVAL '85 days', NOW() - INTERVAL '82 days', NOW() - INTERVAL '85 days'),
  ('5f7d7bc7-e0b4-4357-8349-8e9f337c6364', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'medical_waiver',  'signed',  false, NOW() - INTERVAL '85 days', NOW() - INTERVAL '82 days', NOW() - INTERVAL '85 days'),
  ('48494041-0482-48e0-aef8-fe3fd6d5391c', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'photo_release',   'pending', false, NOW() - INTERVAL '85 days', NULL, NOW() - INTERVAL '85 days'),

  ('111cd4df-19d4-48ed-89b7-a1f8829b0443', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'tbw_consent',     'signed',  false, NOW() - INTERVAL '72 days', NOW() - INTERVAL '70 days', NOW() - INTERVAL '72 days'),
  ('22b3c9e4-9507-481f-84b2-d27558eedd62', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'jcps_roi',        'signed',  true,  NOW() - INTERVAL '72 days', NOW() - INTERVAL '68 days', NOW() - INTERVAL '72 days'),
  ('499a6547-7f86-4d3c-a685-e7e91e607a6a', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'cascade',         'signed',  false, NOW() - INTERVAL '72 days', NOW() - INTERVAL '70 days', NOW() - INTERVAL '72 days'),
  ('e123dccb-931e-4cae-b28e-c29b4ac7faa7', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'medical_waiver',  'signed',  false, NOW() - INTERVAL '72 days', NOW() - INTERVAL '70 days', NOW() - INTERVAL '72 days'),
  ('4b86f74a-a0c4-4d5a-99b6-c30a8600d34d', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'photo_release',   'signed',  false, NOW() - INTERVAL '72 days', NOW() - INTERVAL '70 days', NOW() - INTERVAL '72 days'),

  ('c0aa55ed-6b17-42ca-87e4-434f1c7dda47', '4567a973-9102-4af9-a136-306701bba8ef', 'tbw_consent',     'signed',  false, NOW() - INTERVAL '57 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '57 days'),
  ('ba83d208-2c6c-46b4-89a2-c6a2da636ec8', '4567a973-9102-4af9-a136-306701bba8ef', 'jcps_roi',        'pending', false, NOW() - INTERVAL '57 days', NULL, NOW() - INTERVAL '57 days'),
  ('143de5c5-c41d-4008-895e-1a713dc102f8', '4567a973-9102-4af9-a136-306701bba8ef', 'cascade',         'signed',  false, NOW() - INTERVAL '57 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '57 days'),
  ('102cfe94-35aa-4e03-9691-9a650d1ca029', '4567a973-9102-4af9-a136-306701bba8ef', 'medical_waiver',  'signed',  false, NOW() - INTERVAL '57 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '57 days'),
  ('212ddbd3-941b-41eb-8670-a4f5fbe93856', '4567a973-9102-4af9-a136-306701bba8ef', 'photo_release',   'pending', false, NOW() - INTERVAL '57 days', NULL, NOW() - INTERVAL '57 days'),

  ('5790c11a-3d7a-4192-b0ff-34dd61eb6174', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 'tbw_consent',     'signed',  false, NOW() - INTERVAL '42 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '42 days'),
  ('ff316b2c-756f-40b3-ad88-17c671a033a9', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 'jcps_roi',        'signed',  true,  NOW() - INTERVAL '42 days', NOW() - INTERVAL '38 days', NOW() - INTERVAL '42 days'),
  ('09db0b66-ed08-4433-9863-dd47faca595b', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 'cascade',         'pending', false, NOW() - INTERVAL '42 days', NULL, NOW() - INTERVAL '42 days'),
  ('ab493060-792a-4eb0-ba64-5b2d6df73dae', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 'medical_waiver',  'signed',  false, NOW() - INTERVAL '42 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '42 days'),
  ('d27292d7-f442-4677-9aac-4ae82957a08d', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 'photo_release',   'pending', false, NOW() - INTERVAL '42 days', NULL, NOW() - INTERVAL '42 days'),

  -- c-005: intake only, consents just sent
  ('5511727c-ea8f-4775-aae9-b7e3c9d87fac', '618dcca2-bfbb-4f9e-982d-2c7fc2735938', 'tbw_consent',     'pending', false, NOW() - INTERVAL '5 days',  NULL, NOW() - INTERVAL '5 days'),
  ('3d8761ea-3c49-4804-ad9f-0e7f159bf944', '618dcca2-bfbb-4f9e-982d-2c7fc2735938', 'jcps_roi',        'pending', false, NULL, NULL, NOW() - INTERVAL '5 days'),
  ('00c1cd8c-8cd0-44b1-9fea-15a537d0fd23', '618dcca2-bfbb-4f9e-982d-2c7fc2735938', 'cascade',         'pending', false, NULL, NULL, NOW() - INTERVAL '5 days'),
  ('34b5392b-146f-48d0-bf02-e2b785fd1878', '618dcca2-bfbb-4f9e-982d-2c7fc2735938', 'medical_waiver',  'pending', false, NULL, NULL, NOW() - INTERVAL '5 days'),
  ('b933c1df-f01f-4582-8fae-fe67d6b011f2', '618dcca2-bfbb-4f9e-982d-2c7fc2735938', 'photo_release',   'pending', false, NULL, NULL, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- ── Services ──────────────────────────────────────────────────
INSERT INTO services (
  id, case_id, service_type, started_at, ended_at,
  planned_end_date, outcome, status, former_advocate_id, created_at
) VALUES
  -- Active Ed Advocacy services
  ('a7b9af06-cad9-4b5a-912e-e84dd79fb930', 'eeaaf3e3-9398-4d47-aae7-06971b84c96c', 'education_advocacy', NOW() - INTERVAL '80 days', NULL, NULL, NULL, 'active', NULL, NOW() - INTERVAL '80 days'),
  ('8f01be5d-fbeb-4460-9b64-83f21ee93fa2', 'a430d5c5-ba65-4e5e-bf02-bc25f850fd5d', 'education_advocacy', NOW() - INTERVAL '65 days', NULL, NULL, NULL, 'active', NULL, NOW() - INTERVAL '65 days'),
  ('a25d76c7-45df-4ac6-8cd4-8e128ac1b72e', '4567a973-9102-4af9-a136-306701bba8ef', 'education_advocacy', NOW() - INTERVAL '50 days', NULL, NULL, NULL, 'active', NULL, NOW() - INTERVAL '50 days'),
  ('606fa9df-7551-42a9-9d92-bd88f40b2503', '1dde123c-d393-4e2b-94b0-a70af8fcb870', 'education_advocacy', NOW() - INTERVAL '35 days', NULL, NULL, NULL, 'active', NULL, NOW() - INTERVAL '35 days'),

  -- Brianna exited — Ed Advocacy ended, Stable started
  ('972a32bf-3500-4c31-8393-7a0b3ffdff53', '9f3a4ef3-d257-45c6-a765-fbc897d96728', 'education_advocacy',
   NOW() - INTERVAL '110 days', (NOW() - INTERVAL '26 days')::date,
   NULL, 'reached_goals', 'closed', NULL, NOW() - INTERVAL '110 days'),

  ('d7591692-4c2d-4ad4-a172-34d11fb56241', '9f3a4ef3-d257-45c6-a765-fbc897d96728', 'stable',
   (NOW() - INTERVAL '26 days')::date, NULL,
   (NOW() - INTERVAL '26 days' + INTERVAL '30 days')::date,
   NULL, 'not_started', '99dbd292-2acf-404b-a002-b40a43bf0c9a', NOW() - INTERVAL '26 days')
ON CONFLICT (id) DO NOTHING;

-- ── JCPS Records Clerks ───────────────────────────────────────
INSERT INTO records_clerks (id, school_name, clerk_name, email, phone, created_at)
VALUES
  ('8dbebf44-7bc3-4ba3-82cb-9c336026eef1', 'Waggener High School',                  'Ms. Patricia Adams',   'padams@jefferson.kyschools.us',    '502-485-8248', NOW()),
  ('4659c0b1-91e5-4864-b2b8-e925e7d549fe', 'Fern Creek Traditional High School',    'Mr. David Torres',     'dtorres@jefferson.kyschools.us',   '502-485-8315', NOW()),
  ('ff094edb-8c38-4535-a16e-244b57db9f1a', 'Iroquois High School',                  'Ms. Linda Marsh',      'lmarsh@jefferson.kyschools.us',    '502-485-8265', NOW()),
  ('cfd71139-488f-4849-9240-299f77716e28', 'Southern High School',                  'Ms. Brenda Hill',      'bhill@jefferson.kyschools.us',     '502-485-8243', NOW()),
  ('ff45c1e1-a8f8-411e-b3bf-8998b0bce6a7', 'Manual High School',                    'Mr. James Okafor',     'jokafor@jefferson.kyschools.us',   '502-485-8272', NOW()),
  ('5e0a4679-f0fc-46ed-95b1-71ca1d9e1e41', 'Thomas Jefferson Middle School',        'Ms. Carol Nguyen',     'cnguyen@jefferson.kyschools.us',   '502-485-8256', NOW()),
  ('8627cb45-9c14-4891-8695-494bc4a61f1a', 'Jefferson Traditional Middle School',   'Ms. Rosa Caldwell',    'rcaldwell@jefferson.kyschools.us', '502-485-8302', NOW()),
  ('8e4ece5e-0163-4233-8113-7ff581429c0e', 'Doss High School',                      'Mr. Kevin Barnes',     'kbarnes@jefferson.kyschools.us',   '502-485-8260', NOW()),
  ('72e2ae2b-5e71-432f-8179-2114e6d841f8', 'Seneca High School',                    'Ms. Tanya Wilson',     'twilson@jefferson.kyschools.us',   '502-485-8298', NOW()),
  ('6b0bedaf-f9c9-44e9-b3ac-c3c10e80c005', 'DuPont Manual High School',             'Ms. Anne Fischer',     'afischer@jefferson.kyschools.us',  '502-485-8391', NOW())
ON CONFLICT (id) DO NOTHING;
