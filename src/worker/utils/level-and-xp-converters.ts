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
  // Floor protection: ensure XP is never negative
  const safeXP = Math.max(0, currentExp);
  return Math.floor(Math.log(safeXP / 100 + 1) * 5);
}

/**
 * Calculate the XP floor for a given level.
 * This is the minimum XP a user can have at their current level.
 * Used by AntiQuest penalties to prevent de-leveling.
 */
export function getLevelFloorXP(level: number): number {
  return totalExpForLevel(level);
}

/**
 * Apply an XP penalty with floor protection.
 * Returns the new XP and actual penalty applied (may be less due to floor).
 */
export function applyXPPenaltyWithFloor(
  currentXP: number,
  penalty: number
): { newXP: number; actualPenalty: number } {
  const currentLevel = currentLevelFromExp(currentXP);
  const levelFloor = totalExpForLevel(currentLevel);

  // Apply penalty, but don't go below level floor
  const newXP = Math.max(levelFloor, currentXP - Math.abs(penalty));
  const actualPenalty = currentXP - newXP;

  return { newXP, actualPenalty };
}
