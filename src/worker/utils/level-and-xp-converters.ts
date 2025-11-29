export function totalExpForLevel(L: number) {
  return 100 * (Math.exp(L / 5) - 1);
}

export function xpToNextLevel(currentExp: number) {
  // compute current level (continuous)
  const level = Math.floor(Math.log(currentExp / 100 + 1) * 5);
  const neededTotal = totalExpForLevel(level + 1);
  return Math.max(0, Math.ceil(neededTotal - currentExp));
}

export function xpDeltaForLevel(L: number) {
  const factor = Math.exp(1 / 5) - 1; // ≈ 0.22140275816
  return 100 * Math.exp(L / 5) * factor;
}

export function currentLevelFromExp(currentExp: number) {
  return Math.floor(Math.log(currentExp / 100 + 1) * 5);
}
