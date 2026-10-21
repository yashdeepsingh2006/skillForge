import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { discoverSkills } from '../src/core/skill-discovery.js';
import { SkillRegistry } from '../src/core/skill-registry.js';
import { createTestWorkspace, createMockSkill, type TestWorkspace } from './helpers.js';

describe('Skill Discovery & Registry', () => {
  let ws: TestWorkspace;

  beforeEach(async () => {
    ws = await createTestWorkspace('discovery-');
  });

  afterEach(async () => {
    await ws.cleanup();
  });

  it('handles non-existent skills directory cleanly', async () => {
    const nonExistent = path.join(ws.root, 'does-not-exist');
    const result = await discoverSkills(nonExistent);

    expect(result.skills).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('does not exist');
  });

  it('handles empty skills directory or directory with only .gitkeep', async () => {
    await ws.createFile('skills/.gitkeep', '');
    const skillsDir = path.join(ws.root, 'skills');

    const result = await discoverSkills(skillsDir);
    expect(result.skills).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);

    const registry = new SkillRegistry(skillsDir);
    expect(await registry.hasSkills()).toBe(false);
    expect(await registry.listSkills()).toHaveLength(0);
  });

  it('discovers valid skills and sorts them alphabetically', async () => {
    const skillsDir = path.join(ws.root, 'skills');
    await createMockSkill(skillsDir, 'zebra-skill', 'Last in alphabet');
    await createMockSkill(skillsDir, 'alpha-skill', 'First in alphabet');
    await createMockSkill(skillsDir, 'beta-skill', 'Middle in alphabet');

    const registry = new SkillRegistry(skillsDir);
    const skills = await registry.listSkills();

    expect(skills).toHaveLength(3);
    expect(skills.map((s) => s.name)).toEqual(['alpha-skill', 'beta-skill', 'zebra-skill']);
    expect(skills[0]?.metadata.description).toBe('First in alphabet');
  });

  it('gracefully skips directories missing SKILL.md and records warning', async () => {
    const skillsDir = path.join(ws.root, 'skills');
    await createMockSkill(skillsDir, 'valid-skill', 'A valid skill');
    await ws.createFile('skills/incomplete-skill/notes.txt', 'no SKILL.md here');

    const result = await discoverSkills(skillsDir);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.name).toBe('valid-skill');
    expect(result.warnings.some((w) => w.includes('missing required "SKILL.md"'))).toBe(true);
  });

  it('gracefully skips skills with malformed SKILL.md frontmatter', async () => {
    const skillsDir = path.join(ws.root, 'skills');
    await createMockSkill(skillsDir, 'good-skill', 'Good');

    await ws.createFile(
      'skills/bad-metadata/SKILL.md',
      '---\nname: bad-metadata\n# missing description\n---\n# Docs'
    );

    const result = await discoverSkills(skillsDir);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.name).toBe('good-skill');
    expect(result.warnings.some((w) => w.includes('invalid SKILL.md metadata'))).toBe(true);
  });

  it('retrieves single skill by name via SkillRegistry', async () => {
    const skillsDir = path.join(ws.root, 'skills');
    await createMockSkill(skillsDir, 'target-skill', 'Target description');

    const registry = new SkillRegistry(skillsDir);
    const skill = await registry.getSkill('target-skill');

    expect(skill).not.toBeNull();
    expect(skill?.name).toBe('target-skill');
    expect(skill?.metadata.description).toBe('Target description');

    const notFound = await registry.getSkill('non-existent');
    expect(notFound).toBeNull();
  });
});
