#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { installCommand } from './commands/install.js';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { uninstallCommand } from './commands/uninstall.js';
import { logger } from './utils/logger.js';
import { FullstackSkillsError } from './utils/errors.js';

async function getPackageVersion(): Promise<string> {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const packageJsonPath = path.resolve(path.dirname(currentFile), '../package.json');
    const content = await fs.readFile(packageJsonPath, 'utf8');
    const parsed = JSON.parse(content) as { version?: string };
    return parsed.version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

async function main(): Promise<void> {
  const version = await getPackageVersion();
  const program = new Command();

  program
    .name('fullstack-skills')
    .description('Install agent-agnostic full-stack AI coding-agent skills into your project')
    .version(version, '-v, --version', 'Output the current version of fullstack-skills');

  program
    .command('install')
    .description('Install all available skills into the current project')
    .option(
      '-a, --agent <agent>',
      'Target AI agent adapter (claude-code | codex | universal)'
    )
    .option('--dry-run', 'Preview changes without modifying the filesystem')
    .option('--force', 'Explicitly approve overwriting existing or modified files')
    .option(
      '-p, --project-dir <path>',
      'Explicitly specify target project directory (defaults to auto-detected project root)'
    )
    .action(async (options) => {
      try {
        await installCommand(options);
      } catch (err: unknown) {
        handleError(err);
      }
    });

  program
    .command('add <skill-name>')
    .description('Install a single skill by its name into the current project')
    .option(
      '-a, --agent <agent>',
      'Target AI agent adapter (claude-code | codex | universal)'
    )
    .option('--dry-run', 'Preview changes without modifying the filesystem')
    .option('--force', 'Explicitly approve overwriting existing or modified files')
    .option(
      '-p, --project-dir <path>',
      'Explicitly specify target project directory (defaults to auto-detected project root)'
    )
    .action(async (skillName: string, options) => {
      try {
        await addCommand(skillName, options);
      } catch (err: unknown) {
        handleError(err);
      }
    });

  program
    .command('import [skill-name]')
    .description('Import skills into the current project (imports all skills by default, or a single skill if specified)')
    .option(
      '-a, --agent <agent>',
      'Target AI agent provider (antigravity | claude-code | codex | universal)'
    )
    .option('--dry-run', 'Preview changes without modifying the filesystem')
    .option('--force', 'Explicitly approve overwriting existing or modified files')
    .option(
      '-p, --project-dir <path>',
      'Explicitly specify target project directory (defaults to auto-detected project root)'
    )
    .action(async (skillName: string | undefined, options) => {
      try {
        if (skillName) {
          await addCommand(skillName, options);
        } else {
          await installCommand(options);
        }
      } catch (err: unknown) {
        handleError(err);
      }
    });

  program
    .command('list')
    .description('List available skills in this package and their project installation status')
    .option(
      '-a, --agent <agent>',
      'Target AI agent adapter (claude-code | codex | universal)'
    )
    .option(
      '-p, --project-dir <path>',
      'Explicitly specify target project directory'
    )
    .action(async (options) => {
      try {
        await listCommand(options);
      } catch (err: unknown) {
        handleError(err);
      }
    });

  program
    .command('uninstall [skill-name]')
    .description('Uninstall one named skill or all managed skills from the current project')
    .option(
      '-y, --yes',
      'Non-interactive mode; automatically confirm uninstallation'
    )
    .option('--dry-run', 'Preview files that would be removed without deleting them')
    .option('--force', 'Force removal even if files were modified since installation')
    .option(
      '-p, --project-dir <path>',
      'Explicitly specify target project directory'
    )
    .action(async (skillName: string | undefined, options) => {
      try {
        await uninstallCommand(skillName, options);
      } catch (err: unknown) {
        handleError(err);
      }
    });

  await program.parseAsync(process.argv);
}

function handleError(err: unknown): void {
  if (err instanceof FullstackSkillsError) {
    logger.error(err.message);
  } else if (err instanceof Error) {
    logger.error(err.message);
  } else {
    logger.error(`An unexpected error occurred: ${String(err)}`);
  }
  process.exit(1);
}

main().catch(handleError);
