/**
 * SyncQueue Manager
 * Handles offline operation queueing and background sync
 */

import { getDB } from '../db/indexed-db';
import { RemoteAPI } from '../api/remote-client';
import type { SyncOperation } from '../models/SyncOperation';

export class SyncQueue {
  private db = getDB();
  private remoteAPI: RemoteAPI;
  private isProcessing = false;
  private syncInterval: number | null = null;

  constructor(remoteAPI: RemoteAPI) {
    this.remoteAPI = remoteAPI;
  }

  /**
   * Start background sync (every 5 minutes when online)
   */
  startBackgroundSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine && !this.isProcessing) {
        this.processQueue();
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Also sync on network reconnection
    window.addEventListener('online', () => {
      this.processQueue();
    });
  }

  /**
   * Stop background sync
   */
  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Process sync queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (!navigator.onLine) return;

    this.isProcessing = true;

    try {
      const operations = await this.db.getPendingSyncOps(50);

      for (const op of operations) {
        try {
          await this.syncOperation(op);
          await this.db.removeSyncOp(op.id);
        } catch (error) {
          console.error(`Sync failed for operation ${op.id}:`, error);
          
          // Increment retry count
          op.retries += 1;
          op.error = error instanceof Error ? error.message : 'Unknown error';
          
          if (op.retries >= 5) {
            // Max retries reached, log and remove
            console.error(`Max retries reached for operation ${op.id}`);
            await this.db.removeSyncOp(op.id);
          } else {
            // Update with error info
            await this.db.syncQueue.update(op.id, op);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync single operation to remote
   */
  private async syncOperation(op: SyncOperation): Promise<void> {
    switch (op.collection) {
      case 'sessions':
        await this.remoteAPI.syncSession(op.data);
        break;
      
      case 'quests':
        await this.remoteAPI.syncQuest(op.data);
        break;
      
      case 'taskOrders':
        // Task orders are local-only for now
        break;
      
      default:
        console.warn(`Unknown collection: ${op.collection}`);
    }
  }

  /**
   * Get pending operation count
   */
  async getPendingCount(): Promise<number> {
    return await this.db.syncQueue.count();
  }

  /**
   * Clear all queued operations (for testing)
   */
  async clearQueue(): Promise<void> {
    await this.db.syncQueue.clear();
  }
}
