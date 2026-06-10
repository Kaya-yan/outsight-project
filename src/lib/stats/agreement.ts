import type { Annotation, CodingNode } from "@/types/database";

export interface AgreementResult {
  agreementRate: number;
  level1Rate: number;
  level2Rate: number;
  kappa: number;
  kappaL1: number;
  kappaL2: number;
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
  const matched = new Set(Array.from(nodesA).filter((n) => nodesB.has(n)));
  const coderAOnly = new Set(Array.from(nodesA).filter((n) => !nodesB.has(n)));
  const coderBOnly = new Set(Array.from(nodesB).filter((n) => !nodesA.has(n)));

  const totalPairs = matched.size + coderAOnly.size + coderBOnly.size;
  const matchedCount = matched.size;

  // Overall agreement rate
  const agreementRate = totalPairs > 0 ? matchedCount / totalPairs : 0;

  // Level 1: top-level nodes (parent_id is null)
  const nodesAL1 = new Set(
    Array.from(nodesA).filter((n) => {
      const node = nodeMap.get(n);
      return node && !node.parent_id;
    }),
  );
  const nodesBL1 = new Set(
    Array.from(nodesB).filter((n) => {
      const node = nodeMap.get(n);
      return node && !node.parent_id;
    }),
  );
  const matchedL1 = new Set(Array.from(nodesAL1).filter((n) => nodesBL1.has(n)));
  const totalL1 = nodesAL1.size + nodesBL1.size - matchedL1.size;
  const level1Rate = totalL1 > 0 ? matchedL1.size / totalL1 : 0;

  // Level 2: child nodes
  const nodesAL2 = new Set(
    Array.from(nodesA).filter((n) => {
      const node = nodeMap.get(n);
      return node && node.parent_id;
    }),
  );
  const nodesBL2 = new Set(
    Array.from(nodesB).filter((n) => {
      const node = nodeMap.get(n);
      return node && node.parent_id;
    }),
  );
  const matchedL2 = new Set(Array.from(nodesAL2).filter((n) => nodesBL2.has(n)));
  const totalL2 = nodesAL2.size + nodesBL2.size - matchedL2.size;
  const level2Rate = totalL2 > 0 ? matchedL2.size / totalL2 : 0;

  // Cohen's Kappa (standard binary classification over full node set)
  const kappa = calcCohensKappa(annotationsA, annotationsB, nodes);
  const kappaL1 = calcCohensKappa(
    annotationsA.filter((a) => { const n = nodeMap.get(a.node_id); return n && !n.parent_id; }),
    annotationsB.filter((a) => { const n = nodeMap.get(a.node_id); return n && !n.parent_id; }),
    nodes.filter((n) => !n.parent_id),
  );
  const kappaL2 = calcCohensKappa(
    annotationsA.filter((a) => { const n = nodeMap.get(a.node_id); return n && n.parent_id; }),
    annotationsB.filter((a) => { const n = nodeMap.get(a.node_id); return n && n.parent_id; }),
    nodes.filter((n) => n.parent_id),
  );

  return {
    agreementRate,
    level1Rate,
    level2Rate,
    kappa,
    kappaL1,
    kappaL2,
    matchedCount,
    totalPairs,
    coderAOnly: coderAOnly.size,
    coderBOnly: coderBOnly.size,
  };
}

/**
 * Calculate standard Cohen's Kappa coefficient.
 *
 * Treats each coding node as a binary classification task:
 * - Did coder A select this node? (yes/no)
 * - Did coder B select this node? (yes/no)
 *
 * This produces a 2×2 confusion matrix:
 *                  Coder B selected    Coder B not selected
 *   Coder A selected        n11                n10
 *   Coder A not selected    n01                n00
 *
 * κ = (Po - Pe) / (1 - Pe)
 *   Po = (n11 + n00) / N
 *   Pe = ((n11+n10)/N * (n11+n01)/N) + ((n01+n00)/N * (n10+n00)/N)
 */
function calcCohensKappa(
  annotationsA: Annotation[],
  annotationsB: Annotation[],
  nodes: CodingNode[],
): number {
  if (nodes.length === 0) return 0;

  const selectedA = new Set(annotationsA.map((a) => a.node_id));
  const selectedB = new Set(annotationsB.map((b) => b.node_id));

  // Build confusion matrix over all nodes
  let n11 = 0; // both selected
  let n10 = 0; // A selected, B not
  let n01 = 0; // A not, B selected
  let n00 = 0; // neither selected

  for (const node of nodes) {
    const aSel = selectedA.has(node.id);
    const bSel = selectedB.has(node.id);
    if (aSel && bSel) n11++;
    else if (aSel && !bSel) n10++;
    else if (!aSel && bSel) n01++;
    else n00++;
  }

  const N = n11 + n10 + n01 + n00;
  if (N === 0) return 0;

  // Observed agreement
  const po = (n11 + n00) / N;

  // Expected agreement (marginal proportions)
  const pA_sel = (n11 + n10) / N; // P(coder A selects)
  const pB_sel = (n11 + n01) / N; // P(coder B selects)
  const pA_not = (n01 + n00) / N; // P(coder A does not select)
  const pB_not = (n10 + n00) / N; // P(coder B does not select)
  const pe = pA_sel * pB_sel + pA_not * pB_not;

  if (Math.abs(1 - pe) < 0.0001) return 1;
  return (po - pe) / (1 - pe);
}
