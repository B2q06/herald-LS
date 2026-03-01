CREATE VIRTUAL TABLE IF NOT EXISTS fts_content USING fts5(
  agent_name,
  source_type,
  source_id,
  title,
  content,
  tokenize = 'porter'
);
