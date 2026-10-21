import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { pathExists } from '../utils/fs.js';
import { validateSkillName, validateSkillContent, type SkillMetadata } from '../utils/validator.js';

export interface DiscoveredSkill {
  readonly name: string;
  readonly dirPath: string;
  readonly skillFilePath: string;
  readonly metadata: SkillMetadata;
}

export interface DiscoveryResult {
  skills: DiscoveredSkill[];
  warnings: string[];
}

/**
 * Discovers skills from a source directory.
 * Never throws on malformed skills; aggregates valid skills and actionable warnings.
 */
export async function discoverSkills(skillsDir: string): Promise<DiscoveryResult> {
  const skills: DiscoveredSkill[] = [];
  const warnings: string[] = [];

  const exists = await pathExists(skillsDir);
  if (!exists) {
    return { skills, warnings: [`Skills directory "${skillsDir}" does not exist.`] };
  }

  const entries = await fs.readdir(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    // Ignore hidden files, files like .gitkeep, and non-directories
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }

    const nameValidation = validateSkillName(entry.name);
    if (!nameValidation.isValid) {
      warnings.push(`Skipping "${entry.name}": ${nameValidation.error}`);
      continue;
    }

    const skillDirPath = path.join(skillsDir, entry.name);
    const subEntries = await fs.readdir(skillDirPath);
    const skillFileName = subEntries.find((f) => f.toLowerCase() === 'skill.md');

    if (!skillFileName) {
      warnings.push(`Skipping "${entry.name}": directory is missing required "SKILL.md" file.`);
      continue;
    }

    const skillFilePath = path.join(skillDirPath, skillFileName);

    try {
      const content = await fs.readFile(skillFilePath, 'utf8');
      const validation = validateSkillContent(content, entry.name);

      if (!validation.isValid || !validation.metadata) {
        warnings.push(
          `Skipping "${entry.name}": invalid SKILL.md metadata:\n  ${validation.errors.join('\n  ')}`
        );
        continue;
      }

      skills.push({
        name: entry.name,
        dirPath: skillDirPath,
        skillFilePath,
        metadata: validation.metadata,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Error reading "${entry.name}/SKILL.md": ${msg}`);
    }
  }

  // Sort deterministically by skill name
  skills.sort((a, b) => a.name.localeCompare(b.name));

  return { skills, warnings };
}
