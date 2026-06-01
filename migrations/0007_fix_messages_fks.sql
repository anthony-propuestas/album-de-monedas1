PRAGMA foreign_keys = OFF;

ALTER TABLE messages RENAME TO messages_old;

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  coin_id TEXT NOT NULL REFERENCES coins(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_contact TEXT,
  message TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  read_at INTEGER
);

-- Solo migra mensajes cuya moneda y usuarios aún existen
INSERT INTO messages
  SELECT * FROM messages_old
  WHERE coin_id IN (SELECT id FROM coins)
    AND seller_id IN (SELECT id FROM users)
    AND buyer_id IN (SELECT id FROM users);

DROP TABLE messages_old;

CREATE INDEX idx_messages_seller ON messages(seller_id, created_at DESC);
CREATE INDEX idx_messages_buyer ON messages(buyer_id);

PRAGMA foreign_keys = ON;
