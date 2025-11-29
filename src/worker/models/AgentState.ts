/**
 * AgentState Model
 * GM/Agent state structure from SRS Section 4.6
 */

// Detailed Performance Metrics for GM consumption
export interface PerformanceMetrics {
  weeklyVelocity: number; // XP per hour this week
  monthlyConsistency: number; // Percentage (0-100)
  burnoutRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  
  // Detailed breakdown
  averageSessionQuality: number; // 0-100
  streakDays: number;
  activeQuestCount: number;
  overdueQuestCount: number;
  
  // Trend indicators
  velocityTrend: 'improving' | 'stable' | 'declining';
  consistencyTrend: 'improving' | 'stable' | 'declining';
  
  // Last calculated
  calculatedAt: string; // ISO8601
}

export interface AgentState {
  userId: string;
  // lastObservationTimestamp: string; // ISO8601
  // patterns: Pattern[];

  metrics: PerformanceMetrics;
  detectedPatterns: Pattern[];
  lastUpdated: string; // ISO8601
  
  recommendedQuestAdjustments: QuestAdjustment[];
  
  motivationalProfile: {
    tone: 'firm' | 'gentle' | 'neutral';
    preferredFeedbackFrequency: 'high' | 'medium' | 'low';
    respondsWellTo: string[];
  };
  
  pendingActions: PendingAction[];
  
  performanceMetrics: {
    weeklyVelocity: number;
    monthlyConsistency: number;
    burnoutRisk: number; // 0-100
    optimizationOpportunities: string[];
  };
}

export interface Pattern {
  name: string;
  category: 'productivity' | 'behavior' | 'risk';
  confidence: number; // 0-1
  detail: string;
  detectedAt: string; // ISO8601
  severity: 'info' | 'warning' | 'critical';

  // Actionable recommendation
  suggestedAction?: {
    type: 'adjust_schedule' | 'reduce_difficulty' | 'take_break' | 'add_subtask';
    questId?: string;
    reason: string;
  };
}

export interface QuestAdjustment {
  questId: string;
  suggestionText: string;
  actionType: 'adjust_schedule' | 'suggest_buff' | 'create_subtask' | 'reduce_difficulty' | 'rest_recommendation';
  params: Record<string, any>;
  priority: number;
  createdAt: string; // ISO8601
}

export interface PendingAction {
  id: string;
  trigger: string;
  payload: Record<string, any>;
  createdAt: string; // ISO8601
}
