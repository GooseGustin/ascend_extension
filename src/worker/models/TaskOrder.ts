/**
 * TaskOrder Model
 * Stores user's custom task ordering with task-quest pairs
 */

export interface TaskOrderItem {
  taskId: string;
  questId: string;
}

export interface TaskOrder {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  questId?: string; // Optional: if set, this is for quest detail view; if null, for home view
  taskOrder: TaskOrderItem[]; // Array of task-quest pairs
  lastUpdated: string; // ISO8601
}