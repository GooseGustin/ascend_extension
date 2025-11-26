/**
 * UserProfile Model
 * Complete user data structure from SRS Section 4.1
 */

export interface UserProfile {
  userId: string;
  username: string;
  totalLevel: number;
  experiencePoints: number;
  isPublic: boolean;
  joinDate: string; // ISO8601
  specializationTrack: 'Architect' | 'Scholar' | 'Vanguard';
  grade: string; // 'Bronze I' | 'Silver III' | 'Gold' | 'Platinum' | 'Ascendant'
  rankPoints: number;
  
  inventory: InventoryItem[];
  
  equippedArtifacts: {
    weapon: string | null; // itemId
    armor: string | null;
    accessory: string | null;
  };
  
  activeBuffs: Buff[];
  activeDebuffs: Debuff[];
  
  agentProfile: {
    motivationalStyle: 'firm' | 'gentle' | 'neutral';
    preferredDifficulty: 'easy' | 'medium' | 'strict';
    trustLevel: number; // 0-100
  };
  
  streakData: {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string; // YYYY-MM-DD
    streakStartDate: string; // YYYY-MM-DD
  };
  
  consistencyScore: number; // 0-100
  achievements: string[];
}

export interface InventoryItem {
  itemId: string;
  name: string;
  type: 'Artifact' | 'Rune';
  effect: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  usesRemaining: number | null; // null for artifacts
  durability: number | null; // 0-100, null if disabled
  slotType: 'Weapon' | 'Armor' | 'Accessory' | null;
  isEquipped: boolean;
  acquiredAt: string; // ISO8601
}

export interface Buff {
  buffId: string;
  name: string;
  source: 'streak' | 'rune' | 'artifact';
  effect: Record<string, any>;
  multiplier: number;
  expiresAt: string | null; // ISO8601
}

export interface Debuff {
  debuffId: string;
  name: string;
  effect: string;
  severity: number; // 0-100
  expiresAt: string | null; // ISO8601
}