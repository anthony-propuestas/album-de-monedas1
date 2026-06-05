CREATE TABLE IF NOT EXISTS chat_messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT    NOT NULL,
  user_name    TEXT    NOT NULL,
  user_picture TEXT,
  message      TEXT    NOT NULL CHECK(length(message) <= 500),
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
