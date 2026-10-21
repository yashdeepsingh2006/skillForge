---
name: frontend
description: Frontend architecture, modular component design, strict separation of business logic, zero-emoji policy, and Bootstrap Icons.
version: 1.0.0
---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

AI Agent Frontend Architecture & Development Guidelines

1. Role & Objective

You are an expert Frontend Software Engineer. When generating, refactoring, or reviewing code in this repository, you must strictly adhere to the architectural, structural, and styling constraints defined in this document.

2. Core Architectural Principles

Component-Based Architecture

Design and build modular, single-responsibility, and self-contained UI components.

Avoid monolithic views or large, tightly coupled files. Break complex interfaces down into smaller, manageable sub-components.

Component Reusability (DRY Principle)

Audit First: Before creating any new UI component, inspect the existing /components directory.

Reuse & Extend: Always reuse existing atomic/shared components (e.g., buttons, inputs, modals, cards). If a variation is needed, extend the existing component via props or composition rather than duplicating code.

Strict Separation of Business Logic

Presentational Components: Keep UI components focused strictly on rendering and user interaction events.

Decoupled Logic: Extract all business logic, data transformation, validation, API integrations, and complex state management out of view components.

Where Logic Belongs:

Custom Hooks (/hooks) for component-level state and lifecycle logic.

Services (/services) for API calls and external data fetching.

Utilities (/utils) for pure helper functions and data formatting.

3. Project Structure & Naming Conventions

Standardized Directory Structure

Maintain the following folder hierarchy across the project:

src/
├── components/
│   ├── common/          # Reusable atomic UI elements (Buttons, Inputs, Modals)
│   ├── layout/          # Structural components (Header, Sidebar, Footer)
│   └── features/        # Feature-specific composite components
├── hooks/               # Custom hooks encapsulating stateful/business logic
├── pages/ (or views/)   # Route-level container components
├── services/            # API clients, endpoints, and external integrations
├── store/ (or context/) # Global state management
├── utils/               # Pure helper functions, constants, and validators
└── styles/              # Global stylesheets, variables, and theme configs


Naming Conventions

Components (Files & Folders): PascalCase (e.g., UserProfileCard.jsx, DataTable.tsx)

Hooks: camelCase prefixed with use (e.g., useAuthLogic.js, useFetchUsers.ts)

Services & Utilities: camelCase (e.g., authService.ts, dateFormatter.js)

Constants: UPPER_SNAKE_CASE (e.g., API_BASE_URL, MAX_RETRY_COUNT)

CSS/Style Classes: Follow consistent modular naming or utility class standards without inline style clutter.

4. UI, Icons & Asset Constraints

Zero Emoji Policy

Strictly Prohibited: Never use Unicode emojis anywhere in the frontend codebase, UI strings, placeholders, comments, or commit messages.

Iconography Standard

Bootstrap Icons Only: All icons across the application must be sourced and installed exclusively from Bootstrap Icons (bootstrap-icons / react-bootstrap-icons).

Do not install or import alternative icon libraries (such as FontAwesome, Lucide, Heroicons, or Material Icons) or inline arbitrary SVGs when a Bootstrap Icon equivalent exists.

5. Agent Pre-Output Checklist

Before outputting or applying any code changes, verify the following:

[ ] Did I check for and reuse existing components instead of creating duplicates?

[ ] Is all business logic, data fetching, and state calculation separated from the JSX/HTML template?

[ ] Do all file names, variables, and folders strictly follow the naming conventions?

[ ] Are there zero emojis in the code and UI text?

[ ] Are all icons imported strictly from Bootstrap Icons?