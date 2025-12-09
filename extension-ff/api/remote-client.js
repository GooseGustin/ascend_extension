/**
 * RemoteAPI Client
 * Handles communication with external backend API
 * Only used when online for GM validation, social features, etc.
 */
const apiUrl = import.meta.env.VITE_API_URL;
export class RemoteAPI {
    constructor(baseURL = apiUrl || 'https://api.ascend.app') {
        this.authToken = null;
        // console.log('[RemoteAPI], apiUrl', apiUrl); 
        this.baseURL = baseURL;
    }
    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
    }
    /**
     * Check if online
     */
    isOnline() {
        return navigator.onLine;
    }
    /**
     * Validate quest difficulty with GM
     */
    async validateQuest(quest, userContext) {
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
            metrics: userContext.metrics
        };
        const response = await fetch(`${this.baseURL}/agent/validate-quest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            },
            body: JSON.stringify(payload)
        });
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
    async getGMSuggestions(userId) {
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
    async syncSession(session) {
        if (!this.isOnline())
            return;
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
    async syncQuest(quest) {
        if (!this.isOnline())
            return;
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
    async fetchPublicQuests(limit = 20) {
        if (!this.isOnline())
            return [];
        const response = await fetch(`${this.baseURL}/quests?public=true&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${this.authToken}`
            }
        });
        if (!response.ok)
            return [];
        const data = await response.json();
        return data.quests || [];
    }
}
