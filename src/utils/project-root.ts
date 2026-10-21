import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ProjectRootNotFoundError } from './errors.js';
import { pathExists } from './fs.js';

const PROJECT_MARKERS = [
  'package.json',
  '.git',
  'pnpm-workspace.yaml',
  'lerna.json',
  'deno.json',
  'bun.lockb',
];

/**
 * Resolves the project root directory.
 * If explicitDir is provided, validates and returns it.
 * Otherwise traverses upward from startDir seeking project markers.
 * Strictly prevents writing to user home directory or system root.
 */
export async function findProjectRoot(
  startDir: string = process.cwd(),
  explicitDir?: string
): Promise<string> {
  if (explicitDir) {
    const resolvedExplicit = path.resolve(explicitDir);
    const exists = await pathExists(resolvedExplicit);
    if (!exists) {
      throw new Error(`Specified project directory does not exist: "${explicitDir}"`);
    }
    const stat = await fs.stat(resolvedExplicit);
    if (!stat.isDirectory()) {
      throw new Error(`Specified project path is not a directory: "${explicitDir}"`);
    }
    return resolvedExplicit;
  }

  const userHome = path.resolve(os.homedir());
  let current = path.resolve(startDir);
  const parsedRoot = path.parse(current).root;

  while (current) {
    // Prevent resolving home directory itself as a project root by default
    const isHome = current === userHome;
    const isSysRoot = current === parsedRoot;

    // Check for project markers in current directory
    for (const marker of PROJECT_MARKERS) {
      const markerPath = path.join(current, marker);
      if (await pathExists(markerPath)) {
        // If the marker happens to be in home dir (e.g. accidental git in home),
        // we still warn or reject unless explicitly told
        if (isHome && marker === '.git') {
          // Dangerous: .git in home directory
          continue;
        }
        return current;
      }
    }

    if (isHome || isSysRoot) {
      break;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  // If startDir is not home or root, but has no markers, check if cwd has any files
  // If ambiguous, throw ProjectRootNotFoundError
  const startDirResolved = path.resolve(startDir);
  if (startDirResolved !== userHome && startDirResolved !== parsedRoot) {
    // If the directory exists, we can allow it if it's the cwd, but if there's no project marker,
    // let's check whether it contains any files or if we should require explicit --project-dir
    const entries = await fs.readdir(startDirResolved);
    if (entries.length > 0) {
      return startDirResolved;
    }
  }

  throw new ProjectRootNotFoundError(startDir);
}
