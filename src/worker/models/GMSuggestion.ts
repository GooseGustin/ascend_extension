/**
 * GMSuggestion Model
 * AI-generated suggestions for user
 */

export interface GMSuggestion {
  suggestionId: string;
  type: 'recommendation' | 'nudge' | 'milestone' | 'warning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actions: Array<{
    label: string;
    action: string;
    params: any;
  }>;
  dismissible: boolean;
  createdAt: string;
  expiresAt: string | null;
}