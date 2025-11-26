/**
 * SyncOperation Model
 * Queued operations for offline sync
 */

export interface SyncOperation {
  id: string;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  documentId: string;
  data: any;
  timestamp: number;
  priority: number; // 1-10 (10 = highest)
  retries: number;
  error: string | null;
}
