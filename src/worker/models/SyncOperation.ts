/**
 * SyncOperation Model
 * Queued operations for offline sync
 */

export interface SyncOperation {
  id: string;
  operation: 'create' | 'update' | 'delete' | 'validate';
  collection: string;
  documentId: string;
  data: any;
  userId: string;
  timestamp: number;
  priority: number; // 1-10 (10 = highest)
  retryCount: number;           // Renamed from 'retries' for clarity
  nextRetryTime: number | null; // Unix ms - when eligible for next retry
  error: string | null;
}
