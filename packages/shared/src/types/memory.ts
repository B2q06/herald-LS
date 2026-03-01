export interface KnowledgeItem {
  id: number;
  agent_name: string;
  section: string;
  title: string;
  content: string;
  content_hash: string;
  importance: number;
  last_reinforced_at: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmbeddingSource {
  id: number;
  agent_name: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  content_preview: string;
  created_at: string;
}

export interface Entity {
  id: number;
  name: string;
  entity_type: string;
  first_seen_by: string;
  mention_count: number;
  created_at: string;
  updated_at: string;
}

export interface EntityMention {
  id: number;
  entity_id: number;
  agent_name: string;
  source_type: string;
  source_id: string;
  context: string | null;
  created_at: string;
}

export interface ChunkedContent {
  text: string;
  index: number;
}
