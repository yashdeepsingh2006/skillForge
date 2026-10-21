import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { pathExists } from '../utils/fs.js';
import { ManifestError } from '../utils/errors.js';

export const MANIFEST_FILENAME = '.fullstack-skills-manifest.json';
export const MANIFEST_SCHEMA_VERSION = 1;

export interface SkillFileRecord {
  /** Relative POSIX path from project root */
  path: string;
  /** SHA-256 hash of file content when installed */
  sha256: string;
}

export interface ManagedSkillRecord {
  name: string;
  adapter: string;
  /** Relative POSIX path from project root to the skill directory */
  targetDir: string;
  installedAt: string;
  version?: string;
  description?: string;
  files: SkillFileRecord[];
}

export interface ManifestData {
  schemaVersion: number;
  installedBy: string;
  updatedAt: string;
  skills: Record<string, ManagedSkillRecord>;
}

export function getManifestPath(projectRoot: string): string {
  return path.join(projectRoot, MANIFEST_FILENAME);
}

export async function readManifest(projectRoot: string): Promise<ManifestData | null> {
  const manifestPath = getManifestPath(projectRoot);
  if (!(await pathExists(manifestPath))) {
    return null;
  }

  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as ManifestData;

    if (!parsed || typeof parsed !== 'object' || !parsed.skills) {
      throw new Error('Invalid manifest structure: missing "skills" dictionary.');
    }

    return parsed;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ManifestError(`Failed to read manifest at "${manifestPath}": ${msg}`);
  }
}

export async function writeManifest(projectRoot: string, data: ManifestData): Promise<void> {
  const manifestPath = getManifestPath(projectRoot);
  try {
    const serialized = JSON.stringify(data, null, 2) + '\n';
    await fs.writeFile(manifestPath, serialized, 'utf8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ManifestError(`Failed to save manifest at "${manifestPath}": ${msg}`);
  }
}

export async function updateManifestRecord(
  projectRoot: string,
  skillRecord: ManagedSkillRecord,
  packageVersion: string = '1.0.0'
): Promise<ManifestData> {
  const current = (await readManifest(projectRoot)) ?? {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    installedBy: `skillforge-skills@${packageVersion}`,
    updatedAt: new Date().toISOString(),
    skills: {},
  };

  current.updatedAt = new Date().toISOString();
  current.skills[skillRecord.name] = skillRecord;

  await writeManifest(projectRoot, current);
  return current;
}

export async function removeManifestRecord(
  projectRoot: string,
  skillName: string
): Promise<{ remainingCount: number }> {
  const current = await readManifest(projectRoot);
  if (!current) {
    return { remainingCount: 0 };
  }

  delete current.skills[skillName];
  const remainingKeys = Object.keys(current.skills);

  if (remainingKeys.length === 0) {
    // If no managed skills remain, cleanly remove the manifest file
    const manifestPath = getManifestPath(projectRoot);
    if (await pathExists(manifestPath)) {
      await fs.unlink(manifestPath);
    }
    return { remainingCount: 0 };
  }

  current.updatedAt = new Date().toISOString();
  await writeManifest(projectRoot, current);
  return { remainingCount: remainingKeys.length };
}
