/**
 * RemoteAPI Client
 * Handles communication with external backend API
 * Only used when online for GM validation, social features, etc.
 */

import type { Quest } from '../models/Quest';
import type { GMSuggestion } from '../models/GMSuggestion';

export interface ValidationResult {
  validatedDifficulty: string;
  confidence: number;
  reasoning: string;
  xpPerPomodoro: number;
  recommendations: string[];
}

export class RemoteAPI {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string = import.meta.env.VITE_API_URL || 'https://api.ascend.app') {
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
  async validateQuest(quest: Quest, userContext: any): Promise<ValidationResult> {
    if (!this.isOnline()) {
      throw new Error('Cannot validate quest while offline');
    }

    const response = await fetch(`${this.baseURL}/agent/validate-quest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        questId: quest.questId,
        questData: {
          title: quest.title,
          description: quest.description,
          subtasks: quest.subtasks
        },
        userContext
      })
    });

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.statusText}`);
    }

    return await response.json();
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
