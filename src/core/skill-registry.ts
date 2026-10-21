import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { discoverSkills, type DiscoveredSkill } from './skill-discovery.js';

export function getDefaultSkillsDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // From dist/core/skill-registry.js or src/core/skill-registry.ts:
  // two levels up points to package root where skills/ is located
  return path.resolve(path.dirname(currentFile), '../../skills');
}

export class SkillRegistry {
  private readonly skillsDir: string;
  private cachedSkills: DiscoveredSkill[] | null = null;
  private cachedWarnings: string[] = [];

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir ? path.resolve(skillsDir) : getDefaultSkillsDir();
  }

  getSkillsDir(): string {
    return this.skillsDir;
  }

  async load(forceRefresh: boolean = false): Promise<DiscoveredSkill[]> {
    if (this.cachedSkills === null || forceRefresh) {
      const result = await discoverSkills(this.skillsDir);
      this.cachedSkills = result.skills;
      this.cachedWarnings = result.warnings;
    }
    return this.cachedSkills;
  }

  async listSkills(): Promise<DiscoveredSkill[]> {
    return this.load();
  }

  async getSkill(name: string): Promise<DiscoveredSkill | null> {
    const skills = await this.load();
    const normalized = name.toLowerCase().trim();
    return skills.find((s) => s.name.toLowerCase() === normalized) ?? null;
  }

  async hasSkills(): Promise<boolean> {
    const skills = await this.load();
    return skills.length > 0;
  }

  async getWarnings(): Promise<string[]> {
    await this.load();
    return this.cachedWarnings;
  }
}
