-- Fond de caisse, chèques vacances/chèques, et rapprochement Square
ALTER TABLE caisse_comptages ADD COLUMN fond_caisse_centimes INTEGER NOT NULL DEFAULT 20000;
ALTER TABLE caisse_comptages ADD COLUMN cheques_vacances_centimes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE caisse_comptages ADD COLUMN cheques_centimes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE caisse_comptages ADD COLUMN square_cash_centimes INTEGER;
ALTER TABLE caisse_comptages ADD COLUMN square_card_centimes INTEGER;
ALTER TABLE caisse_comptages ADD COLUMN ecart_centimes INTEGER;

-- Type de retrait : espèces (banque) ou chèques vacances (ANCV)
ALTER TABLE caisse_retraits ADD COLUMN type TEXT NOT NULL DEFAULT 'retrait';
