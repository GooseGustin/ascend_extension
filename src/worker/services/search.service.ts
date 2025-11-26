/**
 * SearchService
 * Cross-entity search across quests and tasks
 */

import { getDB } from "../db/indexed-db";
import type { Quest } from "../models/Quest";

export interface SearchResult {
  id: string;
  type: "quest" | "task";
  title: string;
  description?: string;
  questId?: string;
  questTitle?: string;
  relevanceScore: number;
}

export class SearchService {
  private db = getDB();

  /**
   * Search across quests and tasks
   */
  async search(
    userId: string,
    query: string,
    options: {
      type?: "quests" | "tasks" | "all";
      limit?: number;
      includePublic?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    const { type = "all", limit = 20, includePublic = false } = options;

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search in quests
    if (type === "all" || type === "quests") {
      const questResults = await this.searchQuests(
        userId,
        lowerQuery,
        includePublic
      );
      results.push(...questResults);
    }

    // Search in tasks (subtasks)
    if (type === "all" || type === "tasks") {
      const taskResults = await this.searchTasks(userId, lowerQuery);
      results.push(...taskResults);
    }

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, limit);
  }

  /**
   * Search within quests
   */
  private async searchQuests(
    userId: string,
    query: string,
    includePublic: boolean
  ): Promise<SearchResult[]> {
    let quests: Quest[];

    if (includePublic) {
      quests = await this.db.quests
        .where("isPublic")
        .equals(1)
        .or("ownerId")
        .equals(userId)
        .toArray();
    } else {
      quests = await this.db.quests.where("ownerId").equals(userId).toArray();
    }

    const results: SearchResult[] = [];

    for (const quest of quests) {
      const titleMatch = quest.title.toLowerCase().includes(query);
      const descMatch = quest.description.toLowerCase().includes(query);
      const tagMatch = quest.tags.some((tag) =>
        tag.toLowerCase().includes(query)
      );

      // Calculate relevance score
      let score = 0;
      if (titleMatch) score += 10;
      if (descMatch) score += 5;
      if (tagMatch) score += 3;

      // Boost active quests
      if (!quest.isCompleted) score += 2;

      // Boost priority quests
      if (quest.priority === "A") score += 2;
      else if (quest.priority === "B") score += 1;

      if (score === 0) continue;

      results.push({
        id: quest.questId,
        type: "quest" as const,
        title: quest.title,
        description: quest.description,
        relevanceScore: score,
      });
    }

    return results;
  }

  // ADD this method to existing SearchService class

  /**
   * Search quests only (not subtasks) for MiddlePanel
   * Returns full Quest objects for display
   */
  async searchQuestsOnly(
    userId: string,
    query: string,
    options: {
      limit?: number;
      includeScheduledOnly?: boolean;
    } = {}
  ): Promise<Quest[]> {
    const { limit = 20, includeScheduledOnly = false } = options;

    let quests = await this.db.quests.where("ownerId").equals(userId).toArray();

    // Filter by schedule if requested
    if (includeScheduledOnly) {
      quests = quests.filter((q) => q.schedule && q.schedule.frequency);
    }

    if (!query || query.length < 2) {
      return quests.slice(0, limit);
    }

    const lowerQuery = query.toLowerCase();

    // Search in quest title, description, tags, AND subtask titles
    const matches = quests.filter((quest) => {
      const titleMatch = quest.title.toLowerCase().includes(lowerQuery);
      const descMatch = quest.description.toLowerCase().includes(lowerQuery);
      const tagMatch = quest.tags.some((tag) =>
        tag.toLowerCase().includes(lowerQuery)
      );
      const subtaskMatch = quest.subtasks.some((st) =>
        st.title.toLowerCase().includes(lowerQuery)
      );

      return titleMatch || descMatch || tagMatch || subtaskMatch;
    });

    return matches.slice(0, limit);
  }

  /**
   * Search within subtasks
   */
  private async searchTasks(
    userId: string,
    query: string
  ): Promise<SearchResult[]> {
    const quests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();

    const results: SearchResult[] = [];

    for (const quest of quests) {
      for (const subtask of quest.subtasks || []) {
        const match = subtask.title.toLowerCase().includes(query);

        if (match) {
          results.push({
            id: subtask.id,
            type: "task",
            title: subtask.title,
            questId: quest.questId,
            questTitle: quest.title,
            relevanceScore: subtask.isComplete ? 3 : 8, // Boost incomplete
          });
        }
      }
    }

    return results;
  }
}
