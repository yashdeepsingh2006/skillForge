export class FullstackSkillsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FullstackSkillsError';
  }
}

export class SkillNotFoundError extends FullstackSkillsError {
  constructor(public readonly skillName: string, availableSkills: string[] = []) {
    const hint = availableSkills.length > 0
      ? `\nAvailable skills:\n  - ${availableSkills.join('\n  - ')}`
      : '\nNo skills are currently available in the registry.';
    super(`Skill "${skillName}" not found.${hint}`);
    this.name = 'SkillNotFoundError';
  }
}

export class SkillValidationError extends FullstackSkillsError {
  constructor(public readonly skillName: string, public readonly validationErrors: string[]) {
    super(`Skill "${skillName}" failed validation:\n  - ${validationErrors.join('\n  - ')}`);
    this.name = 'SkillValidationError';
  }
}

export class ProjectRootNotFoundError extends FullstackSkillsError {
  constructor(startDir: string) {
    super(
      `Could not unambiguously determine project root from "${startDir}".\n` +
      'Please run the command from within a project containing a package.json or .git directory, ' +
      'or specify the project root explicitly using the --project-dir <path> option.'
    );
    this.name = 'ProjectRootNotFoundError';
  }
}

export class AdapterNotFoundError extends FullstackSkillsError {
  constructor(adapterName: string, availableAdapters: string[]) {
    super(
      `Unsupported agent adapter "${adapterName}".\n` +
      `Supported adapters: ${availableAdapters.join(', ')}`
    );
    this.name = 'AdapterNotFoundError';
  }
}

export class PathTraversalError extends FullstackSkillsError {
  constructor(attemptedPath: string, basePath: string) {
    super(`Security error: path "${attemptedPath}" traverses outside authorized root "${basePath}".`);
    this.name = 'PathTraversalError';
  }
}

export class InstallationConflictError extends FullstackSkillsError {
  constructor(public readonly skillName: string, public readonly targetPath: string, reason: string) {
    super(
      `Installation conflict for skill "${skillName}" at "${targetPath}": ${reason}\n` +
      'Use --force to explicitly approve overwriting existing files.'
    );
    this.name = 'InstallationConflictError';
  }
}

export class ManifestError extends FullstackSkillsError {
  constructor(message: string) {
    super(`Manifest error: ${message}`);
    this.name = 'ManifestError';
  }
}
