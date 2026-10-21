import { describe, it, expect } from 'vitest';
import { validateSkillName, validateSkillContent } from '../src/utils/validator.js';

describe('validateSkillName', () => {
  it('accepts valid alphanumeric names with hyphens and underscores', () => {
    expect(validateSkillName('backend-api').isValid).toBe(true);
    expect(validateSkillName('node_typescript').isValid).toBe(true);
    expect(validateSkillName('react18').isValid).toBe(true);
    expect(validateSkillName('fullstack-skill-v2').isValid).toBe(true);
  });

  it('rejects empty or whitespace names', () => {
    expect(validateSkillName('').isValid).toBe(false);
    expect(validateSkillName('   ').isValid).toBe(false);
  });

  it('rejects path traversal attempts', () => {
    expect(validateSkillName('..').isValid).toBe(false);
    expect(validateSkillName('../skill').isValid).toBe(false);
    expect(validateSkillName('skill/nested').isValid).toBe(false);
    expect(validateSkillName('skill\\nested').isValid).toBe(false);
  });

  it('rejects names starting with dot or hyphen', () => {
    expect(validateSkillName('.hidden').isValid).toBe(false);
    expect(validateSkillName('-flag').isValid).toBe(false);
  });

  it('rejects names exceeding 64 characters', () => {
    const longName = 'a'.repeat(65);
    expect(validateSkillName(longName).isValid).toBe(false);
  });
});

describe('validateSkillContent', () => {
  it('parses valid YAML frontmatter and extracts metadata', () => {
    const content = `---
name: test-skill
description: A mock skill for testing
version: 1.0.0
tags:
  - test
  - node
---

# Instructions
Do something.
`;

    const result = validateSkillContent(content, 'test-skill');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.metadata).toEqual({
      name: 'test-skill',
      description: 'A mock skill for testing',
      version: '1.0.0',
      tags: ['test', 'node'],
    });
  });

  it('rejects empty content', () => {
    const result = validateSkillContent('');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('SKILL.md file is empty');
  });

  it('rejects content without frontmatter delimiters', () => {
    const result = validateSkillContent('# Just markdown without frontmatter');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must start with YAML frontmatter');
  });

  it('rejects unterminated frontmatter', () => {
    const content = `---
name: incomplete
description: test
`;
    const result = validateSkillContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('not properly terminated');
  });

  it('rejects missing name or description', () => {
    const content = `---
version: 1.0.0
---
`;
    const result = validateSkillContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Missing required frontmatter field: "name"'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Missing required frontmatter field: "description"'))).toBe(true);
  });

  it('rejects mismatched directory and frontmatter name', () => {
    const content = `---
name: other-name
description: Test
---
`;
    const result = validateSkillContent(content, 'expected-name');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('does not match skill directory name'))).toBe(true);
  });

  it('rejects invalid YAML syntax', () => {
    const content = `---
name: [broken yaml
description: test
---
`;
    const result = validateSkillContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Failed to parse YAML frontmatter');
  });
});
