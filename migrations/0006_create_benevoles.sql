-- Bénévoles : événements pouvant faire appel à des bénévoles, postes et inscriptions

ALTER TABLE events ADD COLUMN benevoles_actif INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN benevole_referent_nom TEXT;
ALTER TABLE events ADD COLUMN benevole_referent_contact TEXT;
ALTER TABLE events ADD COLUMN benevole_info TEXT;

CREATE INDEX IF NOT EXISTS idx_events_benevoles ON events(benevoles_actif);

CREATE TABLE IF NOT EXISTS benevole_postes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  heure_debut TEXT,
  heure_fin TEXT,
  places INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_benevole_postes_event ON benevole_postes(event_id);

CREATE TABLE IF NOT EXISTS benevole_inscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poste_id INTEGER NOT NULL REFERENCES benevole_postes(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  remarque TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_benevole_inscriptions_poste ON benevole_inscriptions(poste_id);
