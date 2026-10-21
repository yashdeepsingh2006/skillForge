import { SkillInstaller, type InstallOptions } from '../core/installer.js';
import { SkillRegistry } from '../core/skill-registry.js';
import { logger } from '../utils/logger.js';

export async function installCommand(options: InstallOptions): Promise<void> {
  const registry = new SkillRegistry();
  const hasSkills = await registry.hasSkills();

  if (!hasSkills) {
    logger.info('No skills are currently available in the skills/ directory.');
    logger.log('');
    logger.log('To add a new skill to this package:');
    logger.log('  1. Create a directory: skills/<skill-name>/');
    logger.log('  2. Create skills/<skill-name>/SKILL.md with valid YAML frontmatter:');
    logger.log('     ---');
    logger.log('     name: <skill-name>');
    logger.log('     description: <what the skill does>');
    logger.log('     ---');
    logger.log('     # Instructions...');
    logger.log('  3. Run "fullstack-skills install" again.');
    return;
  }

  const installer = new SkillInstaller(registry);
  const result = await installer.installAll(options);

  logger.log('');
  logger.info(`Target Project: ${result.projectRoot}`);
  logger.info(`Agent: ${result.agentName} (${result.targetSubdir})`);
  if (options.dryRun) {
    logger.warn('Dry-run mode active: no filesystem changes were made.');
  }
  logger.log('');

  for (const item of result.results) {
    if (item.status === 'installed') {
      logger.success(`Installed "${item.skillName}"${item.reason ? ` (${item.reason})` : ''}`);
    } else if (item.status === 'skipped') {
      logger.warn(`Skipped "${item.skillName}": ${item.reason}`);
    } else {
      logger.error(`Failed "${item.skillName}": ${item.reason}`);
    }
  }

  logger.log('');
  logger.info(
    `Summary: ${result.summary.installed} installed, ${result.summary.skipped} skipped, ${result.summary.failed} failed (total: ${result.summary.total})`
  );

  if (result.summary.failed > 0) {
    process.exitCode = 1;
  }
}
