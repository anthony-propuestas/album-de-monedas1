CREATE TABLE IF NOT EXISTS claim_requests (
  id               TEXT    PRIMARY KEY,
  user_id          TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin_id          TEXT    NOT NULL REFERENCES coins(id) ON DELETE CASCADE,
  coin_registry_key TEXT   NOT NULL,
  coin_id_hash     TEXT    NOT NULL,
  wallet_address   TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'pending',
  reviewed_at      INTEGER,
  approved_at      INTEGER,
  expires_at       INTEGER,
  reject_reason    TEXT,
  tx_hash          TEXT,
  claimed_at       INTEGER,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_claim_requests_user   ON claim_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_coin   ON claim_requests(coin_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);
