import * as path from 'node:path';
import type { AgentAdapter } from './types.js';
import { pathExists } from '../utils/fs.js';

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex';
  readonly displayName = 'OpenAI Codex';
  readonly description = 'Project-level skills stored in .codex/skills/<skill-name>';
  readonly targetSubdir = '.codex/skills';
  readonly limitations = [
    'Installs skills exclusively into project-scoped .codex/skills directory.',
    'Requires OpenAI Codex CLI or runtime supporting project-level skill directories.',
  ] as const;

  async detect(projectRoot: string): Promise<boolean> {
    const codexDir = path.join(projectRoot, '.codex');
    const codexMd = path.join(projectRoot, 'CODEX.md');
    return (await pathExists(codexDir)) || (await pathExists(codexMd));
  }

  getSkillTargetDir(projectRoot: string, skillName: string): string {
    return path.join(projectRoot, '.codex', 'skills', skillName);
  }

  getRelativeTargetDir(skillName: string): string {
    return path.posix.join('.codex', 'skills', skillName);
  }
}

export const codexAdapter = new CodexAdapter();
