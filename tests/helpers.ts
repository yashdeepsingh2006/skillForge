import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface TestWorkspace {
  root: string;
  cleanup: () => Promise<void>;
  createFile: (relativePath: string, content: string) => Promise<string>;
  readFile: (relativePath: string) => Promise<string>;
  exists: (relativePath: string) => Promise<boolean>;
}

export async function createTestWorkspace(prefix: string = 'test-fs-'): Promise<TestWorkspace> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

  const workspace: TestWorkspace = {
    root: tmpDir,
    async cleanup() {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors in tests
      }
    },
    async createFile(relativePath: string, content: string): Promise<string> {
      const fullPath = path.join(tmpDir, relativePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
      return fullPath;
    },
    async readFile(relativePath: string): Promise<string> {
      const fullPath = path.join(tmpDir, relativePath);
      return fs.readFile(fullPath, 'utf8');
    },
    async exists(relativePath: string): Promise<boolean> {
      try {
        await fs.access(path.join(tmpDir, relativePath));
        return true;
      } catch {
        return false;
      }
    },
  };

  return workspace;
}

/**
 * Creates a mock skill directory inside a test directory.
 * Note: These are strictly synthetic test fixtures to verify installer mechanics.
 */
export async function createMockSkill(
  skillsDir: string,
  name: string,
  description: string = 'Synthetic test fixture for automated testing',
  extraFiles: Record<string, string> = {}
): Promise<string> {
  const skillDir = path.join(skillsDir, name);
  await fs.mkdir(skillDir, { recursive: true });

  const skillContent = `---
name: ${name}
description: ${description}
version: 1.0.0
---

# Test Fixture: ${name}
This is a synthetic test fixture used only for unit testing the installer mechanics.
`;

  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent, 'utf8');

  for (const [subPath, content] of Object.entries(extraFiles)) {
    const fullPath = path.join(skillDir, subPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
  }

  return skillDir;
}
