/**
 * SDL v2 identity and reference checks — spec/v2/FOUNDATIONS.md
 * § "Identity and references", rules ID-001 through ID-004.
 *
 * Operates on an already-decoded document fragment (per
 * spec/v2/conformance/README.md's `identity` scope: "Decoded fragment in
 * `value`"), not raw YAML — this sits after parseInputProfile(), not in
 * place of it. It does not perform schema/type validation; a field with the
 * wrong type is silently ignored here rather than reported, since that is
 * ST-001's job (ST-001, not implemented yet — see README.md).
 *
 * Coverage is intentionally partial. ID-002's table lists twenty identity
 * sets (components, entities, fields, custom integrations, environments,
 * indexes, constraints, named relationships, storage resources, data
 * instances, recovery plans, cost scenarios/comparisons, compliance
 * requirements, technical debt, teams, databases, hosting targets,
 * features, API inventory, SLO declarations). This module implements the
 * two the current conformance corpus (spec/v2/conformance/cases.yaml,
 * `scope: identity`) actually exercises:
 *
 *   - Components (`architecture.projects.{frontend,backend,mobile}[]` and
 *     `architecture.services[]`, one shared namespace) — ID-001, ID-002.
 *   - Service dependency references and their graph
 *     (`architecture.services[].dependencies[]`) — ID-003, ID-004.
 *   - SLO declarations (`slos.services[].name`) as a reference to a
 *     component — ID-002 (at most one SLO per target), ID-003.
 *
 * The other seventeen identity sets, and ID-001's separate "display
 * identity" grammar for feature/API inventory names, are not implemented.
 */

import type { Diagnostic, Path } from './diagnostics.js';

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export interface IdentityCheckResult {
  outcome: 'accept' | 'reject';
  diagnostics: Diagnostic[];
  /** Deduplicated service dependency edges, in declaration order: [from, to]. */
  edges: Array<[string, string]>;
  /** Resolved SLO -> component references checked by this pass. */
  targets: Array<{ sourcePath: Path; targetPath: Path }>;
}

interface ComponentEntry {
  name: string;
  path: Path;
  isService: boolean;
}

function violation(rule: string, message: string, path: Path = []): Diagnostic {
  return { rule, severity: 'error', category: 'validation', stage: 'structure', message, path };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectComponents(doc: Record<string, unknown>): ComponentEntry[] {
  const entries: ComponentEntry[] = [];
  const architecture = doc.architecture;
  if (!isRecord(architecture)) return entries;

  const projects = architecture.projects;
  if (isRecord(projects)) {
    for (const key of ['frontend', 'backend', 'mobile'] as const) {
      const list = projects[key];
      if (Array.isArray(list)) {
        list.forEach((item, i) => {
          if (isRecord(item) && typeof item.name === 'string') {
            entries.push({ name: item.name, path: ['architecture', 'projects', key, i], isService: false });
          }
        });
      }
    }
  }

  const services = architecture.services;
  if (Array.isArray(services)) {
    services.forEach((item, i) => {
      if (isRecord(item) && typeof item.name === 'string') {
        entries.push({ name: item.name, path: ['architecture', 'services', i], isService: true });
      }
    });
  }

  return entries;
}

/** Finds one cycle in the dependency graph via DFS with a recursion stack (grey/white/black coloring). */
function findCycle(adjacency: Map<string, Set<string>>): string[] | null {
  const color = new Map<string, 'gray' | 'black'>();
  const stack: string[] = [];

  function visit(node: string): string[] | null {
    color.set(node, 'gray');
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const state = color.get(next);
      if (state === 'gray') {
        const idx = stack.indexOf(next);
        return [...stack.slice(idx), next];
      }
      if (state === undefined) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(node, 'black');
    return null;
  }

  for (const node of adjacency.keys()) {
    if (color.get(node) === undefined) {
      const found = visit(node);
      if (found) return found;
    }
  }
  return null;
}

export function checkIdentity(doc: unknown): IdentityCheckResult {
  const diagnostics: Diagnostic[] = [];
  const d = isRecord(doc) ? doc : {};

  const components = collectComponents(d);

  // --- ID-001: identifier grammar. ---
  for (const c of components) {
    if (!IDENTIFIER_PATTERN.test(c.name)) {
      diagnostics.push(violation('ID-001', `Identifier "${c.name}" must match ${IDENTIFIER_PATTERN.source}.`, c.path));
    }
  }

  // --- ID-002: components share one global namespace, exact case-sensitive
  // comparison, at most one entry per name. ---
  const componentsByName = new Map<string, ComponentEntry[]>();
  for (const c of components) {
    const list = componentsByName.get(c.name) ?? [];
    list.push(c);
    componentsByName.set(c.name, list);
  }
  for (const [name, list] of componentsByName) {
    if (list.length > 1) {
      diagnostics.push(
        violation(
          'ID-002',
          `Component identifier "${name}" is declared more than once (shared namespace across frontend/backend/mobile/services).`,
          list[1]!.path,
        ),
      );
    }
  }
  // First-declared path wins for reference resolution below; a collision is
  // already reported above regardless of which path "wins" here.
  const componentPathByName = new Map<string, Path>();
  for (const c of components) {
    if (!componentPathByName.has(c.name)) componentPathByName.set(c.name, c.path);
  }

  // --- ID-003 / ID-004: service dependency references and their graph.
  // Dependencies target services specifically — "Projects and integrations
  // are not targets" (ID-003) — so this checks against the service subset
  // of `components`, not the full component namespace. ---
  const serviceNames = new Set(components.filter((c) => c.isService).map((c) => c.name));
  const services = isRecord(d.architecture) && Array.isArray(d.architecture.services) ? d.architecture.services : [];
  const adjacency = new Map<string, Set<string>>();
  const edges: Array<[string, string]> = [];

  services.forEach((svc, i) => {
    if (!isRecord(svc) || typeof svc.name !== 'string') return;
    const from = svc.name;
    const deps = Array.isArray(svc.dependencies) ? svc.dependencies : [];
    const seenForThisService = new Set<string>();
    deps.forEach((dep, depIndex) => {
      if (typeof dep !== 'string') return;
      const depPath: Path = ['architecture', 'services', i, 'dependencies', depIndex];
      if (!serviceNames.has(dep)) {
        diagnostics.push(violation('ID-003', `Dependency "${dep}" does not resolve to a declared service.`, depPath));
        return;
      }
      if (dep === from) {
        diagnostics.push(violation('ID-004', `Service "${from}" may not depend on itself.`, depPath));
        return;
      }
      // "Duplicate occurrences of the same dependency string in one list
      // describe one edge and do not create additional executions or a
      // uniqueness error" (ID-004) — dedupe silently, not an error.
      if (seenForThisService.has(dep)) return;
      seenForThisService.add(dep);
      edges.push([from, dep]);
      if (!adjacency.has(from)) adjacency.set(from, new Set());
      adjacency.get(from)!.add(dep);
    });
  });

  const cycle = findCycle(adjacency);
  if (cycle) {
    diagnostics.push(violation('ID-004', `Service dependency graph has a cycle: ${cycle.join(' -> ')}.`));
  }

  // --- SLO declarations: ID-003 (must resolve to a declared component) and
  // ID-002 ("at most one SLO entry per referenced component"). ---
  const targets: Array<{ sourcePath: Path; targetPath: Path }> = [];
  const slos = d.slos;
  const sloServices = isRecord(slos) && Array.isArray(slos.services) ? slos.services : [];
  const sloTargetsSeen = new Set<string>();
  sloServices.forEach((slo, i) => {
    if (!isRecord(slo) || typeof slo.name !== 'string') return;
    const sourcePath: Path = ['slos', 'services', i, 'name'];
    const targetPath = componentPathByName.get(slo.name);
    if (!targetPath) {
      diagnostics.push(violation('ID-003', `SLO target "${slo.name}" does not resolve to a declared component.`, sourcePath));
      return;
    }
    if (sloTargetsSeen.has(slo.name)) {
      diagnostics.push(violation('ID-002', `More than one SLO entry targets component "${slo.name}".`, sourcePath));
      return;
    }
    sloTargetsSeen.add(slo.name);
    targets.push({ sourcePath, targetPath });
  });

  return {
    outcome: diagnostics.length > 0 ? 'reject' : 'accept',
    diagnostics,
    edges,
    targets,
  };
}
