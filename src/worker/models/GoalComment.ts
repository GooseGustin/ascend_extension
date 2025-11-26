/**
 * GoalComment Model
 * Comment structure from SRS Section 4.7
 */

export interface GoalComment {
  commentId: string;
  questId: string;
  userId: string;
  username: string;
  
  text: string;
  type: 'encouragement' | 'question' | 'suggestion';
  
  timestamp: string; // ISO8601
  editedAt: string | null; // ISO8601
  
  reactions: Reaction[];
}

export interface Reaction {
  userId: string;
  emoji: string;
  timestamp: string; // ISO8601
}