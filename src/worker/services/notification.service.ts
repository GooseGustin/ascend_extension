/**
 * NotificationService
 * Manages quest notifications
 */

import { getDB } from '../db/indexed-db';
import type { Notification } from '../models/Notification';

export class NotificationService {
  private db = getDB();

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    let query = this.db.notifications
      .where('userId')
      .equals(userId);

    if (unreadOnly) {
      const all = await query.toArray();
      return all.filter(n => !n.isRead);
    }

    return await query.reverse().sortBy('createdAt');
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = await this.db.notifications.get(notificationId);
    if (!notification) return;

    notification.isRead = true;
    notification.readAt = new Date().toISOString();

    await this.db.notifications.update(notificationId, notification);
  }

  /**
   * Create notification
   */
  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    questId?: string,
    priority: Notification['priority'] = 'normal'
  ): Promise<Notification> {
    const notification: Notification = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      message,
      priority,
      questId: questId || null,
      sourceUserId: null,
      actionUrl: questId ? `/quests/${questId}` : null,
      isRead: false,
      createdAt: new Date().toISOString(),
      readAt: null
    };

    await this.db.notifications.add(notification);
    
    await this.db.queueSync({
      operation: 'create',
      collection: 'notifications',
      documentId: notification.id,
      data: notification,
      priority: 6, 
      userId: notification.userId,
      retries: 0,
      error: null,
    });

    return notification;
  }
}