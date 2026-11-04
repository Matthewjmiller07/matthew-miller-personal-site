CREATE TABLE IF NOT EXISTS users (
  library TEXT PRIMARY KEY,      -- secret, held by the browser
  email TEXT,
  daily_limit INTEGER,           -- set only for the owner; exempts from the shared budget
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS feeds (
  token TEXT PRIMARY KEY,        -- public: it is in the feed URL
  library TEXT,                  -- NULL until a pre-existing feed is claimed
  title TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS feeds_library ON feeds(library);
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_token TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  duration INTEGER,
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS episodes_feed ON episodes(feed_token);
CREATE TABLE IF NOT EXISTS usage (
  day TEXT NOT NULL,
  subject TEXT NOT NULL,         -- 'all', hashed IP, or library, per kind of use
  amount INTEGER NOT NULL,
  PRIMARY KEY (day, subject)
);
