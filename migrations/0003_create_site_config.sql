-- Table de configuration du statut du site (bandeau météo / fermetures)
CREATE TABLE IF NOT EXISTS site_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'open',
  dates_fermeture TEXT NOT NULL DEFAULT '[]',
  date_ouverture_speciale TEXT NOT NULL DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Ligne unique, insérée seulement si elle n'existe pas
INSERT OR IGNORE INTO site_config (id, statut, dates_fermeture, date_ouverture_speciale)
VALUES (1, 'open', '[]', '');
