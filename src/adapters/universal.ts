import * as path from 'node:path';
import type { AgentAdapter } from './types.js';
import { pathExists } from '../utils/fs.js';

export class UniversalAdapter implements AgentAdapter {
  readonly id = 'universal';
  readonly displayName = 'Universal Agent (Open Agent Skills)';
  readonly description = 'Project-level skills stored in standard .agents/skills/<skill-name>';
  readonly targetSubdir = '.agents/skills';
  readonly limitations = [
    'Installs skills exclusively into project-scoped .agents/skills directory.',
    'Compatible with any AI agent or orchestrator supporting standard Agent Skills.',
  ] as const;

  async detect(projectRoot: string): Promise<boolean> {
    const skillsDir = path.join(projectRoot, '.skills');
    return await pathExists(skillsDir);
  }

  getSkillTargetDir(projectRoot: string, skillName: string): string {
    return path.join(projectRoot, '.agents', 'skills', skillName);
  }

  getRelativeTargetDir(skillName: string): string {
    return path.posix.join('.agents', 'skills', skillName);
  }
}

export const universalAdapter = new UniversalAdapter();
