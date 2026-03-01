CREATE TABLE IF NOT EXISTS embedding_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content_preview TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(agent_name, source_type, source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_embedding_agent ON embedding_sources(agent_name);
CREATE INDEX IF NOT EXISTS idx_embedding_source ON embedding_sources(source_type, source_id);
