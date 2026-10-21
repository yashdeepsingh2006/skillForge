import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { PathTraversalError } from './errors.js';

/**
 * Checks whether childPath is strictly inside parentPath (or equal to it).
 */
export function isPathInside(parentPath: string, childPath: string): boolean {
  const resolvedParent = path.resolve(parentPath);
  const resolvedChild = path.resolve(childPath);

  if (resolvedParent === resolvedChild) {
    return true;
  }

  const relative = path.relative(resolvedParent, resolvedChild);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Assert that a target path is inside an allowed base directory.
 */
export function assertPathInside(basePath: string, targetPath: string): void {
  if (!isPathInside(basePath, targetPath)) {
    throw new PathTraversalError(targetPath, basePath);
  }
}

/**
 * Checks if a file or directory exists.
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures directory exists, creating parent directories if needed.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Calculate SHA-256 hash of a file.
 */
export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Calculate SHA-256 hash of a string or buffer.
 */
export function hashContent(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export interface CopiedFileRecord {
  relativePath: string;
  sha256: string;
}

/**
 * Recursively inspect and copy a directory safely.
 * Validates against path traversal and symlinks escaping boundaries.
 */
export async function safeCopyDir(
  srcDir: string,
  destDir: string,
  options: { dryRun?: boolean; destRoot?: string } = {}
): Promise<CopiedFileRecord[]> {
  const { dryRun = false, destRoot } = options;
  const resolvedSrc = path.resolve(srcDir);
  const resolvedDest = path.resolve(destDir);

  if (destRoot) {
    assertPathInside(destRoot, resolvedDest);
  }

  const results: CopiedFileRecord[] = [];

  async function walk(currentSrc: string, currentDest: string): Promise<void> {
    const entries = await fs.readdir(currentSrc, { withFileTypes: true });

    for (const entry of entries) {
      const srcItemPath = path.join(currentSrc, entry.name);
      const destItemPath = path.join(currentDest, entry.name);

      if (destRoot) {
        assertPathInside(destRoot, destItemPath);
      }

      // Check if entry is a symbolic link
      if (entry.isSymbolicLink()) {
        const realSrcPath = await fs.realpath(srcItemPath);
        if (!isPathInside(resolvedSrc, realSrcPath)) {
          throw new PathTraversalError(srcItemPath, resolvedSrc);
        }
      }

      if (entry.isDirectory()) {
        if (!dryRun) {
          await ensureDir(destItemPath);
        }
        await walk(srcItemPath, destItemPath);
      } else if (entry.isFile()) {
        const fileContent = await fs.readFile(srcItemPath);
        const sha256 = crypto.createHash('sha256').update(fileContent).digest('hex');
        const relativePath = path.relative(resolvedDest, destItemPath).replace(/\\/g, '/');

        if (!dryRun) {
          await ensureDir(path.dirname(destItemPath));
          await fs.writeFile(destItemPath, fileContent);
        }

        results.push({ relativePath, sha256 });
      }
    }
  }

  if (!dryRun) {
    await ensureDir(resolvedDest);
  }
  await walk(resolvedSrc, resolvedDest);

  return results;
}

/**
 * Cleans up empty parent directories up to a stopAt boundary.
 */
export async function removeEmptyParents(startDir: string, stopAt: string): Promise<void> {
  const resolvedStopAt = path.resolve(stopAt);
  let current = path.resolve(startDir);

  while (current !== resolvedStopAt && isPathInside(resolvedStopAt, current)) {
    try {
      const files = await fs.readdir(current);
      if (files.length === 0) {
        await fs.rmdir(current);
        current = path.dirname(current);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}
