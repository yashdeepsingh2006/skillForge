import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { findProjectRoot } from '../utils/project-root.js';
import { readManifest, removeManifestRecord, type ManagedSkillRecord } from './manifest.js';
import { pathExists, hashFile, removeEmptyParents, assertPathInside } from '../utils/fs.js';

export interface UninstallOptions {
  agent?: string;
  projectDir?: string;
  yes?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export interface SkillUninstallResult {
  skillName: string;
  status: 'uninstalled' | 'skipped' | 'failed';
  reason?: string;
  removedFiles: string[];
}

export interface BatchUninstallResult {
  projectRoot: string;
  results: SkillUninstallResult[];
  summary: {
    total: number;
    uninstalled: number;
    skipped: number;
    failed: number;
  };
}

export class SkillUninstaller {
  async uninstallSkill(
    skillName: string,
    options: UninstallOptions = {}
  ): Promise<{ result: SkillUninstallResult; projectRoot: string }> {
    const projectRoot = await findProjectRoot(process.cwd(), options.projectDir);
    const manifest = await readManifest(projectRoot);

    if (!manifest || !manifest.skills[skillName]) {
      return {
        result: {
          skillName,
          status: 'skipped',
          reason: `Skill "${skillName}" is not managed by fullstack-skills in this project.`,
          removedFiles: [],
        },
        projectRoot,
      };
    }

    const record = manifest.skills[skillName]!;
    const result = await this.performUninstall(projectRoot, record, options);
    return { result, projectRoot };
  }

  async uninstallAll(options: UninstallOptions = {}): Promise<BatchUninstallResult> {
    const projectRoot = await findProjectRoot(process.cwd(), options.projectDir);
    const manifest = await readManifest(projectRoot);

    if (!manifest || Object.keys(manifest.skills).length === 0) {
      return {
        projectRoot,
        results: [],
        summary: { total: 0, uninstalled: 0, skipped: 0, failed: 0 },
      };
    }

    const results: SkillUninstallResult[] = [];
    for (const record of Object.values(manifest.skills)) {
      const res = await this.performUninstall(projectRoot, record, options);
      results.push(res);
    }

    const summary = {
      total: results.length,
      uninstalled: results.filter((r) => r.status === 'uninstalled').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'failed').length,
    };

    return { projectRoot, results, summary };
  }

  private async performUninstall(
    projectRoot: string,
    record: ManagedSkillRecord,
    options: UninstallOptions
  ): Promise<SkillUninstallResult> {
    const removedFiles: string[] = [];

    // Verify files against user modifications
    const modifiedFiles: string[] = [];
    for (const file of record.files) {
      const absPath = path.join(projectRoot, file.path);
      assertPathInside(projectRoot, absPath);

      if (await pathExists(absPath)) {
        const currentHash = await hashFile(absPath);
        if (currentHash !== file.sha256) {
          modifiedFiles.push(file.path);
        }
      }
    }

    if (modifiedFiles.length > 0 && !options.force) {
      return {
        skillName: record.name,
        status: 'skipped',
        reason:
          `Refused to remove modified files:\n    ${modifiedFiles.join('\n    ')}\n` +
          '  Use --force to remove despite modifications.',
        removedFiles: [],
      };
    }

    if (options.dryRun) {
      return {
        skillName: record.name,
        status: 'uninstalled',
        reason: `[dry-run] Would remove ${record.files.length} managed file(s).`,
        removedFiles: record.files.map((f) => f.path),
      };
    }

    try {
      // Remove only tracked files
      for (const file of record.files) {
        const absPath = path.join(projectRoot, file.path);
        if (await pathExists(absPath)) {
          await fs.unlink(absPath);
          removedFiles.push(file.path);
        }
      }

      // Clean up empty directories up to the project root
      const skillTargetAbsDir = path.join(projectRoot, record.targetDir);
      await removeEmptyParents(skillTargetAbsDir, projectRoot);

      // Remove from manifest
      await removeManifestRecord(projectRoot, record.name);

      return {
        skillName: record.name,
        status: 'uninstalled',
        removedFiles,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        skillName: record.name,
        status: 'failed',
        reason: msg,
        removedFiles,
      };
    }
  }
}
