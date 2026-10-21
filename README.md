# skillforge-skills

A minimal, production-grade npm CLI package for installing agent-agnostic full-stack AI coding skills directly into your current project.

Skills provide structured, best-practice instructions that AI coding assistants (such as **Google Antigravity**, **Claude Code**, **OpenAI Codex**, and standard-compliant agent runtimes) load dynamically on demand.

> **Project-Only Guarantee**: `skillforge-skills` installs skills **strictly into the target project root**. It will **never** write to your home directory (`~`) or global agent configuration paths.

---

## Table of Contents

- [Bundled Skills](#bundled-skills)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Commands & Options](#cli-commands--options)
  - [`import [skill-name]`](#skillforge-skills-import-skill-name)
  - [`install`](#skillforge-skills-install)
  - [`add <skill-name>`](#skillforge-skills-add-skill-name)
  - [`list`](#skillforge-skills-list)
  - [`uninstall [skill-name]`](#skillforge-skills-uninstall-skill-name)
- [Supported Agent Providers](#supported-agent-providers)
  - [Google Antigravity](#google-antigravity-antigravity)
  - [Claude Code](#claude-code-claude-code)
  - [OpenAI Codex](#openai-codex-codex)
  - [Universal Agent](#universal-agent-universal)
- [Skill Format & Authoring Guide](#skill-format--authoring-guide)
- [Conflict Handling & Safety Architecture](#conflict-handling--safety-architecture)
- [Development & Testing](#development--testing)
- [Publishing to npm](#publishing-to-npm)
- [License](#license)

---

## Bundled Skills

The package comes pre-packaged with 4 general-purpose full-stack development skills:

| Skill | Name | Description |
| :--- | :--- | :--- |
| **Frontend Architecture** | `frontend` | Component-based modular architecture, component reusability (DRY audit), strict separation of business logic (hooks/services/utils), zero-emoji policy, and Bootstrap Icons standard. |
| **Backend & Systems** | `backend` | Feature-modular architecture, zero-trust input validation (runtime schemas), Data Access Layer (DAL/Repository pattern), singleton DB pools, and deterministic API envelopes. |
| **Database & Modeling** | `database` | 3NF schema design, strict data types, explicit constraints & referential actions, foreign key indexing, short ACID transaction boundaries, and zero-downtime migrations. |
| **UI/UX & Agent Experience** | `UIUX` | Human cognition principles (safe exploration, satisficing, habituation), information architecture (MECE/LATCH), visual hierarchy, and Agent Experience (AX) semantic DOM optimization. |

---

## Features

- **Project Scoped**: Automatically detects your project root (via `package.json`, `.git`, etc.) or accepts `--project-dir <path>`. Never pollutes global user configs.
- **Multi-Agent Providers**: Out-of-the-box support for **Google Antigravity** (`.agents/skills`), **Claude Code** (`.claude/skills`), **OpenAI Codex** (`.codex/skills`), and **Universal Agent Skills** (`.agents/skills`).
- **Dynamic Skill Discovery**: Skills are discovered dynamically at runtime from the `skills/` directory—no hardcoded registries.
- **Import All or Selected**: Single command (`skillforge-skills import` or `skillforge-skills install`) imports all skills in one shot.
- **Package-Owned Manifest**: Tracks all installed files with SHA-256 hashes (`.fullstack-skills-manifest.json`) for safe idempotency and non-destructive uninstallation.
- **Zero Accidental Overwrites**: Warns and skips if destination files exist or have been modified by the developer, requiring explicit `--force` to overwrite.
- **Preserves Unrelated Skills**: Uninstallation only touches package-managed files, preserving team-authored skills and custom configurations.
- **Minimal Dependencies**: Lightweight core powered by Commander, standard Node.js APIs, and strict TypeScript. No databases, LLMs, or heavy frameworks.

---

## Installation

Run directly with `npx` (no prior installation needed):

```bash
npx skillforge-skills <command>
```

Or install locally in your project:

```bash
npm install -D skillforge-skills
npx skillforge-skills --help
```

---

## Quick Start

```bash
# 1. View all available bundled skills and current project installation status
npx skillforge-skills list

# 2. Import ALL skills into the current project (auto-detects agent)
npx skillforge-skills import

# 3. Import specifically for Google Antigravity
npx skillforge-skills import --agent antigravity

# 4. Import a single skill
npx skillforge-skills import frontend

# 5. Preview changes without writing to disk
npx skillforge-skills import --dry-run

# 6. Safely remove a skill (preserves user-edited files unless --force is given)
npx skillforge-skills uninstall frontend --yes
```

---

## CLI Commands & Options

### `skillforge-skills import [skill-name]`

**Imports skills into your current project.**
If no `skill-name` is provided, **all available skills** are imported. If a `skill-name` is provided, only that specific skill is imported.

```bash
# Import all skills (auto-detects agent)
skillforge-skills import

# Import all skills for Google Antigravity
skillforge-skills import --agent antigravity

# Import all skills for Claude Code
skillforge-skills import --agent claude-code

# Import all skills for OpenAI Codex
skillforge-skills import --agent codex

# Import a single skill
skillforge-skills import backend
```

**Options:**
- `-a, --agent <agent>`: Target AI agent provider (`antigravity`, `claude-code`, `codex`, `universal`). Auto-detected if omitted.
- `--dry-run`: Previews the installation plan without writing files to disk.
- `--force`: Explicitly approves overwriting existing or modified files.
- `-p, --project-dir <path>`: Explicitly specifies the target project root directory.

---

### `skillforge-skills install`

Installs all available skills from the package registry into the current project (equivalent to `skillforge-skills import`).

```bash
skillforge-skills install [options]
```

**Options:**
- `-a, --agent <agent>`: Target AI agent provider (`antigravity`, `claude-code`, `codex`, `universal`).
- `--dry-run`: Previews actions without writing files or creating the manifest.
- `--force`: Explicitly approves overwriting existing or modified files.
- `-p, --project-dir <path>`: Explicit target project root directory.

---

### `skillforge-skills add <skill-name>`

Installs a single skill by its name into the project.

```bash
skillforge-skills add frontend
skillforge-skills add backend --agent antigravity
```

**Options:**
- `-a, --agent <agent>`: Target agent provider.
- `--dry-run`: Preview without writing to disk.
- `--force`: Explicitly approve overwriting destination files.
- `-p, --project-dir <path>`: Explicit project root directory.

---

### `skillforge-skills list`

Displays all discovered skills in the package registry and checks their installation status within the current project.

```bash
skillforge-skills list [options]
```

**Status Indicators:**
- `[Available]`: Discovered in the package, not yet installed in the current project.
- `[Installed (<agent>)]`: Installed and tracked by `.fullstack-skills-manifest.json`.
- `[Unmanaged (exists on disk)]`: Directory exists on disk but is not managed by this package.

---

### `skillforge-skills uninstall [skill-name]`

Safely removes one named skill or all managed skills from the current project.

```bash
# Remove one skill
skillforge-skills uninstall frontend --yes

# Remove all managed skills
skillforge-skills uninstall --yes
```

**Options:**
- `-y, --yes`: Non-interactive mode; bypasses interactive confirmation prompt.
- `--dry-run`: Previews which files would be deleted.
- `--force`: Forces deletion even if the user modified files since installation.
- `-p, --project-dir <path>`: Explicit project root directory.

---

## Supported Agent Providers

| Provider | Flag Value | Target Directory | Auto-Detection Markers | Scope & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Google Antigravity** | `antigravity` | `<project>/.agents/skills/<name>/` | `.agents/`, `AGENTS.md`, or `GEMINI.md` | Installs project-scoped skills for Google Antigravity IDE and CLI. |
| **Claude Code** | `claude-code` | `<project>/.claude/skills/<name>/` | `.claude/` or `CLAUDE.md` | Scoped to project root `.claude/skills/`. Never touches user `~/.claude/`. |
| **OpenAI Codex** | `codex` | `<project>/.codex/skills/<name>/` | `.codex/` or `CODEX.md` | Scoped to project root `.codex/skills/`. |
| **Universal Agent** | `universal` | `<project>/.agents/skills/<name>/` | `.skills/` (fallback default) | Conforms to the open Agent Skills standard. |

### How Agent Detection Works
1. **Explicit flag**: If `--agent <name>` is provided, that provider is always used.
2. **Auto-detection**: If markers for exactly one provider exist in the project, it is automatically selected.
3. **Ambiguity check**: If markers for multiple distinct providers exist (e.g. both `.claude/` and `.codex/` are present), the CLI stops and requires an explicit `--agent` flag to prevent writing to the wrong directory.
4. **Fallback**: If no markers exist, it defaults to `universal` (`.agents/skills/`).

---

## Skill Format & Authoring Guide

Each skill is a self-contained directory inside the `skills/` folder:

```text
skills/
└── <skill-name>/
    ├── SKILL.md             # (Required) Metadata frontmatter and instructions
    ├── scripts/             # (Optional) Executable scripts
    ├── references/          # (Optional) Reference documentation
    └── templates/           # (Optional) Starter templates or schemas
```

### `SKILL.md` Specification

`SKILL.md` must start with YAML frontmatter enclosed in `---` followed by markdown instructions:

```markdown
---
name: my-skill
description: Brief explanation of what the skill does and when the agent should activate it.
version: 1.0.0
---

# My Skill Title

## Instructions
1. Step-by-step guidance for the AI coding agent...
```

---

## Conflict Handling & Safety Architecture

```
                  ┌───────────────────────────────┐
                  │    Import / Add Command       │
                  └──────────────┬────────────────┘
                                 │
                     Resolve Project Root & Agent
                                 │
                     Check Target Directory
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
   Target Exists                                Target Does Not Exist
         │                                               │
 ┌───────┴────────────────────────┐                      │
 │ Tracked in Manifest?           │                      │
 │                                │                      │
 │ Yes: Compare SHA-256 hashes    │                      │
 │   - Identical: Skip (Up to date)                      │
 │   - Modified:  Require --force │                      │
 │                                │                      │
 │ No: Pre-existing unmanaged dir │                      │
 │   - Require --force            │                      │
 └───────┬────────────────────────┘                      │
         │ (Approved via --force)                        │
         ▼                                               ▼
  Perform Atomic Copy ───────────────► Update .fullstack-skills-manifest.json
```

### Manifest Tracking (`.fullstack-skills-manifest.json`)
Recorded in the project root:
```json
{
  "schemaVersion": 1,
  "installedBy": "fullstack-skills@1.0.0",
  "updatedAt": "2026-10-21T11:00:00.000Z",
  "skills": {
    "frontend": {
      "name": "frontend",
      "adapter": "antigravity",
      "targetDir": ".agents/skills/frontend",
      "installedAt": "2026-10-21T11:00:00.000Z",
      "version": "1.0.0",
      "description": "Frontend architecture, modular component design, strict separation of business logic, zero-emoji policy, and Bootstrap Icons.",
      "files": [
        {
          "path": ".agents/skills/frontend/SKILL.md",
          "sha256": "4a1b..."
        }
      ]
    }
  }
}
```

---

## Development & Testing

### Build and Test
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run type checker
npm run typecheck

# Run 56 automated Vitest tests
npm test
```

---

## Publishing to npm

```bash
# 1. Clean build & test
npm run build
npm test

# 2. Check tarball contents
npm pack --dry-run

# 3. Publish
npm publish
```

---

## License

[MIT](LICENSE)
