/**
 * QuestUIAdapter
 * Converts between worker Quest model and UI Task interface
 * Bridges the gap between Figma-generated UI and worker architecture
 */

import type { Quest } from "../models/Quest";
import type { Task } from "../../App"; // UI interface

export class QuestUIAdapter {
  /**
   * Convert Quest subtasks to UI Task format for today's view
   */
  static questsToTasks(quests: Quest[]): Task[] {
    const tasks: Task[] = [];

    for (const quest of quests) {
      for (const subtask of quest.subtasks) {
        if (!subtask.isComplete) {
          tasks.push({
            id: subtask.id,
            title: subtask.title,
            questId: quest.questId,
            questTag: quest.title,
            levelReq: quest.gamification.currentLevel,
            completed: subtask.isComplete,
            questColor: this.getQuestColor(quest),
          });
        }
      }
    }

    return tasks;
  }

  /**
   * Get color for quest based on difficulty or type
   */
  private static getQuestColor(quest: Quest): string {
    const colorMap: Record<string, string> = {
      Trivial: "#72767d",
      Easy: "#57F287",
      Medium: "#5865F2",
      Hard: "#FEE75C",
      Epic: "#EB459E",
    };

    return colorMap[quest.difficulty.userAssigned] || "#5865F2";
  }

  /**
   * Find quest and subtask from task ID
   */
  static async findQuestAndSubtask(
    taskId: string,
    quests: Quest[]
  ): Promise<{ quest: Quest; subtask: any } | null> {
    for (const quest of quests) {
      const subtask = quest.subtasks.find((st) => st.id === taskId);
      if (subtask) {
        return { quest, subtask };
      }
    }
    return null;
  }

  /**
   * Convert UI tasks to task order items with quest IDs
   */
  static tasksToOrderItems(
    tasks: Task[]
  ): Array<{ id: string; questId: string }> {
    return tasks.map((t) => ({
      id: t.id,
      questId: t.questId,
    }));
  }
}
