import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { SkillInstaller } from '../src/core/installer.js';
import { SkillRegistry } from '../src/core/skill-registry.js';
import { readManifest } from '../src/core/manifest.js';
import { createTestWorkspace, createMockSkill, type TestWorkspace } from './helpers.js';
import { SkillNotFoundError } from '../src/utils/errors.js';

describe('SkillInstaller', () => {
  let projectWs: TestWorkspace;
  let skillsWs: TestWorkspace;
  let registry: SkillRegistry;
  let installer: SkillInstaller;

  beforeEach(async () => {
    projectWs = await createTestWorkspace('target-proj-');
    skillsWs = await createTestWorkspace('src-skills-');

    // Create package.json in target project to make it a valid project root
    await projectWs.createFile('package.json', '{"name": "target-project"}');

    registry = new SkillRegistry(skillsWs.root);
    installer = new SkillInstaller(registry);
  });

  afterEach(async () => {
    await projectWs.cleanup();
    await skillsWs.cleanup();
  });

  it('installs a single skill with subdirectories and creates manifest', async () => {
    await createMockSkill(skillsWs.root, 'auth-skill', 'Auth handler', {
      'scripts/helper.sh': '#!/bin/bash\necho "test"',
    });

    const { result } = await installer.installSkill('auth-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
    });

    expect(result.status).toBe('installed');
    expect(result.skillName).toBe('auth-skill');

    // Check files on disk
    const skillMdExists = await projectWs.exists('.agents/skills/auth-skill/SKILL.md');
    const helperExists = await projectWs.exists('.agents/skills/auth-skill/scripts/helper.sh');
    expect(skillMdExists).toBe(true);
    expect(helperExists).toBe(true);

    // Check manifest
    const manifest = await readManifest(projectWs.root);
    expect(manifest).not.toBeNull();
    expect(manifest?.skills['auth-skill']).toBeDefined();
    expect(manifest?.skills['auth-skill']?.adapter).toBe('universal');
    expect(manifest?.skills['auth-skill']?.files).toHaveLength(2);
  });

  it('installs into each supported adapter destination', async () => {
    await createMockSkill(skillsWs.root, 'test-skill', 'Multi adapter test');

    // 1. Claude Code
    await installer.installSkill('test-skill', {
      projectDir: projectWs.root,
      agent: 'claude-code',
      force: true,
    });
    expect(await projectWs.exists('.claude/skills/test-skill/SKILL.md')).toBe(true);

    // 2. Codex
    await installer.installSkill('test-skill', {
      projectDir: projectWs.root,
      agent: 'codex',
      force: true,
    });
    expect(await projectWs.exists('.codex/skills/test-skill/SKILL.md')).toBe(true);

    // 3. Universal
    await installer.installSkill('test-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
      force: true,
    });
    expect(await projectWs.exists('.agents/skills/test-skill/SKILL.md')).toBe(true);
  });

  it('throws SkillNotFoundError for unknown skill', async () => {
    await createMockSkill(skillsWs.root, 'existing-skill');

    await expect(
      installer.installSkill('missing-skill', { projectDir: projectWs.root })
    ).rejects.toThrow(SkillNotFoundError);
  });

  it('makes repeated installations idempotent (skips identical files)', async () => {
    await createMockSkill(skillsWs.root, 'idempotent-skill');

    // First install
    const first = await installer.installSkill('idempotent-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
    });
    expect(first.result.status).toBe('installed');

    // Second install without force
    const second = await installer.installSkill('idempotent-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
    });
    expect(second.result.status).toBe('skipped');
    expect(second.result.reason).toContain('Already installed and up to date');
  });

  it('refuses to silently overwrite modified files unless --force is used', async () => {
    await createMockSkill(skillsWs.root, 'safety-skill');

    await installer.installSkill('safety-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
    });

    // User modifies the installed skill file
    const installedPath = '.agents/skills/safety-skill/SKILL.md';
    await projectWs.createFile(installedPath, '# User Custom Edit');

    // Attempt re-install without force
    const skipped = await installer.installSkill('safety-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
    });
    expect(skipped.result.status).toBe('skipped');
    expect(skipped.result.reason).toContain('differ from recorded manifest');
    expect(await projectWs.readFile(installedPath)).toBe('# User Custom Edit');

    // Re-install with force
    const forced = await installer.installSkill('safety-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
      force: true,
    });
    expect(forced.result.status).toBe('installed');
    expect(await projectWs.readFile(installedPath)).not.toBe('# User Custom Edit');
  });

  it('refuses to overwrite pre-existing unmanaged directories unless --force is used', async () => {
    await createMockSkill(skillsWs.root, 'unmanaged-test');

    // Pre-create the directory outside of fullstack-skills
    await projectWs.createFile('.agents/skills/unmanaged-test/SKILL.md', '# Pre-existing unmanaged');

    // Attempt install without force
    const skipped = await installer.installSkill('unmanaged-test', {
      projectDir: projectWs.root,
      agent: 'universal',
    });
    expect(skipped.result.status).toBe('skipped');
    expect(skipped.result.reason).toContain('not managed by fullstack-skills');

    // Install with force
    const forced = await installer.installSkill('unmanaged-test', {
      projectDir: projectWs.root,
      agent: 'universal',
      force: true,
    });
    expect(forced.result.status).toBe('installed');
  });

  it('supports --dry-run without modifying disk or manifest', async () => {
    await createMockSkill(skillsWs.root, 'dry-skill');

    const { result } = await installer.installSkill('dry-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
      dryRun: true,
    });

    expect(result.status).toBe('installed');
    expect(result.reason).toContain('[dry-run]');

    expect(await projectWs.exists('.agents/skills/dry-skill')).toBe(false);
    expect(await projectWs.exists('.fullstack-skills-manifest.json')).toBe(false);
  });

  it('installs all available skills using installAll', async () => {
    await createMockSkill(skillsWs.root, 'skill-1');
    await createMockSkill(skillsWs.root, 'skill-2');

    const batch = await installer.installAll({
      projectDir: projectWs.root,
      agent: 'universal',
    });

    expect(batch.summary.total).toBe(2);
    expect(batch.summary.installed).toBe(2);
    expect(batch.summary.skipped).toBe(0);
    expect(batch.summary.failed).toBe(0);

    expect(await projectWs.exists('.agents/skills/skill-1/SKILL.md')).toBe(true);
    expect(await projectWs.exists('.agents/skills/skill-2/SKILL.md')).toBe(true);
  });
});
