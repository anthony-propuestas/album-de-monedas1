CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_badges_user ON user_badges(user_id);
