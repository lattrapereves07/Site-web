CREATE TABLE IF NOT EXISTS cercle_animo_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  day_of_week INTEGER NOT NULL DEFAULT 1,
  time TEXT,
  activity_type TEXT NOT NULL DEFAULT 'Nourrissage',
  description TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  volunteer_name TEXT,
  volunteers TEXT NOT NULL DEFAULT '[]',
  is_urgent_when_free INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cercle_animo_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT (datetime('now')),
  action_type TEXT NOT NULL,
  actor_name TEXT,
  slot_id INTEGER,
  slot_date TEXT,
  slot_activity TEXT,
  details TEXT
);
