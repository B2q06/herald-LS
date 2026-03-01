CREATE TABLE IF NOT EXISTS knowledge_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  importance REAL NOT NULL DEFAULT 1.0,
  last_reinforced_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(agent_name, section, title)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_agent ON knowledge_items(agent_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_importance ON knowledge_items(importance);
CREATE INDEX IF NOT EXISTS idx_knowledge_archived ON knowledge_items(archived_at);
