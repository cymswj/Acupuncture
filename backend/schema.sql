CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stage TEXT NOT NULL DEFAULT 'appointment_requested',
  source TEXT NOT NULL DEFAULT 'direct',
  medium TEXT,
  campaign TEXT,
  language TEXT NOT NULL DEFAULT 'ru',
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  preferred_date DATE,
  service TEXT NOT NULL,
  appointment_date DATE,
  visit_date DATE,
  followup_date DATE,
  value_cny NUMERIC(12,2),
  owner TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE TABLE IF NOT EXISTS funnel_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_name TEXT NOT NULL,
  path TEXT,
  language TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT
);
CREATE INDEX IF NOT EXISTS idx_funnel_events_name ON funnel_events(event_name);
CREATE INDEX IF NOT EXISTS idx_funnel_events_occurred_at ON funnel_events(occurred_at);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_username ON admin_sessions(username);
