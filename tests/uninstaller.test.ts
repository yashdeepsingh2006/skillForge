import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkillInstaller } from '../src/core/installer.js';
import { SkillUninstaller } from '../src/core/uninstaller.js';
import { SkillRegistry } from '../src/core/skill-registry.js';
import { readManifest } from '../src/core/manifest.js';
import { createTestWorkspace, createMockSkill, type TestWorkspace } from './helpers.js';

describe('SkillUninstaller', () => {
  let projectWs: TestWorkspace;
  let skillsWs: TestWorkspace;
  let registry: SkillRegistry;
  let installer: SkillInstaller;
  let uninstaller: SkillUninstaller;

  beforeEach(async () => {
    projectWs = await createTestWorkspace('uninstall-proj-');
    skillsWs = await createTestWorkspace('uninstall-skills-');

    await projectWs.createFile('package.json', '{"name": "test"}');

    registry = new SkillRegistry(skillsWs.root);
    installer = new SkillInstaller(registry);
    uninstaller = new SkillUninstaller();
  });

  afterEach(async () => {
    await projectWs.cleanup();
    await skillsWs.cleanup();
  });

  it('uninstalls a single managed skill and removes only tracked files', async () => {
    await createMockSkill(skillsWs.root, 'managed-skill', 'Desc', {
      'extra.txt': 'extra',
    });

    await installer.installSkill('managed-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
    });

    expect(await projectWs.exists('.agents/skills/managed-skill/SKILL.md')).toBe(true);

    const { result } = await uninstaller.uninstallSkill('managed-skill', {
      projectDir: projectWs.root,
      yes: true,
    });

    expect(result.status).toBe('uninstalled');
    expect(result.removedFiles.length).toBe(2);

    expect(await projectWs.exists('.agents/skills/managed-skill/SKILL.md')).toBe(false);
    expect(await projectWs.exists('.agents/skills/managed-skill')).toBe(false);

    // Manifest should be removed when 0 skills remain
    const manifest = await readManifest(projectWs.root);
    expect(manifest).toBeNull();
  });

  it('preserves unrelated files and foreign skills', async () => {
    await createMockSkill(skillsWs.root, 'package-skill');
    await installer.installSkill('package-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
    });

    // Create foreign skill and an unrelated file in .agents/skills/
    await projectWs.createFile('.agents/skills/foreign-skill/SKILL.md', '# Foreign Skill');
    await projectWs.createFile('.agents/custom-file.txt', 'keep me');

    await uninstaller.uninstallSkill('package-skill', {
      projectDir: projectWs.root,
      yes: true,
    });

    // Package skill should be gone
    expect(await projectWs.exists('.agents/skills/package-skill')).toBe(false);

    // Foreign files must be intact
    expect(await projectWs.exists('.agents/skills/foreign-skill/SKILL.md')).toBe(true);
    expect(await projectWs.exists('.agents/custom-file.txt')).toBe(true);
  });

  it('preserves user modifications and skips removal without --force', async () => {
    await createMockSkill(skillsWs.root, 'modified-skill');
    await installer.installSkill('modified-skill', {
      projectDir: projectWs.root,
      agent: 'universal',
    });

    // Modify file
    await projectWs.createFile('.agents/skills/modified-skill/SKILL.md', '# User edits');

    const { result } = await uninstaller.uninstallSkill('modified-skill', {
      projectDir: projectWs.root,
      yes: true,
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toContain('Refused to remove modified files');
    expect(await projectWs.exists('.agents/skills/modified-skill/SKILL.md')).toBe(true);

    // Now force uninstallation
    const forced = await uninstaller.uninstallSkill('modified-skill', {
      projectDir: projectWs.root,
      yes: true,
      force: true,
    });

    expect(forced.result.status).toBe('uninstalled');
    expect(await projectWs.exists('.agents/skills/modified-skill/SKILL.md')).toBe(false);
  });

  it('supports dry-run uninstallation without removing files', async () => {
    await createMockSkill(skillsWs.root, 'dry-uninstall');
    await installer.installSkill('dry-uninstall', {
      projectDir: projectWs.root,
      agent: 'universal',
    });

    const { result } = await uninstaller.uninstallSkill('dry-uninstall', {
      projectDir: projectWs.root,
      dryRun: true,
    });

    expect(result.status).toBe('uninstalled');
    expect(result.reason).toContain('[dry-run]');
    expect(await projectWs.exists('.agents/skills/dry-uninstall/SKILL.md')).toBe(true);

    const manifest = await readManifest(projectWs.root);
    expect(manifest?.skills['dry-uninstall']).toBeDefined();
  });

  it('uninstalls all managed skills with uninstallAll', async () => {
    await createMockSkill(skillsWs.root, 'skill-a');
    await createMockSkill(skillsWs.root, 'skill-b');

    await installer.installSkill('skill-a', { projectDir: projectWs.root, agent: 'universal' });
    await installer.installSkill('skill-b', { projectDir: projectWs.root, agent: 'universal' });

    const batch = await uninstaller.uninstallAll({
      projectDir: projectWs.root,
      yes: true,
    });

    expect(batch.summary.uninstalled).toBe(2);
    expect(await projectWs.exists('.agents/skills/skill-a')).toBe(false);
    expect(await projectWs.exists('.agents/skills/skill-b')).toBe(false);
    expect(await readManifest(projectWs.root)).toBeNull();
  });
});
