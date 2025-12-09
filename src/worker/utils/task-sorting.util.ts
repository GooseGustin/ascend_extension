/**
 * Task Sorting Utilities
 * Implements smart sorting algorithm from SRS 11.2
 */

import type { Quest } from '../models/Quest';

/**
 * Calculate task priority based on multiple factors
 * Priority = (dueDate urgency × 0.4)
 *          + (schedule frequency × 0.3)
 *          + (last worked × 0.2)
 *          + (todo flag × 0.1)
 */
export function calculateTaskPriority(quest: Quest): number {
  // console.log('Sorting quests by priority');
  
  let priority = 0;

  // Due date urgency (0-10)
  if (quest.dueDate) {
    const now = new Date();
    const due = new Date(quest.dueDate);
    const daysUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    let urgency = 0;
    if (daysUntilDue < 0) urgency = 10; // Overdue
    else if (daysUntilDue < 1) urgency = 9;
    else if (daysUntilDue < 3) urgency = 7;
    else if (daysUntilDue < 7) urgency = 5;
    else urgency = 2;
    
    priority += urgency * 0.4;
  }

  // Schedule frequency (0-10)
  if (quest.schedule) {
    const frequencyScore: Record<string, number> = {
      'Daily': 10,
      'Weekly': 6,
      'Custom': 4
    };
    
    priority += (frequencyScore[quest.schedule.frequency] || 2) * 0.3;
  }

  // Last worked recency (0-10)
  if (quest.tracking?.lastSessionAt) {
    const lastWorked = new Date(quest.tracking.lastSessionAt);
    const daysSince = (Date.now() - lastWorked.getTime()) / (1000 * 60 * 60 * 24);
    
    let recencyScore = 0;
    if (daysSince > 7) recencyScore = 10;
    else if (daysSince > 3) recencyScore = 7;
    else if (daysSince > 1) recencyScore = 4;
    else recencyScore = 1;
    
    priority += recencyScore * 0.2;
  }

  // Todo flag boost
  if (quest.type === 'TodoQuest') {
    priority += 3 * 0.1;
  }

  return priority;
}

/**
 * Sort quests by calculated priority
 */
export function sortQuestsByPriority(quests: Quest[]): Quest[] {
  return quests.sort((a, b) => {
    const priorityA = calculateTaskPriority(a);
    const priorityB = calculateTaskPriority(b);
    return priorityB - priorityA; // Descending
  });
}
