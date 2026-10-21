import * as path from 'node:path';
import type { AgentAdapter } from './types.js';
import { pathExists } from '../utils/fs.js';

export class AntigravityAdapter implements AgentAdapter {
  readonly id = 'antigravity';
  readonly displayName = 'Google Antigravity';
  readonly description = 'Project-level skills stored in .agents/skills/<skill-name>';
  readonly targetSubdir = '.agents/skills';
  readonly limitations = [
    'Installs skills exclusively into project-scoped .agents/skills directory for Google Antigravity.',
    'Discovered automatically via .agents/, AGENTS.md, or GEMINI.md markers in the project.',
  ] as const;

  async detect(projectRoot: string): Promise<boolean> {
    const agentsDir = path.join(projectRoot, '.agents');
    const agentsMd = path.join(projectRoot, 'AGENTS.md');
    const geminiMd = path.join(projectRoot, 'GEMINI.md');
    return (
      (await pathExists(agentsDir)) ||
      (await pathExists(agentsMd)) ||
      (await pathExists(geminiMd))
    );
  }

  getSkillTargetDir(projectRoot: string, skillName: string): string {
    return path.join(projectRoot, '.agents', 'skills', skillName);
  }

  getRelativeTargetDir(skillName: string): string {
    return path.posix.join('.agents', 'skills', skillName);
  }
}

export const antigravityAdapter = new AntigravityAdapter();
