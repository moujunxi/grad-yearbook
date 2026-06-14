CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT,
  class_name TEXT,
  avatar_path TEXT,
  wechat TEXT,
  qq TEXT,
  phone TEXT,
  email TEXT,
  bio TEXT,
  motto TEXT,
  future TEXT,
  favorite_tags TEXT,
  custom_answers TEXT,
  label TEXT,
  bg_theme TEXT,
  signature TEXT,
  identity_code TEXT,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS secret_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER REFERENCES entries(id),
  content TEXT
);

CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS identity_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  blessing_message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 预置默认站点配置
INSERT OR IGNORE INTO site_config (key, value) VALUES ('site_open', '1');
INSERT OR IGNORE INTO site_config (key, value) VALUES ('custom_questions', '[]');
