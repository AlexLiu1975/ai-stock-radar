import type { InstitutionalFlow } from "../domain/types.js";

export function scoreInstitutional(
  flows: InstitutionalFlow[],
  volumes: number[],
): { score: number; breakdown: Record<string, number> } {
  if (flows.length === 0 || volumes.length === 0) {
    return { score: 0, breakdown: { foreign: 0, trust: 0, synchronized: 0 } };
  }

  const size = Math.min(flows.length, volumes.length);
  const recentFlows = flows.slice(-size);
  const recentVolumes = volumes.slice(-size);

  const foreign = scoreLeg(
    recentFlows.map((flow) => flow.foreignNet),
    recentVolumes,
  );
  const trust = scoreLeg(
    recentFlows.map((flow) => flow.trustNet),
    recentVolumes,
  );

  const last = recentFlows.at(-1)!;
  const synchronized =
    last.foreignNet > 0 && last.trustNet > 0 && last.dealerNet > 0
      ? 10
      : last.foreignNet + last.trustNet + last.dealerNet > 0
        ? 5
        : 0;

  const score = Math.min(40, foreign + trust + synchronized);

  return {
    score,
    breakdown: { foreign, trust, synchronized },
  };
}

function scoreLeg(nets: number[], volumes: number[]): number {
  const last = nets.at(-1) ?? 0;
  if (last <= 0) return 0;

  const lastThree = nets.slice(-3);
  const persistence =
    lastThree.length === 3 && lastThree.every((value) => value > 0) ? 10 : 5;

  const positiveRatios = nets.map((net, index) => {
    const volume = volumes[index] ?? 0;
    if (net <= 0 || volume <= 0) return 0;
    return net / volume;
  });

  const averageRatio =
    positiveRatios.reduce((sum, ratio) => sum + ratio, 0) / positiveRatios.length;
  const ratioBonus = Math.min(5, averageRatio * 100);

  return Math.min(15, persistence + ratioBonus);
}
