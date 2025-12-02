/**
 * Defines a request for GM Quest Validation that is queued locally
 * when the user is offline or the GM service is temporarily unavailable.
 */
export interface GMValidationRequest {
  requestId: string;
  userId: string;
  questId: string;
  timestamp: string; // ISO8601
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retries: number;
  error?: string;
}