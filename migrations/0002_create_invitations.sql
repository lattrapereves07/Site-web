CREATE TABLE IF NOT EXISTS invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom_prenom TEXT NOT NULL,
  type_invitation TEXT NOT NULL,
  present INTEGER NOT NULL DEFAULT 1,
  nb_adultes INTEGER,
  nb_enfants INTEGER,
  repas_json TEXT,
  message TEXT,
  submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invitations_type ON invitations(type_invitation);
CREATE INDEX IF NOT EXISTS idx_invitations_present ON invitations(present);
CREATE INDEX IF NOT EXISTS idx_invitations_date ON invitations(submitted_at);
