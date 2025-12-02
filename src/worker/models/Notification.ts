/**
 * Notification Model
 * Notification structure from SRS Section 4.5
 */

export interface Notification {
  id: string;
  userId: string;
  type: 'milestone' | 'comment' | 'slowdown' | 'guild' | 'achievement' | 'quest_default';
  
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  
  questId: string | null;
  sourceUserId: string | null;
  
  actionUrl: string | null;
  isRead: boolean;
  
  createdAt: string; // ISO8601
  readAt: string | null; // ISO8601
}