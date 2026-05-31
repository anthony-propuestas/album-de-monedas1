CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  coin_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_contact TEXT,
  message TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  read_at INTEGER
);

CREATE INDEX idx_messages_seller ON messages(seller_id, created_at DESC);
CREATE INDEX idx_messages_buyer ON messages(buyer_id);
