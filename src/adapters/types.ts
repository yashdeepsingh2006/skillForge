export interface AgentAdapter {
  /** Unique identifier for CLI flag --agent <id> */
  readonly id: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Concise description of how and where this adapter stores skills */
  readonly description: string;

  /** Relative path template from project root, e.g. '.claude/skills' */
  readonly targetSubdir: string;

  /** Known limitations or prerequisites */
  readonly limitations: readonly string[];

  /**
   * Evaluates project markers to see if this project targets this agent.
   */
  detect(projectRoot: string): Promise<boolean>;

  /**
   * Computes the absolute target directory for a skill.
   */
  getSkillTargetDir(projectRoot: string, skillName: string): string;

  /**
   * Computes the relative path from project root for display or manifest tracking.
   */
  getRelativeTargetDir(skillName: string): string;
}
