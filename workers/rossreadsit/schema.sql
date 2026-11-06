CREATE TABLE IF NOT EXISTS users (
  library TEXT PRIMARY KEY,      -- secret, held by the browser
  email TEXT,
  daily_limit INTEGER,           -- set only for the owner, who never has to pay
  paid_until TEXT,               -- ISO time their paid year ends
  checkout_session TEXT,         -- Stripe Checkout session not yet finished
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS feeds (
  token TEXT PRIMARY KEY,        -- public: it is in the feed URL
  library TEXT,                  -- NULL until a pre-existing feed is claimed
  title TEXT NOT NULL,
  cover_key TEXT,                -- this feed's own art in R2; drawn by the page with its title
  cover_title TEXT,              -- the title that art shows, so a rename can redraw it
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
  day TEXT NOT NULL,             -- or 'forever', for free reading, which is once per library
  subject TEXT NOT NULL,         -- 'all', hashed IP, or library, per kind of use
  amount INTEGER NOT NULL,
  PRIMARY KEY (day, subject)
);
