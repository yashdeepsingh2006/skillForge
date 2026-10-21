import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import {
  getAdapter,
  listAdapters,
  resolveAdapter,
  antigravityAdapter,
  claudeCodeAdapter,
  codexAdapter,
  universalAdapter,
} from '../src/adapters/index.js';
import { createTestWorkspace, type TestWorkspace } from './helpers.js';
import { AdapterNotFoundError } from '../src/utils/errors.js';

describe('Agent Adapters', () => {
  let ws: TestWorkspace;

  beforeEach(async () => {
    ws = await createTestWorkspace('adapters-');
  });

  afterEach(async () => {
    await ws.cleanup();
  });

  it('lists all supported adapters with definitions and limitations', () => {
    const adapters = listAdapters();
    expect(adapters.map((a) => a.id)).toEqual(['antigravity', 'claude-code', 'codex', 'universal']);

    for (const adapter of adapters) {
      expect(adapter.displayName).toBeDefined();
      expect(adapter.description).toBeDefined();
      expect(adapter.targetSubdir).toBeDefined();
      expect(adapter.limitations.length).toBeGreaterThan(0);
    }
  });

  it('retrieves adapter by case-insensitive id', () => {
    expect(getAdapter('antigravity')).toBe(antigravityAdapter);
    expect(getAdapter('ANTIGRAVITY')).toBe(antigravityAdapter);
    expect(getAdapter('claude-code')).toBe(claudeCodeAdapter);
    expect(getAdapter('CLAUDE-CODE')).toBe(claudeCodeAdapter);
    expect(getAdapter('codex')).toBe(codexAdapter);
    expect(getAdapter('universal')).toBe(universalAdapter);
  });

  it('throws AdapterNotFoundError for unknown adapter', () => {
    expect(() => getAdapter('unknown-agent')).toThrow(AdapterNotFoundError);
  });

  it('computes correct skill target directory paths', () => {
    const dummyRoot = path.resolve('/mock/project');
    const skillName = 'api-design';

    const antigravityPath = antigravityAdapter.getSkillTargetDir(dummyRoot, skillName);
    expect(antigravityPath).toBe(path.join(dummyRoot, '.agents', 'skills', skillName));

    const claudePath = claudeCodeAdapter.getSkillTargetDir(dummyRoot, skillName);
    expect(claudePath).toBe(path.join(dummyRoot, '.claude', 'skills', skillName));

    const codexPath = codexAdapter.getSkillTargetDir(dummyRoot, skillName);
    expect(codexPath).toBe(path.join(dummyRoot, '.codex', 'skills', skillName));

    const universalPath = universalAdapter.getSkillTargetDir(dummyRoot, skillName);
    expect(universalPath).toBe(path.join(dummyRoot, '.agents', 'skills', skillName));
  });

  it('auto-detects Antigravity when .agents directory, AGENTS.md, or GEMINI.md exists', async () => {
    await ws.createFile('.agents/skills/.gitkeep', '');
    const resultFromDir = await resolveAdapter(ws.root);
    expect(resultFromDir.detected).toBe(true);
    expect(resultFromDir.adapter.id).toBe('antigravity');

    const ws2 = await createTestWorkspace('antigravity-md-');
    await ws2.createFile('AGENTS.md', '# Agent rules');
    const resultFromMd = await resolveAdapter(ws2.root);
    expect(resultFromMd.detected).toBe(true);
    expect(resultFromMd.adapter.id).toBe('antigravity');
    await ws2.cleanup();
  });

  it('auto-detects Claude Code when .claude directory exists', async () => {
    await ws.createFile('.claude/settings.json', '{}');
    const result = await resolveAdapter(ws.root);

    expect(result.detected).toBe(true);
    expect(result.adapter.id).toBe('claude-code');
  });

  it('auto-detects Claude Code when CLAUDE.md exists', async () => {
    await ws.createFile('CLAUDE.md', '# Claude Guide');
    const result = await resolveAdapter(ws.root);

    expect(result.detected).toBe(true);
    expect(result.adapter.id).toBe('claude-code');
  });

  it('auto-detects OpenAI Codex when .codex directory exists', async () => {
    await ws.createFile('.codex/config.json', '{}');
    const result = await resolveAdapter(ws.root);

    expect(result.detected).toBe(true);
    expect(result.adapter.id).toBe('codex');
  });

  it('defaults to Universal adapter when no agent markers are present', async () => {
    await ws.createFile('package.json', '{}');
    const result = await resolveAdapter(ws.root);

    expect(result.detected).toBe(false);
    expect(result.adapter.id).toBe('universal');
  });

  it('throws an error if multiple agent markers are detected (ambiguity check)', async () => {
    await ws.createFile('.claude/settings.json', '{}');
    await ws.createFile('.codex/config.json', '{}');

    await expect(resolveAdapter(ws.root)).rejects.toThrow('Multiple agent configurations detected');
  });

  it('allows explicit override even when another agent marker exists', async () => {
    await ws.createFile('.claude/settings.json', '{}');
    const result = await resolveAdapter(ws.root, 'antigravity');

    expect(result.detected).toBe(false);
    expect(result.adapter.id).toBe('antigravity');
  });
});
