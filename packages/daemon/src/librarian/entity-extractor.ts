export interface ExtractedEntity {
  name: string;
  type: 'person' | 'org' | 'tech' | 'event';
}

// Known tech companies / labs / orgs
const KNOWN_ORGS = new Set([
  'Anthropic',
  'OpenAI',
  'DeepMind',
  'Google DeepMind',
  'Meta AI',
  'Meta',
  'Microsoft',
  'Google',
  'Apple',
  'Amazon',
  'NVIDIA',
  'AMD',
  'Intel',
  'IBM',
  'Hugging Face',
  'Stability AI',
  'Cohere',
  'Mistral AI',
  'Mistral',
  'xAI',
  'Inflection AI',
  'Adept',
  'Character AI',
  'Midjourney',
  'Runway',
  'Scale AI',
  'Databricks',
  'Mosaic ML',
  'Together AI',
  'Anyscale',
  'Perplexity',
  'Perplexity AI',
  'Groq',
  'Cerebras',
  'SambaNova',
  'Aleph Alpha',
  'AI21 Labs',
  'Baidu',
  'Tencent',
  'Alibaba',
  'ByteDance',
]);

// Known AI models and tech terms
const KNOWN_TECH = new Set([
  'GPT-4',
  'GPT-4o',
  'GPT-3',
  'GPT-3.5',
  'GPT-5',
  'ChatGPT',
  'Claude',
  'Claude 3',
  'Claude 3.5',
  'Gemini',
  'Gemini Pro',
  'Gemini Ultra',
  'Llama',
  'Llama 2',
  'Llama 3',
  'Mistral',
  'Mixtral',
  'DALL-E',
  'Stable Diffusion',
  'Midjourney',
  'Whisper',
  'Codex',
  'PaLM',
  'PaLM 2',
  'Phi-3',
  'Falcon',
  'Qwen',
  'Command R',
  'PyTorch',
  'TensorFlow',
  'JAX',
  'Keras',
  'Triton',
  'CUDA',
  'ROCm',
  'ONNX',
  'TensorRT',
  'vLLM',
  'DeepSpeed',
  'Megatron',
  'FlashAttention',
  'LoRA',
  'QLoRA',
  'RLHF',
  'DPO',
  'GGUF',
  'GPTQ',
  'AWQ',
  'LangChain',
  'LlamaIndex',
  'Hugging Face',
  'Transformers',
  'Diffusers',
  'Safetensors',
  'MLflow',
  'Weights & Biases',
  'Ray',
  'Kubernetes',
  'Docker',
  'Slurm',
]);

// Known conference / event patterns
const KNOWN_EVENTS = new Set([
  'NeurIPS',
  'ICML',
  'ICLR',
  'AAAI',
  'CVPR',
  'ECCV',
  'ICCV',
  'ACL',
  'EMNLP',
  'NAACL',
  'SIGIR',
  'KDD',
  'WWW',
  'SIGGRAPH',
  'CoRL',
  'RSS',
  'ICRA',
]);

// Acronyms that are meaningful in AI/ML context (match only uppercase)
const TECH_ACRONYMS = new Set([
  'MoE',
  'MCP',
  'TTT',
  'RAG',
  'CoT',
  'RLHF',
  'DPO',
  'PPO',
  'SFT',
  'ICL',
  'KV',
  'MHA',
  'GQA',
  'MQA',
  'RoPE',
  'ALiBi',
  'SSM',
  'RWKV',
  'FP8',
  'INT8',
  'INT4',
  'BF16',
  'FP16',
  'TPU',
  'GPU',
  'LLM',
  'VLM',
  'SLM',
  'AGI',
  'ASI',
  'SOTA',
  'API',
  'SDK',
  'CLI',
  'FTS',
]);

// People-indicating keywords (must appear near a Name Surname pattern)
const PEOPLE_KEYWORDS =
  /\b(?:researcher|professor|ceo|cto|founder|co-founder|cofounder|chief|director|scientist|engineer|lead|head|vp|president|author|created by|founded by|developed by|proposed by|introduced by|led by|dr\.?|prof\.?)\b/i;

// Words that should not be treated as part of a person's name
const PEOPLE_KEYWORD_WORDS = new Set([
  'researcher', 'professor', 'ceo', 'cto', 'founder', 'cofounder',
  'chief', 'director', 'scientist', 'engineer', 'lead', 'head',
  'vp', 'president', 'author',
]);

/**
 * Extract entities from text using heuristic regex patterns.
 * Prioritizes precision over recall — false negatives are acceptable,
 * false positives should be minimized.
 */
export function extractEntities(text: string): ExtractedEntity[] {
  if (!text || text.trim().length === 0) return [];

  const seen = new Map<string, ExtractedEntity>();

  const addEntity = (name: string, type: ExtractedEntity['type']) => {
    const key = `${name.toLowerCase()}::${type}`;
    if (!seen.has(key)) {
      seen.set(key, { name, type });
    }
  };

  // Extract known orgs (case-insensitive matching but preserve original casing from set)
  for (const org of KNOWN_ORGS) {
    const escaped = org.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    if (re.test(text)) {
      addEntity(org, 'org');
    }
  }

  // Extract known tech terms
  for (const tech of KNOWN_TECH) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    if (re.test(text)) {
      addEntity(tech, 'tech');
    }
  }

  // Extract known events
  for (const event of KNOWN_EVENTS) {
    const escaped = event.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Events often have year suffix: NeurIPS 2024, ICML 2025
    const re = new RegExp(`\\b${escaped}(?:\\s+\\d{4})?\\b`, 'i');
    const match = text.match(re);
    if (match) {
      addEntity(match[0], 'event');
    }
  }

  // Extract tech acronyms (case-sensitive for precision)
  for (const acronym of TECH_ACRONYMS) {
    const escaped = acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`);
    if (re.test(text)) {
      addEntity(acronym, 'tech');
    }
  }

  // Extract people: "Name Surname" near people-indicating keywords
  // Look for capitalized two-word names within ~100 chars of a keyword
  const sentences = text.split(/[.!?\n]+/);
  for (const sentence of sentences) {
    if (!PEOPLE_KEYWORDS.test(sentence)) continue;

    // Match "Firstname Lastname" patterns (two capitalized words)
    const namePattern = /\b([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})\b/g;
    let nameMatch: RegExpExecArray | null;
    while ((nameMatch = namePattern.exec(sentence)) !== null) {
      const firstName = nameMatch[1];
      const lastName = nameMatch[2];
      const fullName = `${firstName} ${lastName}`;
      // Skip if either word is a people-indicating keyword
      if (PEOPLE_KEYWORD_WORDS.has(firstName.toLowerCase())) {
        // Reset to try matching from the second word onwards
        namePattern.lastIndex = nameMatch.index + firstName.length;
        continue;
      }
      if (PEOPLE_KEYWORD_WORDS.has(lastName.toLowerCase())) continue;
      // Skip common false positives (sentence starters, tech terms etc.)
      const skipPatterns = /^(The |This |That |These |Those |Some |Many |Most |Each |Every |Such |Open AI|Deep Mind|Meta AI|Stable Diffusion)/;
      if (!skipPatterns.test(fullName)) {
        addEntity(fullName, 'person');
      }
    }
  }

  return Array.from(seen.values());
}
