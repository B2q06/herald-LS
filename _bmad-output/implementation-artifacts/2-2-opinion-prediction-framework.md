# Story 2.2: BMAD Opinion & Prediction Framework Extension

Status: ready-for-dev

## Story

As an operator,
I want research agents to develop opinions and track predictions as extensions of their BMAD knowledge.md,
So that agents build genuine domain expertise over time with accountability.

## Acceptance Criteria

1. **Given** a research agent's BMAD knowledge.md **When** the agent is first scaffolded **Then** knowledge.md contains the extended BMAD sections: Domain Knowledge, Developing Opinions, Predictions Log, and Accountability **And** these sections are native extensions of the existing BMAD knowledge structure, not a separate system
2. **Given** a research agent completes a patrol and identifies a noteworthy trend **When** the agent forms an opinion **Then** the opinion is recorded in the Developing Opinions section with: statement, confidence level (0-100), supporting evidence, and timestamp (FR14) **And** opinions can be updated with revised confidence as new evidence emerges
3. **Given** a research agent identifies a forward-looking development **When** the agent records a prediction **Then** the prediction is logged in the Predictions Log with: prediction statement, confidence, evidence, timestamp, and expected timeframe (FR15) **And** predictions are structured for future accountability checking
4. **Given** a research agent spots a tool, framework, or workflow improvement relevant to the operator **When** the agent evaluates the advancement **Then** the agent includes a proactive recommendation in its patrol report with rationale and confidence (FR16)

## What Already Exists

- Persona MDs already include full Opinion & Prediction Framework sections that instruct the agent how to form, record, and update opinions/predictions
- Persona report formats already have `Opinions Formed` and `Predictions` sections
- `persona-loader.ts` already loads knowledge.md and appends it to the system prompt
- Agent scaffolder already creates knowledge.md (but with empty/minimal content)

## What Needs to Change

### Task 1: Create knowledge.md initial template with BMAD opinion/prediction structure

**File:** `packages/daemon/src/agent-loader/scaffolder.ts` (update template)

When the scaffolder creates `memory/agents/{name}/knowledge.md`, use this template:

```markdown
# {Agent Name} — Knowledge Base

## Domain Knowledge
<!-- Accumulated domain expertise from patrol runs. Updated by the agent. -->

## Developing Opinions
<!-- Opinions with confidence levels, evidence, and timestamps. -->
<!-- Format:
### {Opinion Statement}
- **Confidence:** {0-100}
- **Evidence:** {supporting observations and citations}
- **First Stated:** {date}
- **Last Updated:** {date}
- **Status:** active | revised | archived
-->

## Predictions Log
<!-- Forward-looking predictions with accountability tracking. -->
<!-- Format:
### {Prediction Statement}
- **Confidence:** {0-100}
- **Evidence:** {supporting observations}
- **Stated:** {date}
- **Timeframe:** {expected by when}
- **Status:** active | confirmed | invalidated | expired
- **Outcome:** {filled in when resolved}
-->

## Accountability
<!-- Calibration tracking: how accurate are this agent's predictions? -->
<!-- Updated periodically by reviewing expired/resolved predictions. -->

### Calibration Record
| Confidence Range | Predictions Made | Confirmed | Invalidated | Accuracy |
|-----------------|-----------------|-----------|-------------|----------|
| 80-100          | 0               | 0         | 0           | —        |
| 60-79           | 0               | 0         | 0           | —        |
| 40-59           | 0               | 0         | 0           | —        |
| 20-39           | 0               | 0         | 0           | —        |
```

**Tests:** Verify scaffolder creates knowledge.md with opinion/prediction sections

### Task 2: Enhance persona-loader to inject knowledge.md with write instructions

**File:** `packages/daemon/src/session/persona-loader.ts`

The persona loader already appends knowledge.md content to the system prompt. Enhance by:

1. Adding a preamble before the knowledge content that tells the agent it can update this file:

```
## Your Knowledge Base
The following is your persistent knowledge. You can update this file at:
  {knowledge_path}

After your patrol, update the relevant sections if you formed new opinions, made predictions, or gained domain knowledge. Use the exact format shown in the section headers.

{knowledge.md content}
```

2. Also inject the knowledge file path so the agent knows where to write (it runs as a Claude Code session with file access)

**Tests:** Verify knowledge path is injected, verify preamble is present

### Task 3: Enhance patrol prompt to request opinion/prediction output

**File:** `packages/daemon/src/session/session-manager.ts`

Update the patrol prompt (from Story 2.1) to also instruct the agent to:
1. Read its current knowledge.md for context on existing opinions/predictions
2. Form new opinions and update confidence on existing ones if evidence warrants
3. Record any predictions
4. Include proactive recommendations in the report

Add to patrol prompt:
```
After producing your report, review your knowledge base and update it:
- Form or update opinions based on this patrol's findings
- Record any predictions with confidence and timeframe
- Update your Domain Knowledge section with key learnings
- Write your updates to your knowledge file at: {knowledge_path}
```

### Task 4: Validate opinion/prediction persistence

- Verify that after a patrol run, knowledge.md has been updated with new entries
- Verify the format matches the template structure
- Verify opinions include required fields (statement, confidence, evidence, timestamps)
- Verify predictions include required fields (statement, confidence, timeframe, status)

### Task 5: Validate

- `bun test` — all tests pass
- `bun lint` — clean

## Dev Notes

### Critical Design Decision: Agent-Driven Knowledge Updates

The daemon does NOT parse, validate, or manage knowledge.md content. The agent (running as a Claude Code session) directly reads and writes its own knowledge.md file using its file system access. This is the two-body architecture in action:

- **Daemon (dumb):** Loads knowledge.md into the system prompt, provides the file path
- **Agent (smart):** Reads its knowledge, decides what to add/update, writes the file

This means:
- No daemon code for parsing opinions/predictions
- No Zod schemas for knowledge.md content (it's free-form markdown managed by the agent)
- The template is a suggestion/guide for the agent, not a rigid format
- If the agent writes malformed content, it's the agent's problem — the daemon just loads text

### Key Files Modified
```
packages/daemon/src/agent-loader/scaffolder.ts   — knowledge.md template
packages/daemon/src/session/persona-loader.ts    — knowledge write instructions
packages/daemon/src/session/session-manager.ts   — patrol prompt enhancement
```

### Dependencies
- Depends on Story 2.1 (persona-loader changes, patrol prompt structure)
- Can share the same branch or be a follow-up commit on the 2.1 branch
