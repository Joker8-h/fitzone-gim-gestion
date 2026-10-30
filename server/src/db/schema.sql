PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  document_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  registration_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
  status TEXT NOT NULL DEFAULT 'ACTIVO',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS membership_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price REAL NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS client_memberships (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES membership_plans(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'VIGENTE',
  price_paid REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  membership_id TEXT REFERENCES client_memberships(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS attendances (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  check_in_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  was_overridden INTEGER NOT NULL DEFAULT 0,
  override_reason TEXT,
  registered_by TEXT
);

CREATE TABLE IF NOT EXISTS financial_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category_id TEXT REFERENCES financial_categories(id),
  concept TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
  payment_id TEXT UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  registered_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  specialty TEXT,
  phone TEXT NOT NULL,
  salary REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVO',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS gym_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  instructor_name TEXT NOT NULL,
  schedule_time TEXT NOT NULL,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 20,
  color_theme TEXT NOT NULL DEFAULT 'emerald',
  status TEXT NOT NULL DEFAULT 'PROGRAMADA',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS gym_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  day_num TEXT NOT NULL,
  month_short TEXT NOT NULL,
  time_range TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Disponible',
  last_maintenance TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS tracking_rules (
  id TEXT PRIMARY KEY,
  rule_type TEXT UNIQUE NOT NULL,
  threshold_days INTEGER NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  message_template TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS communication_logs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT',
  sent_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  response_info TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  performed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
