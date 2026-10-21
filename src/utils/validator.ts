import * as yaml from 'yaml';

export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  author?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  metadata?: SkillMetadata;
}

/**
 * Validates a skill directory name.
 * Prevents directory traversal, spaces, and unsafe characters.
 */
export function validateSkillName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Skill name cannot be empty.' };
  }

  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return { isValid: false, error: 'Skill name cannot contain path separators or traversal characters (..).' };
  }

  if (name.startsWith('.') || name.startsWith('-')) {
    return { isValid: false, error: 'Skill name cannot start with a dot or hyphen.' };
  }

  if (name.length > 64) {
    return { isValid: false, error: 'Skill name cannot exceed 64 characters.' };
  }

  // Safe characters: alphanumeric, hyphens, underscores
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
  if (!validPattern.test(name)) {
    return {
      isValid: false,
      error: `Invalid skill name "${name}". Only alphanumeric characters, hyphens, and underscores are allowed.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates SKILL.md content, extracting and verifying required YAML frontmatter.
 */
export function validateSkillContent(content: string, expectedDirName?: string): ValidationResult {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    return { isValid: false, errors: ['SKILL.md file is empty.'] };
  }

  // Check for YAML frontmatter delimiters
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return {
      isValid: false,
      errors: ['SKILL.md must start with YAML frontmatter enclosed in "---".'],
    };
  }

  const endDelimiterIndex = trimmed.indexOf('\n---', 3);
  if (endDelimiterIndex === -1) {
    return {
      isValid: false,
      errors: ['SKILL.md frontmatter is not properly terminated with closing "---".'],
    };
  }

  const frontmatterStr = trimmed.slice(3, endDelimiterIndex).trim();
  let parsed: unknown;

  try {
    parsed = yaml.parse(frontmatterStr);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      errors: [`Failed to parse YAML frontmatter: ${msg}`],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      errors: ['Frontmatter must be a YAML key-value mapping.'],
    };
  }

  const record = parsed as Record<string, unknown>;

  if (!record['name'] || typeof record['name'] !== 'string' || record['name'].trim() === '') {
    errors.push('Missing required frontmatter field: "name" (must be a non-empty string).');
  }

  if (!record['description'] || typeof record['description'] !== 'string' || record['description'].trim() === '') {
    errors.push('Missing required frontmatter field: "description" (must be a non-empty string).');
  }

  if (expectedDirName && typeof record['name'] === 'string') {
    const normalizedName = record['name'].trim();
    if (normalizedName.toLowerCase() !== expectedDirName.toLowerCase()) {
      errors.push(`Frontmatter name "${normalizedName}" does not match skill directory name "${expectedDirName}".`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const metadata: SkillMetadata = {
    name: (record['name'] as string).trim(),
    description: (record['description'] as string).trim(),
    ...(record['version'] ? { version: String(record['version']) } : {}),
    ...(record['author'] ? { author: String(record['author']) } : {}),
    ...(Array.isArray(record['tags']) ? { tags: record['tags'].map(String) } : {}),
  };

  return { isValid: true, errors: [], metadata };
}
