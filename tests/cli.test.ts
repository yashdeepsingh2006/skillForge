import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';

const execFileAsync = promisify(execFile);
const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');

describe('CLI Execution & Argument Parsing', () => {
  it('outputs help text with --help including import command', async () => {
    const { stdout } = await execFileAsync('node', [CLI_PATH, '--help']);
    expect(stdout).toContain('skillforge-skills');
    expect(stdout).toContain('install');
    expect(stdout).toContain('import');
    expect(stdout).toContain('<skill-name>');
    expect(stdout).toContain('list');
    expect(stdout).toContain('uninstall');
  });

  it('outputs version with --version', async () => {
    const { stdout } = await execFileAsync('node', [CLI_PATH, '--version']);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('runs import command in dry-run mode for all skills', async () => {
    const { stdout, stderr } = await execFileAsync('node', [CLI_PATH, 'import', '--dry-run']);
    expect(stdout).toContain('[dry-run]');
    expect(stderr).toContain('Dry-run mode active');
    expect(stdout).toContain('backend');
    expect(stdout).toContain('database');
    expect(stdout).toContain('frontend');
    expect(stdout).toContain('UIUX');
    expect(stdout).toContain('Summary: 4 installed, 0 skipped, 0 failed');
  });

  it('lists discovered bundled skills with list command', async () => {
    const { stdout } = await execFileAsync('node', [CLI_PATH, 'list']);
    expect(stdout).toContain('Available Skills:');
    expect(stdout).toContain('backend');
    expect(stdout).toContain('database');
    expect(stdout).toContain('frontend');
    expect(stdout).toContain('UIUX');
  });

  it('fails with non-zero exit code when add is called with missing argument', async () => {
    try {
      await execFileAsync('node', [CLI_PATH, 'add']);
      expect.fail('Should have failed');
    } catch (err: unknown) {
      const execError = err as { code?: number; stderr?: string };
      expect(execError.code).toBe(1);
    }
  });

  it('fails cleanly with non-zero exit code on unknown command', async () => {
    try {
      await execFileAsync('node', [CLI_PATH, 'unknown-cmd']);
      expect.fail('Should have failed');
    } catch (err: unknown) {
      const execError = err as { code?: number };
      expect(execError.code).toBe(1);
    }
  });
});
