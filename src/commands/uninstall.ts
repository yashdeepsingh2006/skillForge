import * as readline from 'node:readline/promises';
import { SkillUninstaller, type UninstallOptions } from '../core/uninstaller.js';
import { findProjectRoot } from '../utils/project-root.js';
import { readManifest } from '../core/manifest.js';
import { logger } from '../utils/logger.js';

async function confirmDestructiveAction(promptMessage: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    throw new Error(
      'Cannot prompt for confirmation in a non-interactive environment.\n' +
      'Please re-run the command with the --yes (-y) flag to confirm.'
    );
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`${promptMessage} [y/N]: `);
    return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

export async function uninstallCommand(
  skillName: string | undefined,
  options: UninstallOptions
): Promise<void> {
  const projectRoot = await findProjectRoot(process.cwd(), options.projectDir);
  const manifest = await readManifest(projectRoot);

  if (!manifest || Object.keys(manifest.skills).length === 0) {
    logger.info('No skills are currently managed by fullstack-skills in this project.');
    return;
  }

  const uninstaller = new SkillUninstaller();

  if (skillName) {
    if (!manifest.skills[skillName]) {
      logger.warn(`Skill "${skillName}" is not managed by fullstack-skills in this project.`);
      const managedList = Object.keys(manifest.skills);
      if (managedList.length > 0) {
        logger.log(`Managed skills: ${managedList.join(', ')}`);
      }
      return;
    }

    if (!options.yes && !options.dryRun) {
      const confirmed = await confirmDestructiveAction(
        `Are you sure you want to uninstall skill "${skillName}" from "${projectRoot}"?`
      );
      if (!confirmed) {
        logger.info('Uninstallation cancelled by user.');
        return;
      }
    }

    const { result } = await uninstaller.uninstallSkill(skillName, options);

    if (result.status === 'uninstalled') {
      logger.success(`Skill "${skillName}" uninstalled successfully.`);
      if (result.removedFiles.length > 0) {
        logger.log(`Removed ${result.removedFiles.length} file(s):`);
        for (const file of result.removedFiles) {
          logger.log(`  - ${file}`);
        }
      }
    } else if (result.status === 'skipped') {
      logger.warn(`Skill "${skillName}" skipped: ${result.reason}`);
    } else {
      logger.error(`Skill "${skillName}" failed to uninstall: ${result.reason}`);
      process.exitCode = 1;
    }
  } else {
    // Uninstall all managed skills
    const managedSkills = Object.keys(manifest.skills);

    if (!options.yes && !options.dryRun) {
      const confirmed = await confirmDestructiveAction(
        `Are you sure you want to uninstall ALL ${managedSkills.length} managed skill(s) (${managedSkills.join(', ')}) from "${projectRoot}"?`
      );
      if (!confirmed) {
        logger.info('Uninstallation cancelled by user.');
        return;
      }
    }

    const batch = await uninstaller.uninstallAll(options);

    logger.log('');
    for (const res of batch.results) {
      if (res.status === 'uninstalled') {
        logger.success(`Uninstalled "${res.skillName}" (${res.removedFiles.length} files removed)`);
      } else if (res.status === 'skipped') {
        logger.warn(`Skipped "${res.skillName}": ${res.reason}`);
      } else {
        logger.error(`Failed "${res.skillName}": ${res.reason}`);
      }
    }

    logger.log('');
    logger.info(
      `Summary: ${batch.summary.uninstalled} uninstalled, ${batch.summary.skipped} skipped, ${batch.summary.failed} failed.`
    );

    if (batch.summary.failed > 0) {
      process.exitCode = 1;
    }
  }
}
