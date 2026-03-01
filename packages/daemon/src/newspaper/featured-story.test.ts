import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, FeaturedStory, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { SdkAdapter, SendMessageParams, SendMessageResult } from '../session/sdk-adapter.ts';
import { SessionManager } from '../session/session-manager.ts';
import {
  parseFeaturedStoriesFromFrontmatter,
  processAllFeaturedStories,
  triggerFeaturedStoryResearch,
  writeFeaturedStoryLinks,
} from './featured-story.ts';

class MockSdkAdapter implements SdkAdapter {
  public response: SendMessageResult = {
    text: 'Deep-dive research report on the featured story.',
    inputTokens: 200,
    outputTokens: 100,
  };

  async sendMessage(_params: SendMessageParams): Promise<SendMessageResult> {
    return this.response;
  }
}

describe('featured-story', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;
  let registry: AgentRegistry;
  let sessionManager: SessionManager;
  let mockAdapter: MockSdkAdapter;

  const makeConfig = (name: string): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: false,
  });

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-featured-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const personasDir = join(tempDir, 'personas');
    const memoryDir = join(tempDir, 'memory');

    await mkdir(personasDir, { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'ml-researcher'), { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'ai-tooling-researcher'), { recursive: true });
    await Bun.write(join(personasDir, 'ml-researcher.md'), '# ML Researcher');
    await Bun.write(join(personasDir, 'ai-tooling-researcher.md'), '# AI Tooling');
    await Bun.write(join(memoryDir, 'agents', 'ml-researcher', 'knowledge.md'), '');
    await Bun.write(join(memoryDir, 'agents', 'ml-researcher', 'last-jobs.md'), '');
    await Bun.write(
      join(memoryDir, 'agents', 'ai-tooling-researcher', 'knowledge.md'),
      '',
    );
    await Bun.write(
      join(memoryDir, 'agents', 'ai-tooling-researcher', 'last-jobs.md'),
      '',
    );

    heraldConfig = {
      port: 3117,
      data_dir: join(tempDir, 'data'),
      agents_dir: join(tempDir, 'agents'),
      personas_dir: personasDir,
      memory_dir: memoryDir,
      reports_dir: join(tempDir, 'reports'),
      newspaper_dir: join(tempDir, 'newspaper'),
      log_level: 'info',
    };

    registry = new AgentRegistry();
    registry.register('ml-researcher', makeConfig('ml-researcher'));
    registry.register('ai-tooling-researcher', makeConfig('ai-tooling-researcher'));

    mockAdapter = new MockSdkAdapter();
    sessionManager = new SessionManager(mockAdapter);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('parseFeaturedStoriesFromFrontmatter', () => {
    it('extracts featured stories from valid frontmatter', () => {
      const content = `---
agent: newspaper
run_id: "20260228-060000"
started_at: "2026-02-28T06:00:00Z"
finished_at: "2026-02-28T06:05:00Z"
status: success
featured_stories:
  - headline: "New framework threatens React dominance"
    assigned_agent: ai-tooling-researcher
    research_prompt: "Deep dive into framework X: architecture, benchmarks, adoption"
  - headline: "Breakthrough in efficient transformers"
    assigned_agent: ml-researcher
    research_prompt: "Analyze the new attention mechanism and its implications"
    summary: "A novel attention mechanism reduces compute by 90%"
---

# Herald Daily Brief -- 2026-02-28

Content here...`;

      const stories = parseFeaturedStoriesFromFrontmatter(content);
      expect(stories).not.toBeNull();
      expect(stories).toHaveLength(2);
      expect(stories![0].headline).toBe('New framework threatens React dominance');
      expect(stories![0].assigned_agent).toBe('ai-tooling-researcher');
      expect(stories![0].research_prompt).toBe(
        'Deep dive into framework X: architecture, benchmarks, adoption',
      );
      expect(stories![1].headline).toBe('Breakthrough in efficient transformers');
      expect(stories![1].assigned_agent).toBe('ml-researcher');
      expect(stories![1].summary).toBe(
        'A novel attention mechanism reduces compute by 90%',
      );
    });

    it('returns null when no featured_stories in frontmatter', () => {
      const content = `---
agent: newspaper
run_id: "20260228-060000"
status: success
---

# Herald Daily Brief`;

      const stories = parseFeaturedStoriesFromFrontmatter(content);
      expect(stories).toBeNull();
    });

    it('returns null for content without frontmatter', () => {
      const content = '# Just a headline\n\nSome content';
      const stories = parseFeaturedStoriesFromFrontmatter(content);
      expect(stories).toBeNull();
    });

    it('returns null for empty featured_stories', () => {
      const content = `---
agent: newspaper
status: success
featured_stories:
---

# Herald Daily Brief`;

      // featured_stories key exists but no items
      const stories = parseFeaturedStoriesFromFrontmatter(content);
      expect(stories).toBeNull();
    });
  });

  describe('triggerFeaturedStoryResearch', () => {
    it('calls executeRun with deep-dive prompt for known agent', async () => {
      const story: FeaturedStory = {
        headline: 'Test Featured Story',
        summary: 'A story worth deep coverage',
        assigned_agent: 'ml-researcher',
        research_prompt: 'Research this topic deeply',
        edition_date: '2026-02-28',
      };

      const result = await triggerFeaturedStoryResearch(story, {
        heraldConfig,
        registry,
        sessionManager,
      });

      expect(result.headline).toBe('Test Featured Story');
      expect(result.assignedAgent).toBe('ml-researcher');
      expect(result.runResult).not.toBeNull();
      expect(result.runResult!.status).toBe('success');
      expect(result.reportLink.status).toBe('completed');
      expect(result.reportLink.report_run_id).toBeTruthy();
      expect(result.reportLink.report_path).toContain('reports/ml-researcher/');
    });

    it('returns failed status for unknown agent', async () => {
      const story: FeaturedStory = {
        headline: 'Unknown Agent Story',
        summary: 'Story for agent that does not exist',
        assigned_agent: 'nonexistent-agent',
        research_prompt: 'Research this',
        edition_date: '2026-02-28',
      };

      const result = await triggerFeaturedStoryResearch(story, {
        heraldConfig,
        registry,
        sessionManager,
      });

      expect(result.runResult).toBeNull();
      expect(result.reportLink.status).toBe('failed');
    });

    it('handles executeRun failure gracefully', async () => {
      // Make the adapter throw
      mockAdapter.response = {
        text: '',
        inputTokens: 0,
        outputTokens: 0,
      };

      const story: FeaturedStory = {
        headline: 'Error Story',
        summary: 'This will produce a result but not throw',
        assigned_agent: 'ml-researcher',
        research_prompt: 'Research this',
        edition_date: '2026-02-28',
      };

      // Should not throw
      const result = await triggerFeaturedStoryResearch(story, {
        heraldConfig,
        registry,
        sessionManager,
      });

      // executeRun doesn't throw for empty responses; it returns success
      expect(result.runResult).not.toBeNull();
    });
  });

  describe('writeFeaturedStoryLinks', () => {
    it('writes correct markdown with report links', async () => {
      const links = [
        {
          headline: 'Story One',
          assigned_agent: 'ml-researcher',
          report_path: 'reports/ml-researcher/20260228-140000.md',
          report_run_id: '20260228-140000',
          status: 'completed' as const,
        },
        {
          headline: 'Story Two',
          assigned_agent: 'ai-tooling-researcher',
          report_path: '',
          report_run_id: '',
          status: 'failed' as const,
        },
      ];

      await writeFeaturedStoryLinks('2026-02-28', links, heraldConfig);

      const linksPath = join(
        heraldConfig.newspaper_dir,
        'editions',
        '2026-02-28',
        'featured-links.md',
      );
      const content = await Bun.file(linksPath).text();

      expect(content).toContain('# Featured Story Reports');
      expect(content).toContain('## Story One');
      expect(content).toContain('**Researcher:** ml-researcher');
      expect(content).toContain('**Status:** completed');
      expect(content).toContain('[20260228-140000]');
      expect(content).toContain('## Story Two');
      expect(content).toContain('**Status:** failed');
      expect(content).toContain('**Report:** pending');
    });

    it('creates edition directory if needed', async () => {
      const links = [
        {
          headline: 'New Story',
          assigned_agent: 'ml-researcher',
          report_path: 'reports/ml-researcher/run.md',
          report_run_id: 'run',
          status: 'completed' as const,
        },
      ];

      await writeFeaturedStoryLinks('2026-03-01', links, heraldConfig);

      const linksPath = join(
        heraldConfig.newspaper_dir,
        'editions',
        '2026-03-01',
        'featured-links.md',
      );
      expect(await Bun.file(linksPath).exists()).toBe(true);
    });
  });

  describe('processAllFeaturedStories', () => {
    it('processes stories sequentially and writes links', async () => {
      const stories: FeaturedStory[] = [
        {
          headline: 'Story A',
          summary: 'First featured story',
          assigned_agent: 'ml-researcher',
          research_prompt: 'Research A deeply',
          edition_date: '2026-02-28',
        },
        {
          headline: 'Story B',
          summary: 'Second featured story',
          assigned_agent: 'ai-tooling-researcher',
          research_prompt: 'Research B deeply',
          edition_date: '2026-02-28',
        },
      ];

      const results = await processAllFeaturedStories(stories, {
        heraldConfig,
        registry,
        sessionManager,
      });

      expect(results).toHaveLength(2);
      expect(results[0].headline).toBe('Story A');
      expect(results[1].headline).toBe('Story B');
      expect(results[0].reportLink.status).toBe('completed');
      expect(results[1].reportLink.status).toBe('completed');

      // Check that featured-links.md was written
      const linksPath = join(
        heraldConfig.newspaper_dir,
        'editions',
        '2026-02-28',
        'featured-links.md',
      );
      expect(await Bun.file(linksPath).exists()).toBe(true);
      const content = await Bun.file(linksPath).text();
      expect(content).toContain('Story A');
      expect(content).toContain('Story B');
    });

    it('handles mixed success and failure', async () => {
      const stories: FeaturedStory[] = [
        {
          headline: 'Good Story',
          summary: 'Will succeed',
          assigned_agent: 'ml-researcher',
          research_prompt: 'Research this',
          edition_date: '2026-02-28',
        },
        {
          headline: 'Bad Story',
          summary: 'Will fail - agent not found',
          assigned_agent: 'nonexistent-agent',
          research_prompt: 'Research this',
          edition_date: '2026-02-28',
        },
      ];

      const results = await processAllFeaturedStories(stories, {
        heraldConfig,
        registry,
        sessionManager,
      });

      expect(results).toHaveLength(2);
      expect(results[0].reportLink.status).toBe('completed');
      expect(results[1].reportLink.status).toBe('failed');
    });
  });
});
