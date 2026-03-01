import { describe, expect, it } from 'vitest';

import { parseKeypress, applyAction, type InputState, type DashboardAction } from './input.ts';

// ── parseKeypress Tests ────────────────────────────────────────

describe('parseKeypress', () => {
  it('maps "q" to quit', () => {
    const action = parseKeypress(Buffer.from('q'));
    expect(action.type).toBe('quit');
  });

  it('maps "Q" to quit', () => {
    const action = parseKeypress(Buffer.from('Q'));
    expect(action.type).toBe('quit');
  });

  it('maps Ctrl+C (0x03) to quit', () => {
    const action = parseKeypress(Buffer.from([0x03]));
    expect(action.type).toBe('quit');
  });

  it('maps Tab (0x09) to switchPanel', () => {
    const action = parseKeypress(Buffer.from([0x09]));
    expect(action.type).toBe('switchPanel');
  });

  it('maps Enter (0x0D) to select', () => {
    const action = parseKeypress(Buffer.from([0x0d]));
    expect(action.type).toBe('select');
  });

  it('maps "j" to moveDown', () => {
    const action = parseKeypress(Buffer.from('j'));
    expect(action.type).toBe('moveDown');
  });

  it('maps "k" to moveUp', () => {
    const action = parseKeypress(Buffer.from('k'));
    expect(action.type).toBe('moveUp');
  });

  it('maps "r" to refresh', () => {
    const action = parseKeypress(Buffer.from('r'));
    expect(action.type).toBe('refresh');
  });

  it('maps "R" to refresh', () => {
    const action = parseKeypress(Buffer.from('R'));
    expect(action.type).toBe('refresh');
  });

  it('maps "?" to help', () => {
    const action = parseKeypress(Buffer.from('?'));
    expect(action.type).toBe('help');
  });

  it('maps Up arrow escape sequence to moveUp', () => {
    const action = parseKeypress(Buffer.from([0x1b, 0x5b, 0x41]));
    expect(action.type).toBe('moveUp');
  });

  it('maps Down arrow escape sequence to moveDown', () => {
    const action = parseKeypress(Buffer.from([0x1b, 0x5b, 0x42]));
    expect(action.type).toBe('moveDown');
  });

  it('returns unknown for unrecognized keys', () => {
    const action = parseKeypress(Buffer.from('x'));
    expect(action.type).toBe('unknown');
  });

  it('returns unknown for empty buffer', () => {
    const action = parseKeypress(Buffer.from([]));
    expect(action.type).toBe('unknown');
  });

  it('returns unknown for unrecognized escape sequences', () => {
    // Right arrow (0x43) is not mapped
    const action = parseKeypress(Buffer.from([0x1b, 0x5b, 0x43]));
    expect(action.type).toBe('unknown');
  });

  it('maps bare Esc (0x1b) to back', () => {
    const action = parseKeypress(Buffer.from([0x1b]));
    expect(action.type).toBe('back');
  });

  it('maps "s" to schedule', () => {
    const action = parseKeypress(Buffer.from('s'));
    expect(action.type).toBe('schedule');
  });

  it('maps "S" to schedule', () => {
    const action = parseKeypress(Buffer.from('S'));
    expect(action.type).toBe('schedule');
  });
});

// ── applyAction Tests ──────────────────────────────────────────

describe('applyAction', () => {
  function makeInputState(overrides: Partial<InputState> = {}): InputState {
    return {
      selectedPanel: 'agents',
      selectedAgentIndex: 0,
      newspaperScrollOffset: 0,
      agentCount: 5,
      newspaperLineCount: 50,
      bodyHeight: 20,
      showHelp: false,
      view: 'main',
      selectedAgentName: null,
      selectedScheduleIndex: 0,
      scheduleCount: 0,
      ...overrides,
    };
  }

  describe('switchPanel', () => {
    it('switches from agents to newspaper', () => {
      const state = makeInputState({ selectedPanel: 'agents' });
      const next = applyAction(state, { type: 'switchPanel' });
      expect(next.selectedPanel).toBe('newspaper');
    });

    it('switches from newspaper to agents', () => {
      const state = makeInputState({ selectedPanel: 'newspaper' });
      const next = applyAction(state, { type: 'switchPanel' });
      expect(next.selectedPanel).toBe('agents');
    });
  });

  describe('moveDown in agents panel', () => {
    it('increments selectedAgentIndex', () => {
      const state = makeInputState({ selectedPanel: 'agents', selectedAgentIndex: 1 });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.selectedAgentIndex).toBe(2);
    });

    it('clamps at the last agent', () => {
      const state = makeInputState({ selectedPanel: 'agents', selectedAgentIndex: 4, agentCount: 5 });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.selectedAgentIndex).toBe(4);
    });

    it('handles zero agents gracefully', () => {
      const state = makeInputState({ selectedPanel: 'agents', selectedAgentIndex: 0, agentCount: 0 });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.selectedAgentIndex).toBe(0);
    });
  });

  describe('moveUp in agents panel', () => {
    it('decrements selectedAgentIndex', () => {
      const state = makeInputState({ selectedPanel: 'agents', selectedAgentIndex: 3 });
      const next = applyAction(state, { type: 'moveUp' });
      expect(next.selectedAgentIndex).toBe(2);
    });

    it('clamps at zero', () => {
      const state = makeInputState({ selectedPanel: 'agents', selectedAgentIndex: 0 });
      const next = applyAction(state, { type: 'moveUp' });
      expect(next.selectedAgentIndex).toBe(0);
    });
  });

  describe('moveDown in newspaper panel', () => {
    it('increments scroll offset', () => {
      const state = makeInputState({
        selectedPanel: 'newspaper',
        newspaperScrollOffset: 5,
        newspaperLineCount: 50,
        bodyHeight: 20,
      });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.newspaperScrollOffset).toBe(6);
    });

    it('clamps at max scroll position', () => {
      // maxScroll = max(0, 50 - 20 + 3) = 33
      const state = makeInputState({
        selectedPanel: 'newspaper',
        newspaperScrollOffset: 33,
        newspaperLineCount: 50,
        bodyHeight: 20,
      });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.newspaperScrollOffset).toBe(33);
    });
  });

  describe('moveUp in newspaper panel', () => {
    it('decrements scroll offset', () => {
      const state = makeInputState({
        selectedPanel: 'newspaper',
        newspaperScrollOffset: 10,
      });
      const next = applyAction(state, { type: 'moveUp' });
      expect(next.newspaperScrollOffset).toBe(9);
    });

    it('clamps at zero', () => {
      const state = makeInputState({
        selectedPanel: 'newspaper',
        newspaperScrollOffset: 0,
      });
      const next = applyAction(state, { type: 'moveUp' });
      expect(next.newspaperScrollOffset).toBe(0);
    });
  });

  describe('help toggle', () => {
    it('toggles help on', () => {
      const state = makeInputState({ showHelp: false });
      const next = applyAction(state, { type: 'help' });
      expect(next.showHelp).toBe(true);
    });

    it('toggles help off', () => {
      const state = makeInputState({ showHelp: true });
      const next = applyAction(state, { type: 'help' });
      expect(next.showHelp).toBe(false);
    });
  });

  describe('help overlay dismissal', () => {
    it('any non-help, non-quit action dismisses help overlay', () => {
      const state = makeInputState({ showHelp: true });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.showHelp).toBe(false);
      // Should NOT also perform the move action
      expect(next.selectedAgentIndex).toBe(state.selectedAgentIndex);
    });

    it('unknown key dismisses help overlay', () => {
      const state = makeInputState({ showHelp: true });
      const next = applyAction(state, { type: 'unknown' });
      expect(next.showHelp).toBe(false);
    });

    it('quit action passes through when help is showing', () => {
      const state = makeInputState({ showHelp: true });
      // quit should NOT be swallowed by the help dismissal guard
      const next = applyAction(state, { type: 'quit' });
      // The help overlay should still be showing (quit is handled by caller)
      expect(next.showHelp).toBe(true);
    });
  });

  describe('passthrough actions', () => {
    it('quit does not modify state', () => {
      const state = makeInputState();
      const next = applyAction(state, { type: 'quit' });
      expect(next.selectedPanel).toBe(state.selectedPanel);
      expect(next.selectedAgentIndex).toBe(state.selectedAgentIndex);
    });

    it('refresh does not modify state', () => {
      const state = makeInputState();
      const next = applyAction(state, { type: 'refresh' });
      expect(next.selectedPanel).toBe(state.selectedPanel);
    });
  });

  // ── Story 5.3: Agent Drill-In View ────────────────────────

  describe('select action (agent drill-in)', () => {
    it('switches to agent-detail view when agents panel is active and has agents', () => {
      const state = makeInputState({
        selectedPanel: 'agents',
        agentCount: 3,
        selectedAgentIndex: 1,
      });
      const next = applyAction(state, { type: 'select' });
      expect(next.view).toBe('agent-detail');
    });

    it('does not switch to agent-detail when agents panel has no agents', () => {
      const state = makeInputState({
        selectedPanel: 'agents',
        agentCount: 0,
      });
      const next = applyAction(state, { type: 'select' });
      expect(next.view).toBe('main');
    });

    it('does not switch to agent-detail when newspaper panel is active', () => {
      const state = makeInputState({
        selectedPanel: 'newspaper',
        agentCount: 3,
      });
      const next = applyAction(state, { type: 'select' });
      expect(next.view).toBe('main');
    });
  });

  describe('agent-detail view navigation', () => {
    it('back action returns to main view', () => {
      const state = makeInputState({
        view: 'agent-detail',
        selectedAgentName: 'scout',
      });
      const next = applyAction(state, { type: 'back' });
      expect(next.view).toBe('main');
      expect(next.selectedAgentName).toBeNull();
    });

    it('help toggles in agent-detail view', () => {
      const state = makeInputState({
        view: 'agent-detail',
        showHelp: false,
      });
      const next = applyAction(state, { type: 'help' });
      expect(next.showHelp).toBe(true);
    });

    it('moveDown is a no-op in agent-detail view', () => {
      const state = makeInputState({
        view: 'agent-detail',
        selectedAgentIndex: 0,
      });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.selectedAgentIndex).toBe(0);
      expect(next.view).toBe('agent-detail');
    });

    it('switchPanel is a no-op in agent-detail view', () => {
      const state = makeInputState({
        view: 'agent-detail',
        selectedPanel: 'agents',
      });
      const next = applyAction(state, { type: 'switchPanel' });
      expect(next.selectedPanel).toBe('agents');
    });
  });

  // ── Story 5.4: Schedule View ──────────────────────────────

  describe('schedule action', () => {
    it('switches to schedule view from main', () => {
      const state = makeInputState({ view: 'main' });
      const next = applyAction(state, { type: 'schedule' });
      expect(next.view).toBe('schedule');
      expect(next.selectedScheduleIndex).toBe(0);
    });

    it('does not switch to schedule view from agent-detail', () => {
      const state = makeInputState({ view: 'agent-detail' });
      const next = applyAction(state, { type: 'schedule' });
      // schedule action is a no-op in agent-detail view
      expect(next.view).toBe('agent-detail');
    });
  });

  describe('schedule view navigation', () => {
    it('back action returns to main view', () => {
      const state = makeInputState({ view: 'schedule' });
      const next = applyAction(state, { type: 'back' });
      expect(next.view).toBe('main');
    });

    it('moveDown increments selectedScheduleIndex', () => {
      const state = makeInputState({
        view: 'schedule',
        selectedScheduleIndex: 1,
        scheduleCount: 5,
      });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.selectedScheduleIndex).toBe(2);
    });

    it('moveDown clamps at last schedule', () => {
      const state = makeInputState({
        view: 'schedule',
        selectedScheduleIndex: 4,
        scheduleCount: 5,
      });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.selectedScheduleIndex).toBe(4);
    });

    it('moveUp decrements selectedScheduleIndex', () => {
      const state = makeInputState({
        view: 'schedule',
        selectedScheduleIndex: 3,
        scheduleCount: 5,
      });
      const next = applyAction(state, { type: 'moveUp' });
      expect(next.selectedScheduleIndex).toBe(2);
    });

    it('moveUp clamps at zero', () => {
      const state = makeInputState({
        view: 'schedule',
        selectedScheduleIndex: 0,
        scheduleCount: 5,
      });
      const next = applyAction(state, { type: 'moveUp' });
      expect(next.selectedScheduleIndex).toBe(0);
    });

    it('moveDown handles zero schedules gracefully', () => {
      const state = makeInputState({
        view: 'schedule',
        selectedScheduleIndex: 0,
        scheduleCount: 0,
      });
      const next = applyAction(state, { type: 'moveDown' });
      expect(next.selectedScheduleIndex).toBe(0);
    });

    it('help toggles in schedule view', () => {
      const state = makeInputState({
        view: 'schedule',
        showHelp: false,
      });
      const next = applyAction(state, { type: 'help' });
      expect(next.showHelp).toBe(true);
    });

    it('switchPanel is a no-op in schedule view', () => {
      const state = makeInputState({
        view: 'schedule',
        selectedPanel: 'agents',
      });
      const next = applyAction(state, { type: 'switchPanel' });
      expect(next.selectedPanel).toBe('agents');
    });
  });

  // ── Back action on main view ──────────────────────────────

  describe('back action on main view', () => {
    it('is a no-op when already on main view', () => {
      const state = makeInputState({ view: 'main' });
      const next = applyAction(state, { type: 'back' });
      expect(next.view).toBe('main');
      expect(next.selectedPanel).toBe(state.selectedPanel);
    });
  });

  // ── View state preservation ───────────────────────────────

  describe('view state preservation', () => {
    it('preserves main view state when entering agent-detail', () => {
      const state = makeInputState({
        selectedPanel: 'agents',
        selectedAgentIndex: 2,
        newspaperScrollOffset: 10,
        agentCount: 5,
      });
      const next = applyAction(state, { type: 'select' });
      expect(next.view).toBe('agent-detail');
      // Main view state should be preserved
      expect(next.selectedPanel).toBe('agents');
      expect(next.selectedAgentIndex).toBe(2);
      expect(next.newspaperScrollOffset).toBe(10);
    });

    it('preserves main view state when entering schedule', () => {
      const state = makeInputState({
        selectedPanel: 'newspaper',
        selectedAgentIndex: 1,
        newspaperScrollOffset: 5,
      });
      const next = applyAction(state, { type: 'schedule' });
      expect(next.view).toBe('schedule');
      // Main view state should be preserved
      expect(next.selectedPanel).toBe('newspaper');
      expect(next.selectedAgentIndex).toBe(1);
      expect(next.newspaperScrollOffset).toBe(5);
    });
  });
});
