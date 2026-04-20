CREATE TABLE IF NOT EXISTS coins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT,
  year INTEGER,
  denomination TEXT,
  condition TEXT,
  mint TEXT,
  catalog_ref TEXT,
  estimated_value REAL,
  notes TEXT,
  photo_obverse TEXT,
  photo_reverse TEXT,
  photo_edge TEXT,
  photo_detail TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_coins_user ON coins(user_id);
CREATE INDEX IF NOT EXISTS idx_coins_country ON coins(user_id, country);
CREATE INDEX IF NOT EXISTS idx_coins_year ON coins(user_id, year);
