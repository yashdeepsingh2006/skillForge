import { SkillInstaller, type InstallOptions } from '../core/installer.js';
import { SkillRegistry } from '../core/skill-registry.js';
import { validateSkillName } from '../utils/validator.js';
import { logger } from '../utils/logger.js';

export async function addCommand(skillName: string, options: InstallOptions): Promise<void> {
  const nameValidation = validateSkillName(skillName);
  if (!nameValidation.isValid) {
    logger.error(nameValidation.error ?? 'Invalid skill name.');
    process.exitCode = 1;
    return;
  }

  const registry = new SkillRegistry();
  const installer = new SkillInstaller(registry);

  const { result, projectRoot, agentId } = await installer.installSkill(skillName, options);

  logger.info(`Target Project: ${projectRoot}`);
  logger.info(`Target Agent: ${agentId}`);
  if (options.dryRun) {
    logger.warn('Dry-run mode active: no filesystem changes were made.');
  }

  if (result.status === 'installed') {
    logger.success(`Skill "${skillName}" installed successfully${result.reason ? ` (${result.reason})` : ''}.`);
  } else if (result.status === 'skipped') {
    logger.warn(`Skill "${skillName}" was skipped: ${result.reason}`);
  } else {
    logger.error(`Skill "${skillName}" failed to install: ${result.reason}`);
    process.exitCode = 1;
  }
}
