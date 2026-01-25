/**
 * RemoteAPI Client
 * Handles communication with external backend API
 * Only used when online for GM validation, social features, etc.
 */

import type { Quest } from '../models/Quest';
import type { GMSuggestion } from '../models/GMSuggestion';

const apiUrl = "http://localhost:4000";

/** Agent metrics critical for Quest difficulty validation. */
export interface MinimalAgentMetrics {
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
}

export interface GMValidationContext {
  userId: string;
  metrics: MinimalAgentMetrics;
  gmTone: 'mild' | 'standard' | 'tough';
}

/**
 * Result object returned by the Grandmaster (GM) Quest Validation API.
 * This is used for GM-Driven Quest Validation (SRS v2.0).
 */
export interface ValidationResult {
  // Required Status: 'validated', 'rejected', or 'error' (SRS Appendix C.2)
  status: 'validated' | 'rejected' | 'error'; 
  suggestedDifficulty?: 'Trivial' | 'Easy'| 'Medium' | 'Hard' | 'Epic';
  suggestedXpPerPomodoro?: number;
  // Confidence (0.0 to 1.0): GM's certainty in the suggested Difficulty/XP.
  // Useful for frontend signaling.
  confidence?: number;
  // Reasoning: A natural language explanation from the GM for the assessment.
  reasoning?: string;
  // Recommendations: Actionable steps for the user based on the reasoning.
  // E.g., ["Break into subtasks", "Adjust schedule frequency"].
  recommendations?: string[];
  message?: string; 
  errorCode?: string; // e.g., 'GM_004: Insufficient context'
}



export class RemoteAPI {
  private baseURL: string;
  private authToken: string | null = null;
  constructor(baseURL: string = apiUrl || 'https://api.ascend.app') {
    // console.log('[RemoteAPI], apiUrl', apiUrl); 
    this.baseURL = baseURL;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Validate quest difficulty with GM
   */
  async validateQuest(quest: Quest, userContext: GMValidationContext): Promise<ValidationResult> {
    if (!this.isOnline()) {
      throw new Error('Cannot validate quest while offline');
    }

    const payload = {
      userId: userContext.userId,

      quest: {
        questId: quest.questId,
        title: quest.title,
        description: quest.description,
        subtasks: quest.subtasks.map(st => ({
          title: st.title,
          estimatePomodoros: st.estimatePomodoros ?? 1
        })),
        userAssignedDifficulty: quest.difficulty.userAssigned,
        timeEstimateHours: quest.timeEstimateHours
      },

      metrics: userContext.metrics,
      gmTone: userContext.gmTone
    };


    const response = await fetch(`${this.baseURL}/agent/validate-quest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(payload)
    });
    console.log('Sent payload to', this.baseURL, payload);

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.statusText}`);
    }

    return await response.json();
    // return {
    //   status: 'validated',
    //   suggestedDifficulty: quest.difficulty.userAssigned,
    //   suggestedXpPerPomodoro: quest.difficulty.xpPerPomodoro,
    //   // Default placeholder values for the new fields
    //   confidence: 0.95, 
    //   reasoning: "Based on your current Weekly Velocity (3.2 quests/week) and Low Burnout Risk, the user-selected difficulty is appropriate. Maintain this pace, Warrior.",
    //   recommendations: ["Ensure subtasks are clearly defined."],
    // };
  }

  /**
   * Get GM suggestions
   */
  async getGMSuggestions(userId: string): Promise<GMSuggestion[]> {
    if (!this.isOnline()) {
      return []; // Return empty array if offline
    }

    const response = await fetch(`${this.baseURL}/gm/suggestions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions || [];
  }

  /**
   * Sync session to cloud
   */
  async syncSession(session: any): Promise<void> {
    if (!this.isOnline()) return;

    await fetch(`${this.baseURL}/sessions/${session.sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(session)
    });
  }

  /**
   * Sync quest to cloud
   */
  async syncQuest(quest: Quest): Promise<void> {
    if (!this.isOnline()) return;

    await fetch(`${this.baseURL}/quests/${quest.questId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(quest)
    });
  }

  /**
   * Fetch public quests
   */
  async fetchPublicQuests(limit: number = 20): Promise<Quest[]> {
    if (!this.isOnline()) return [];

    const response = await fetch(`${this.baseURL}/quests?public=true&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.quests || [];
  }
}
