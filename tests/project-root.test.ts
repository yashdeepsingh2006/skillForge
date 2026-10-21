import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { findProjectRoot } from '../src/utils/project-root.js';
import { createTestWorkspace, type TestWorkspace } from './helpers.js';
import { ProjectRootNotFoundError } from '../src/utils/errors.js';

describe('findProjectRoot', () => {
  let ws: TestWorkspace;

  beforeEach(async () => {
    ws = await createTestWorkspace('proj-root-');
  });

  afterEach(async () => {
    await ws.cleanup();
  });

  it('identifies project root containing package.json', async () => {
    await ws.createFile('package.json', '{"name": "test-project"}');
    const root = await findProjectRoot(ws.root);
    expect(path.resolve(root)).toBe(path.resolve(ws.root));
  });

  it('resolves project root from nested subdirectories', async () => {
    await ws.createFile('package.json', '{"name": "test-project"}');
    await ws.createFile('src/deep/nested/index.ts', 'console.log("nested");');

    const nestedDir = path.join(ws.root, 'src', 'deep', 'nested');
    const root = await findProjectRoot(nestedDir);
    expect(path.resolve(root)).toBe(path.resolve(ws.root));
  });

  it('identifies project root containing .git directory', async () => {
    await ws.createFile('.git/config', '[core]\nrepositoryformatversion = 0');
    await ws.createFile('packages/sub/file.txt', 'hello');

    const subDir = path.join(ws.root, 'packages', 'sub');
    const root = await findProjectRoot(subDir);
    expect(path.resolve(root)).toBe(path.resolve(ws.root));
  });

  it('honors explicit directory argument', async () => {
    await ws.createFile('custom-target/README.md', '# Target');
    const customTarget = path.join(ws.root, 'custom-target');

    const resolved = await findProjectRoot(ws.root, customTarget);
    expect(path.resolve(resolved)).toBe(path.resolve(customTarget));
  });

  it('throws an error if explicit directory does not exist', async () => {
    const nonExistent = path.join(ws.root, 'non-existent-dir');
    await expect(findProjectRoot(ws.root, nonExistent)).rejects.toThrow(
      'Specified project directory does not exist'
    );
  });
});
