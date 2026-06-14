import type { QuestStep } from "./types";

/**
 * Dependency-aware scheduling utilities for the execution graph.
 *
 * A Quest Plan is a DAG: each step may declare `dependsOn` referencing the ids
 * of steps whose outputs it consumes. `scheduleWaves` validates the graph and
 * returns ordered "waves" — within a wave, steps are independent and can run
 * concurrently; waves run sequentially.
 */

export interface GraphValidationError {
  code: "MISSING_DEPENDENCY" | "DUPLICATE_ID" | "CYCLE";
  message: string;
  detail?: unknown;
}

export class QuestGraphError extends Error {
  constructor(public readonly errors: GraphValidationError[]) {
    super(errors.map((e) => `[${e.code}] ${e.message}`).join("; "));
    this.name = "QuestGraphError";
  }
}

/**
 * Validate a step list as a DAG and return execution waves via Kahn's
 * algorithm. Throws QuestGraphError on duplicate ids, dangling dependencies,
 * or cycles.
 */
export function scheduleWaves(steps: QuestStep[]): QuestStep[][] {
  const errors: GraphValidationError[] = [];

  const byId = new Map<string, QuestStep>();
  for (const step of steps) {
    if (byId.has(step.id)) {
      errors.push({
        code: "DUPLICATE_ID",
        message: `Duplicate step id: ${step.id}`,
        detail: step.id,
      });
    }
    byId.set(step.id, step);
  }

  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const step of steps) {
    indegree.set(step.id, 0);
    dependents.set(step.id, []);
  }

  for (const step of steps) {
    for (const dep of step.dependsOn ?? []) {
      if (!byId.has(dep)) {
        errors.push({
          code: "MISSING_DEPENDENCY",
          message: `Step "${step.id}" depends on unknown step "${dep}"`,
          detail: { step: step.id, dependency: dep },
        });
        continue;
      }
      indegree.set(step.id, (indegree.get(step.id) ?? 0) + 1);
      dependents.get(dep)!.push(step.id);
    }
  }

  if (errors.length) throw new QuestGraphError(errors);

  // Kahn's algorithm, grouped into level sets (waves).
  let frontier = steps.filter((s) => (indegree.get(s.id) ?? 0) === 0);
  const waves: QuestStep[][] = [];
  let processed = 0;

  while (frontier.length) {
    waves.push(frontier);
    processed += frontier.length;
    const next: QuestStep[] = [];
    for (const step of frontier) {
      for (const dependentId of dependents.get(step.id) ?? []) {
        const remaining = (indegree.get(dependentId) ?? 0) - 1;
        indegree.set(dependentId, remaining);
        if (remaining === 0) next.push(byId.get(dependentId)!);
      }
    }
    frontier = next;
  }

  if (processed !== steps.length) {
    const stuck = steps.filter((s) => (indegree.get(s.id) ?? 0) > 0).map((s) => s.id);
    throw new QuestGraphError([
      {
        code: "CYCLE",
        message: `Execution graph contains a cycle involving: ${stuck.join(", ")}`,
        detail: stuck,
      },
    ]);
  }

  return waves;
}
