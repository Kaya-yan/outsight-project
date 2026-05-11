import type { Annotation, CodingNode } from "@/types/database";

export interface AgreementResult {
  agreementRate: number;
  level1Rate: number;
  level2Rate: number;
  kappa: number;
  matchedCount: number;
  totalPairs: number;
  coderAOnly: number;
  coderBOnly: number;
}

/**
 * Calculate inter-coder agreement between two sets of annotations.
 * Each annotation set is keyed by node_id for comparison.
 */
export function calcAgreement(
  annotationsA: Annotation[],
  annotationsB: Annotation[],
  nodes: CodingNode[],
): AgreementResult {
  const nodeMap = new Map<string, CodingNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Build node sets for each coder
  const nodesA = new Set(annotationsA.map((a) => a.node_id));
  const nodesB = new Set(annotationsB.map((a) => a.node_id));

  // Matched: both coders selected the same node
  const matched = new Set([...nodesA].filter((n) => nodesB.has(n)));
  const coderAOnly = new Set([...nodesA].filter((n) => !nodesB.has(n)));
  const coderBOnly = new Set([...nodesB].filter((n) => !nodesA.has(n)));

  const totalPairs = matched.size + coderAOnly.size + coderBOnly.size;
  const matchedCount = matched.size;

  // Overall agreement rate
  const agreementRate = totalPairs > 0 ? matchedCount / totalPairs : 0;

  // Level 1: top-level nodes (parent_id is null)
  const nodesAL1 = new Set(
    [...nodesA].filter((n) => {
      const node = nodeMap.get(n);
      return node && !node.parent_id;
    }),
  );
  const nodesBL1 = new Set(
    [...nodesB].filter((n) => {
      const node = nodeMap.get(n);
      return node && !node.parent_id;
    }),
  );
  const matchedL1 = new Set([...nodesAL1].filter((n) => nodesBL1.has(n)));
  const totalL1 = nodesAL1.size + nodesBL1.size - matchedL1.size;
  const level1Rate = totalL1 > 0 ? matchedL1.size / totalL1 : 0;

  // Level 2: child nodes
  const nodesAL2 = new Set(
    [...nodesA].filter((n) => {
      const node = nodeMap.get(n);
      return node && node.parent_id;
    }),
  );
  const nodesBL2 = new Set(
    [...nodesB].filter((n) => {
      const node = nodeMap.get(n);
      return node && node.parent_id;
    }),
  );
  const matchedL2 = new Set([...nodesAL2].filter((n) => nodesBL2.has(n)));
  const totalL2 = nodesAL2.size + nodesBL2.size - matchedL2.size;
  const level2Rate = totalL2 > 0 ? matchedL2.size / totalL2 : 0;

  // Cohen's Kappa
  const kappa = calcCohensKappa(annotationsA, annotationsB, nodes);

  return {
    agreementRate,
    level1Rate,
    level2Rate,
    kappa,
    matchedCount,
    totalPairs,
    coderAOnly: coderAOnly.size,
    coderBOnly: coderBOnly.size,
  };
}

/**
 * Calculate Cohen's Kappa coefficient.
 * κ = (Po - Pe) / (1 - Pe)
 *   Po = observed agreement
 *   Pe = expected agreement by chance
 */
function calcCohensKappa(
  annotationsA: Annotation[],
  annotationsB: Annotation[],
  nodes: CodingNode[],
): number {
  if (nodes.length === 0) return 0;

  // Count node occurrences for each coder
  const countsA = new Map<string, number>();
  const countsB = new Map<string, number>();
  const totalA = annotationsA.length || 1;
  const totalB = annotationsB.length || 1;

  for (const a of annotationsA) {
    countsA.set(a.node_id, (countsA.get(a.node_id) ?? 0) + 1);
  }
  for (const b of annotationsB) {
    countsB.set(b.node_id, (countsB.get(b.node_id) ?? 0) + 1);
  }

  // Observed agreement (Po): proportion of matching node selections
  let po = 0;
  const allNodeIds = new Set([
    ...annotationsA.map((a) => a.node_id),
    ...annotationsB.map((b) => b.node_id),
  ]);
  for (const nodeId of allNodeIds) {
    const pA = (countsA.get(nodeId) ?? 0) / totalA;
    const pB = (countsB.get(nodeId) ?? 0) / totalB;
    po += Math.min(pA, pB);
  }

  // Expected agreement (Pe): sum of (pA_i * pB_i)
  let pe = 0;
  for (const nodeId of allNodeIds) {
    const pA = (countsA.get(nodeId) ?? 0) / totalA;
    const pB = (countsB.get(nodeId) ?? 0) / totalB;
    pe += pA * pB;
  }

  if (Math.abs(1 - pe) < 0.0001) return 1;
  return (po - pe) / (1 - pe);
}
