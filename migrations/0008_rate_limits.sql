CREATE TABLE IF NOT EXISTS rate_limits (
  user_id      TEXT    NOT NULL,
  action       TEXT    NOT NULL,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, action, window_start)
);
