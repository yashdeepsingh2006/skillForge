import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { isPathInside, assertPathInside, safeCopyDir } from '../src/utils/fs.js';
import { PathTraversalError } from '../src/utils/errors.js';
import { createTestWorkspace, type TestWorkspace } from './helpers.js';

describe('Security & Path Traversal Protections', () => {
  let ws: TestWorkspace;

  beforeEach(async () => {
    ws = await createTestWorkspace('security-');
  });

  afterEach(async () => {
    await ws.cleanup();
  });

  it('correctly validates whether a path is inside a base directory', () => {
    const base = path.resolve('/var/app/project');
    const validChild = path.resolve('/var/app/project/skills/sub');
    const validSame = path.resolve('/var/app/project');
    const invalidParent = path.resolve('/var/app');
    const invalidTraverse = path.resolve('/var/app/project/../other');

    expect(isPathInside(base, validChild)).toBe(true);
    expect(isPathInside(base, validSame)).toBe(true);
    expect(isPathInside(base, invalidParent)).toBe(false);
    expect(isPathInside(base, invalidTraverse)).toBe(false);
  });

  it('assertPathInside throws PathTraversalError for escaping paths', () => {
    const base = path.resolve(ws.root, 'project');
    const outside = path.resolve(ws.root, 'outside');

    expect(() => assertPathInside(base, outside)).toThrow(PathTraversalError);
  });

  it('blocks safeCopyDir when dest is outside authorized destRoot', async () => {
    const src = path.join(ws.root, 'src-dir');
    const projectRoot = path.join(ws.root, 'project');
    const maliciousDest = path.join(ws.root, 'outside-dest');

    await ws.createFile('src-dir/file.txt', 'payload');

    await expect(
      safeCopyDir(src, maliciousDest, { destRoot: projectRoot })
    ).rejects.toThrow(PathTraversalError);
  });
});
