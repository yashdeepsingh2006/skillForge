import * as path from 'node:path';
import type { AgentAdapter } from './types.js';
import { pathExists } from '../utils/fs.js';

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly id = 'claude-code';
  readonly displayName = 'Claude Code';
  readonly description = 'Project-level skills stored in .claude/skills/<skill-name>';
  readonly targetSubdir = '.claude/skills';
  readonly limitations = [
    'Installs skills exclusively into project-scoped .claude/skills; never writes to user ~/.claude.',
    'Requires Claude Code CLI supporting project-level skill directories.',
  ] as const;

  async detect(projectRoot: string): Promise<boolean> {
    const claudeDir = path.join(projectRoot, '.claude');
    const claudeMd = path.join(projectRoot, 'CLAUDE.md');
    return (await pathExists(claudeDir)) || (await pathExists(claudeMd));
  }

  getSkillTargetDir(projectRoot: string, skillName: string): string {
    return path.join(projectRoot, '.claude', 'skills', skillName);
  }

  getRelativeTargetDir(skillName: string): string {
    return path.posix.join('.claude', 'skills', skillName);
  }
}

export const claudeCodeAdapter = new ClaudeCodeAdapter();
