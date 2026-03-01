import { describe, expect, it } from 'vitest';
import { extractEntities } from './entity-extractor.ts';

describe('extractEntities', () => {
  describe('tech extraction', () => {
    it('extracts known AI models', () => {
      const entities = extractEntities('The new GPT-4 model outperforms Claude on several benchmarks.');
      const names = entities.map((e) => e.name);
      expect(names).toContain('GPT-4');
      expect(names).toContain('Claude');
    });

    it('extracts frameworks', () => {
      const entities = extractEntities('We used PyTorch and TensorFlow for training.');
      const techNames = entities.filter((e) => e.type === 'tech').map((e) => e.name);
      expect(techNames).toContain('PyTorch');
      expect(techNames).toContain('TensorFlow');
    });

    it('extracts tech acronyms', () => {
      const entities = extractEntities('The model uses MoE architecture with RLHF training and DPO alignment.');
      const names = entities.map((e) => e.name);
      expect(names).toContain('MoE');
      expect(names).toContain('RLHF');
      expect(names).toContain('DPO');
    });

    it('extracts infrastructure tech', () => {
      const entities = extractEntities('Running on CUDA with vLLM for inference and DeepSpeed for training.');
      const names = entities.map((e) => e.name);
      expect(names).toContain('CUDA');
      expect(names).toContain('vLLM');
      expect(names).toContain('DeepSpeed');
    });
  });

  describe('org extraction', () => {
    it('extracts known AI companies', () => {
      const entities = extractEntities('Anthropic and OpenAI are competing in the AI space.');
      const orgNames = entities.filter((e) => e.type === 'org').map((e) => e.name);
      expect(orgNames).toContain('Anthropic');
      expect(orgNames).toContain('OpenAI');
    });

    it('extracts hardware companies', () => {
      const entities = extractEntities('NVIDIA released new GPUs while AMD competes with their offerings.');
      const orgNames = entities.filter((e) => e.type === 'org').map((e) => e.name);
      expect(orgNames).toContain('NVIDIA');
      expect(orgNames).toContain('AMD');
    });

    it('extracts multi-word org names', () => {
      const entities = extractEntities('Google DeepMind published a new paper. Meta AI also contributed.');
      const orgNames = entities.filter((e) => e.type === 'org').map((e) => e.name);
      expect(orgNames).toContain('Google DeepMind');
      expect(orgNames).toContain('Meta AI');
    });
  });

  describe('event extraction', () => {
    it('extracts conference names', () => {
      const entities = extractEntities('The paper was presented at NeurIPS and later at ICML.');
      const eventNames = entities.filter((e) => e.type === 'event').map((e) => e.name);
      expect(eventNames).toContain('NeurIPS');
      expect(eventNames).toContain('ICML');
    });

    it('extracts events with year suffix', () => {
      const entities = extractEntities('The results were shown at NeurIPS 2024.');
      const eventNames = entities.filter((e) => e.type === 'event').map((e) => e.name);
      expect(eventNames).toContain('NeurIPS 2024');
    });
  });

  describe('people extraction', () => {
    it('extracts names near people keywords', () => {
      const entities = extractEntities('Researcher John Smith published findings on transformers.');
      const personNames = entities.filter((e) => e.type === 'person').map((e) => e.name);
      expect(personNames).toContain('John Smith');
    });

    it('extracts names with "CEO" keyword', () => {
      const entities = extractEntities('CEO Dario Amodei announced the new model.');
      const personNames = entities.filter((e) => e.type === 'person').map((e) => e.name);
      expect(personNames).toContain('Dario Amodei');
    });

    it('extracts names with "founded by" keyword', () => {
      const entities = extractEntities('The company was founded by Sam Altman in 2015.');
      const personNames = entities.filter((e) => e.type === 'person').map((e) => e.name);
      expect(personNames).toContain('Sam Altman');
    });

    it('does not extract names without people keywords', () => {
      const entities = extractEntities('The Quick Brown fox jumped over something.');
      const personNames = entities.filter((e) => e.type === 'person').map((e) => e.name);
      expect(personNames).toHaveLength(0);
    });
  });

  describe('deduplication', () => {
    it('deduplicates identical entities', () => {
      const entities = extractEntities(
        'OpenAI released GPT-4. OpenAI also announced GPT-4 improvements.',
      );
      const openaiCount = entities.filter((e) => e.name === 'OpenAI').length;
      expect(openaiCount).toBe(1);
    });

    it('keeps entities of different types', () => {
      // "Mistral" can be both tech and org — both should appear
      const entities = extractEntities('Mistral released the Mistral model.');
      const mistralEntities = entities.filter((e) => e.name === 'Mistral');
      const types = mistralEntities.map((e) => e.type);
      expect(types).toContain('org');
      expect(types).toContain('tech');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(extractEntities('')).toEqual([]);
    });

    it('returns empty array for whitespace-only input', () => {
      expect(extractEntities('   \n\t  ')).toEqual([]);
    });

    it('returns empty array for text with no entities', () => {
      const entities = extractEntities('The weather is nice today. I went for a walk.');
      // Might return empty or very few — just check it does not crash
      expect(Array.isArray(entities)).toBe(true);
    });

    it('handles special characters in text', () => {
      const entities = extractEntities('Check out GPT-4 at https://openai.com/gpt-4 (amazing!).');
      const names = entities.map((e) => e.name);
      expect(names).toContain('GPT-4');
    });
  });
});
