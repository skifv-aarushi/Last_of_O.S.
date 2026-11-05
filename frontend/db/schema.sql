CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'waiting',          -- waiting | active | completed
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 4,
  round_duration_ms INTEGER NOT NULL DEFAULT 300000, -- 0 = admin advances rounds manually
  round_started_at INTEGER,
  global_health REAL NOT NULL DEFAULT 100,
  median_score REAL NOT NULL DEFAULT 0,
  host_uid TEXT NOT NULL,
  winner TEXT,
  announcement TEXT,
  created_at INTEGER NOT NULL,
  ended_at INTEGER
);

CREATE TABLE IF NOT EXISTS players (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'citizen',
  trust_score INTEGER NOT NULL DEFAULT 0,
  cooldown_until INTEGER,
  next_game_at INTEGER,
  ability_cooldown_until INTEGER,
  games_played TEXT NOT NULL DEFAULT '[]',
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, player_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT,
  problem_type TEXT,
  problem_id TEXT,
  score REAL NOT NULL,
  answer REAL,
  infection_level TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'pending',
  authority_id TEXT,
  health_change REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  processed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_certs_pending ON certificates(session_id, status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certs_problem ON certificates(session_id, problem_id);

CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  certificate_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT,
  authority_id TEXT NOT NULL,
  action TEXT NOT NULL,
  score REAL NOT NULL,
  was_infected INTEGER NOT NULL,
  health_change REAL NOT NULL,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_session ON ledger(session_id, timestamp);

-- Audit trail for cooldowns, admin actions, round changes, etc.
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,
  actor TEXT,
  target TEXT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, ts);
