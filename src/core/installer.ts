import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { SkillRegistry } from './skill-registry.js';
import { resolveAdapter } from '../adapters/index.js';
import { findProjectRoot } from '../utils/project-root.js';
import { assertPathInside, pathExists, safeCopyDir, hashFile } from '../utils/fs.js';
import { SkillNotFoundError } from '../utils/errors.js';
import { readManifest, updateManifestRecord, type ManagedSkillRecord } from './manifest.js';
import { logger } from '../utils/logger.js';
import type { DiscoveredSkill } from './skill-discovery.js';

export interface InstallOptions {
  agent?: string;
  dryRun?: boolean;
  force?: boolean;
  projectDir?: string;
}

export type InstallStatus = 'installed' | 'skipped' | 'failed';

export interface SkillInstallResult {
  skillName: string;
  status: InstallStatus;
  reason?: string;
  targetDir?: string;
  filesCount?: number;
}

export interface BatchInstallResult {
  projectRoot: string;
  agentId: string;
  agentName: string;
  targetSubdir: string;
  results: SkillInstallResult[];
  summary: {
    total: number;
    installed: number;
    skipped: number;
    failed: number;
  };
}

export class SkillInstaller {
  constructor(private readonly registry: SkillRegistry = new SkillRegistry()) {}

  async installSkill(
    skillName: string,
    options: InstallOptions = {}
  ): Promise<{ result: SkillInstallResult; projectRoot: string; agentId: string }> {
    const projectRoot = await findProjectRoot(process.cwd(), options.projectDir);
    const { adapter } = await resolveAdapter(projectRoot, options.agent);

    const skill = await this.registry.getSkill(skillName);
    if (!skill) {
      const allSkills = await this.registry.listSkills();
      throw new SkillNotFoundError(
        skillName,
        allSkills.map((s) => s.name)
      );
    }

    const result = await this.performInstall(skill, projectRoot, adapter.id, options);
    return { result, projectRoot, agentId: adapter.id };
  }

  async installAll(options: InstallOptions = {}): Promise<BatchInstallResult> {
    const projectRoot = await findProjectRoot(process.cwd(), options.projectDir);
    const { adapter } = await resolveAdapter(projectRoot, options.agent);

    const availableSkills = await this.registry.listSkills();

    const results: SkillInstallResult[] = [];
    for (const skill of availableSkills) {
      const result = await this.performInstall(skill, projectRoot, adapter.id, options);
      results.push(result);
    }

    const summary = {
      total: results.length,
      installed: results.filter((r) => r.status === 'installed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'failed').length,
    };

    return {
      projectRoot,
      agentId: adapter.id,
      agentName: adapter.displayName,
      targetSubdir: adapter.targetSubdir,
      results,
      summary,
    };
  }

  private async performInstall(
    skill: DiscoveredSkill,
    projectRoot: string,
    agentId: string,
    options: InstallOptions
  ): Promise<SkillInstallResult> {
    const { adapter } = await resolveAdapter(projectRoot, agentId);
    const targetDir = adapter.getSkillTargetDir(projectRoot, skill.name);
    const relativeTargetDir = adapter.getRelativeTargetDir(skill.name);

    // Security check: ensure target directory does not escape project root
    assertPathInside(projectRoot, targetDir);

    const exists = await pathExists(targetDir);
    const manifest = await readManifest(projectRoot);
    const managedRecord = manifest?.skills[skill.name];

    if (exists) {
      if (managedRecord) {
        // Destination is already managed by us. Check idempotency.
        const isIdentical = await this.checkIfTargetMatchesManifest(projectRoot, managedRecord);
        if (isIdentical && !options.force) {
          return {
            skillName: skill.name,
            status: 'skipped',
            reason: 'Already installed and up to date.',
            targetDir,
          };
        }

        if (!options.force) {
          return {
            skillName: skill.name,
            status: 'skipped',
            reason: 'Existing files differ from recorded manifest. Use --force to overwrite.',
            targetDir,
          };
        }

        logger.warn(
          `Forced overwrite approved for skill "${skill.name}". Existing files at "${targetDir}" will be replaced.`
        );
      } else {
        // Destination directory already exists on disk and is NOT tracked in manifest
        if (!options.force) {
          return {
            skillName: skill.name,
            status: 'skipped',
            reason: 'Directory exists and is not managed by fullstack-skills. Use --force to overwrite.',
            targetDir,
          };
        }

        logger.warn(
          `Forced overwrite approved for unmanaged directory at "${targetDir}". Existing files will be replaced.`
        );
      }
    }

    if (options.dryRun) {
      return {
        skillName: skill.name,
        status: 'installed',
        reason: `[dry-run] Would install skill to ${targetDir}`,
        targetDir,
        filesCount: 1,
      };
    }

    // Proceed with atomic installation
    try {
      const copiedRecords = await safeCopyDir(skill.dirPath, targetDir, {
        destRoot: projectRoot,
        dryRun: false,
      });

      const skillFiles = copiedRecords.map((c) => ({
        path: path.posix.join(relativeTargetDir, c.relativePath),
        sha256: c.sha256,
      }));

      const record: ManagedSkillRecord = {
        name: skill.name,
        adapter: adapter.id,
        targetDir: relativeTargetDir,
        installedAt: new Date().toISOString(),
        ...(skill.metadata.version ? { version: skill.metadata.version } : {}),
        ...(skill.metadata.description ? { description: skill.metadata.description } : {}),
        files: skillFiles,
      };

      await updateManifestRecord(projectRoot, record);

      return {
        skillName: skill.name,
        status: 'installed',
        targetDir,
        filesCount: skillFiles.length,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Clean up partial directory if this was a fresh install that failed
      if (!exists && (await pathExists(targetDir))) {
        try {
          await fs.rm(targetDir, { recursive: true, force: true });
        } catch {
          // ignore rollback cleanup error
        }
      }
      return {
        skillName: skill.name,
        status: 'failed',
        reason: msg,
        targetDir,
      };
    }
  }

  private async checkIfTargetMatchesManifest(
    projectRoot: string,
    record: ManagedSkillRecord
  ): Promise<boolean> {
    for (const file of record.files) {
      const filePath = path.join(projectRoot, file.path);
      if (!(await pathExists(filePath))) {
        return false;
      }
      const currentHash = await hashFile(filePath);
      if (currentHash !== file.sha256) {
        return false;
      }
    }
    return true;
  }
}
