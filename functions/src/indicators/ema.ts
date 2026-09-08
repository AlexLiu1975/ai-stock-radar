export function calculateEma(values: number[], period: number): number[] {
  if (period <= 0) {
    throw new Error("period must be > 0");
  }

  if (values.length === 0) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  const result = [values[0]];

  for (let i = 1; i < values.length; i += 1) {
    result.push(values[i] * multiplier + result[i - 1] * (1 - multiplier));
  }

  return result;
}
