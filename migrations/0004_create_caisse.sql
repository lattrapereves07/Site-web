-- Comptages de caisse (saisie par staff ou propriétaire)
CREATE TABLE IF NOT EXISTS caisse_comptages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caisse TEXT NOT NULL CHECK(caisse IN ('A', 'B')),
  comptage_date TEXT NOT NULL,   -- YYYY-MM-DD
  comptage_heure TEXT NOT NULL,  -- HH:MM
  billet_500 INTEGER NOT NULL DEFAULT 0,
  billet_200 INTEGER NOT NULL DEFAULT 0,
  billet_100 INTEGER NOT NULL DEFAULT 0,
  billet_50  INTEGER NOT NULL DEFAULT 0,
  billet_20  INTEGER NOT NULL DEFAULT 0,
  billet_10  INTEGER NOT NULL DEFAULT 0,
  billet_5   INTEGER NOT NULL DEFAULT 0,
  piece_200  INTEGER NOT NULL DEFAULT 0,
  piece_100  INTEGER NOT NULL DEFAULT 0,
  piece_050  INTEGER NOT NULL DEFAULT 0,
  piece_020  INTEGER NOT NULL DEFAULT 0,
  piece_010  INTEGER NOT NULL DEFAULT 0,
  piece_005  INTEGER NOT NULL DEFAULT 0,
  piece_002  INTEGER NOT NULL DEFAULT 0,
  piece_001  INTEGER NOT NULL DEFAULT 0,
  total_centimes INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Retraits et dépôts banque (accès propriétaire uniquement)
CREATE TABLE IF NOT EXISTS caisse_retraits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caisse TEXT NOT NULL CHECK(caisse IN ('A', 'B')),
  montant_centimes INTEGER NOT NULL,
  note TEXT,
  depose_banque INTEGER NOT NULL DEFAULT 0,
  depose_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
