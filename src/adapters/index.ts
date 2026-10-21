import type { AgentAdapter } from './types.js';
import { antigravityAdapter } from './antigravity.js';
import { claudeCodeAdapter } from './claude-code.js';
import { codexAdapter } from './codex.js';
import { universalAdapter } from './universal.js';
import { AdapterNotFoundError } from '../utils/errors.js';

export * from './types.js';
export * from './antigravity.js';
export * from './claude-code.js';
export * from './codex.js';
export * from './universal.js';

const REGISTERED_ADAPTERS: readonly AgentAdapter[] = [
  antigravityAdapter,
  claudeCodeAdapter,
  codexAdapter,
  universalAdapter,
];

const ADAPTER_MAP = new Map<string, AgentAdapter>(
  REGISTERED_ADAPTERS.map((adapter) => [adapter.id.toLowerCase(), adapter])
);

export function listAdapters(): readonly AgentAdapter[] {
  return REGISTERED_ADAPTERS;
}

export function getAdapter(id: string): AgentAdapter {
  const normalized = id.toLowerCase().trim();
  const adapter = ADAPTER_MAP.get(normalized);
  if (!adapter) {
    throw new AdapterNotFoundError(
      id,
      REGISTERED_ADAPTERS.map((a) => a.id)
    );
  }
  return adapter;
}

export interface AdapterResolutionResult {
  adapter: AgentAdapter;
  detected: boolean;
  reason: string;
}

/**
 * Resolves the target agent adapter.
 * If explicitAgent is provided, validates and returns it.
 * Otherwise attempts auto-detection.
 * If multiple agents match, requires explicit selection.
 * Defaults to universal adapter if none match.
 */
export async function resolveAdapter(
  projectRoot: string,
  explicitAgent?: string
): Promise<AdapterResolutionResult> {
  if (explicitAgent) {
    const adapter = getAdapter(explicitAgent);
    return {
      adapter,
      detected: false,
      reason: `Explicitly chosen via --agent ${adapter.id}`,
    };
  }

  const detectedMatches: AgentAdapter[] = [];
  for (const adapter of REGISTERED_ADAPTERS) {
    if (await adapter.detect(projectRoot)) {
      detectedMatches.push(adapter);
    }
  }

  if (detectedMatches.length === 1 && detectedMatches[0]) {
    return {
      adapter: detectedMatches[0],
      detected: true,
      reason: `Auto-detected ${detectedMatches[0].displayName} from project markers`,
    };
  }

  if (detectedMatches.length > 1) {
    const names = detectedMatches.map((a) => `"${a.id}" (${a.displayName})`).join(', ');
    throw new Error(
      `Multiple agent configurations detected in project (${names}).\n` +
      'Agent selection is ambiguous; please explicitly specify your target agent using --agent <name>.'
    );
  }

  // Fallback to Universal adapter
  return {
    adapter: universalAdapter,
    detected: false,
    reason: `Using default Universal Agent adapter (${universalAdapter.targetSubdir})`,
  };
}
