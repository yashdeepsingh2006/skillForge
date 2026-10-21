import { SkillRegistry } from '../core/skill-registry.js';
import { readManifest } from '../core/manifest.js';
import { resolveAdapter } from '../adapters/index.js';
import { findProjectRoot } from '../utils/project-root.js';
import { pathExists } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

export interface ListOptions {
  agent?: string;
  projectDir?: string;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const registry = new SkillRegistry();
  const availableSkills = await registry.listSkills();
  const warnings = await registry.getWarnings();

  let projectRoot: string | null = null;
  let manifest = null;
  let adapter = null;

  try {
    projectRoot = await findProjectRoot(process.cwd(), options.projectDir);
    manifest = await readManifest(projectRoot);
    const resolved = await resolveAdapter(projectRoot, options.agent);
    adapter = resolved.adapter;
  } catch {
    // Project root or agent resolution may not exist if running outside a project
  }

  logger.log('');
  logger.info(`Skills Discovery Source: ${registry.getSkillsDir()}`);
  if (projectRoot) {
    logger.info(`Project Root: ${projectRoot}`);
  }
  if (adapter) {
    logger.info(`Target Agent: ${adapter.displayName} (${adapter.targetSubdir})`);
  }
  logger.log('');

  if (warnings.length > 0) {
    logger.warn('Discovery Warnings:');
    for (const w of warnings) {
      logger.log(`  ⚠ ${w}`);
    }
    logger.log('');
  }

  if (availableSkills.length === 0) {
    logger.info('No valid skills found in registry.');
    logger.log('');
    logger.log('To add skills to this package:');
    logger.log('  1. Place skill directories in "skills/<skill-name>/"');
    logger.log('  2. Include a "SKILL.md" file with YAML frontmatter (name, description)');
    logger.log('');
    return;
  }

  logger.log('Available Skills:');
  logger.log('-----------------');

  for (const skill of availableSkills) {
    let statusText = '[Available]';

    if (projectRoot && manifest && manifest.skills[skill.name]) {
      const managed = manifest.skills[skill.name]!;
      statusText = `[Installed (${managed.adapter})]`;
    } else if (projectRoot && adapter) {
      const targetDir = adapter.getSkillTargetDir(projectRoot, skill.name);
      if (await pathExists(targetDir)) {
        statusText = '[Unmanaged (exists on disk)]';
      }
    }

    logger.log(`  * ${skill.name} ${statusText}`);
    logger.log(`    Description: ${skill.metadata.description}`);
    if (skill.metadata.version) {
      logger.log(`    Version:     ${skill.metadata.version}`);
    }
    logger.log('');
  }

  // Also check if any skills are installed in project manifest that aren't in this package registry
  if (manifest && projectRoot) {
    const registryNames = new Set(availableSkills.map((s) => s.name));
    const extraInstalled = Object.keys(manifest.skills).filter((name) => !registryNames.has(name));

    if (extraInstalled.length > 0) {
      logger.log('Other Managed Skills in Project:');
      logger.log('--------------------------------');
      for (const name of extraInstalled) {
        const item = manifest.skills[name]!;
        logger.log(`  * ${name} [Installed (${item.adapter})] - ${item.description ?? 'No description'}`);
      }
      logger.log('');
    }
  }
}
