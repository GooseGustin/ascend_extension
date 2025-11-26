/**
 * AgentState Model
 * GM/Agent state structure from SRS Section 4.6
 */

export interface AgentState {
  userId: string;
  lastObservationTimestamp: string; // ISO8601
  
  patterns: Pattern[];
  
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