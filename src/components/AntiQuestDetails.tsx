import { useState } from 'react';
import {
  AlertTriangle,
  Lock,
  Calendar,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import type { Quest, Severity } from '../worker/models/Quest';
import { useModal } from '../context/ModalContext';

interface AntiQuestDetailsProps {
  antiQuest: Quest;
  onLogOccurrence: (antiQuestId: string, notes?: string, timestamp?: string) => void;
  onDeleteAntiQuest?: (antiQuestId: string) => void;
  onEditAntiQuest?: (antiQuest: Quest) => void;
}

export function AntiQuestDetails({
  antiQuest,
  onLogOccurrence,
  onDeleteAntiQuest,
  onEditAntiQuest,
}: AntiQuestDetailsProps) {
  const { showModal, hideModal } = useModal();
  const [showLogForm, setShowLogForm] = useState(false);
  const [occurrenceNotes, setOccurrenceNotes] = useState('');
  const [occurrenceTimestamp, setOccurrenceTimestamp] = useState('');
  const [expandedHistory, setExpandedHistory] = useState(true);

  const severity = antiQuest.severity?.userAssigned || 'moderate';
  const xpPenalty = antiQuest.severity?.xpPenaltyPerEvent || 50;
  const isLocked = antiQuest.severity?.isLocked || false;
  const occurrences = antiQuest.antiEvents || [];
  const tracking = antiQuest.antiTracking;

  const getSeverityColor = (sev: Severity) => {
    switch (sev) {
      case 'mild':
        return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
      case 'moderate':
        return { bg: '#fed7aa', text: '#9a3412', border: '#ea580c' };
      case 'severe':
        return { bg: '#fecaca', text: '#991b1b', border: '#dc2626' };
      case 'critical':
        return { bg: '#fecdd3', text: '#881337', border: '#be123c' };
    }
  };

  const severityColors = getSeverityColor(severity);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  };

  const formatFullDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calculate stats from tracking or compute from events
  const totalOccurrences = tracking?.totalOccurrences || occurrences.length;
  const todayCount = tracking?.occurrencesToday || 0;
  const weekCount = tracking?.occurrencesThisWeek || 0;
  const monthCount = tracking?.occurrencesThisMonth || 0;
  const currentGap = tracking?.currentGapDays || 0;
  const longestGap = tracking?.longestGapDays || 0;
  const lastOccurrence = occurrences[0];

  // Trend calculation
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const lastWeekCount = occurrences.filter(o => {
    const occDate = new Date(o.timestamp);
    return occDate >= lastWeekStart && occDate < weekStart;
  }).length;

  let trendIndicator = '-> Stable';
  let trendColor = '#72767d';
  if (weekCount < lastWeekCount) {
    trendIndicator = '^ Improving';
    trendColor = '#57F287';
  } else if (weekCount > lastWeekCount) {
    trendIndicator = 'v Worsening';
    trendColor = '#ed4245';
  }

  const handleLogOccurrence = () => {
    onLogOccurrence(antiQuest.questId, occurrenceNotes.trim() || undefined, occurrenceTimestamp || undefined);
    setOccurrenceNotes('');
    setOccurrenceTimestamp('');
    setShowLogForm(false);
  };

  const showDeleteConfirmation = () => {
    showModal(
      <div className="bg-[#36393f] rounded-lg shadow-lg max-w-md p-6 border border-[#202225]">
        <h2 className="text-xl text-white font-semibold mb-2">Delete AntiQuest?</h2>
        <p className="text-sm text-[#b9bbbe] mb-6">
          This action is permanent and cannot be undone. The AntiQuest "{antiQuest.title}" and all its occurrence history will be permanently deleted.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => hideModal()}
            className="px-4 py-2 rounded text-sm text-[#dbdee1] bg-[#2f3136] hover:bg-[#4f545c] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              hideModal();
              onDeleteAntiQuest?.(antiQuest.questId);
            }}
            className="px-4 py-2 rounded text-sm text-white bg-[#ED4245] hover:bg-[#da373f] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col">
      {/* Title Bar */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-[#202225] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
          <span className="text-white truncate">{antiQuest.title}</span>
          <div
            className="px-2 py-1 rounded text-xs uppercase tracking-wide flex items-center gap-1 border flex-shrink-0"
            style={{
              backgroundColor: severityColors.bg,
              color: severityColors.text,
              borderColor: severityColors.border,
            }}
          >
            {isLocked && <Lock className="w-3 h-3" />}
            {severity}
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isLocked && (
            <button
              onClick={() => onEditAntiQuest?.(antiQuest)}
              className="p-1.5 text-[#72767d] hover:text-[#5865F2] transition-colors rounded hover:bg-[#4f545c]"
              title="Edit AntiQuest"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => showDeleteConfirmation()}
            className="p-1.5 text-[#72767d] hover:text-[#ED4245] transition-colors rounded hover:bg-[#4f545c]"
            title="Delete AntiQuest"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* XP Penalty Display */}
          <div className="bg-[#2f3136] rounded-lg p-4 mb-6 border-l-4 border-[#ed4245]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#b9bbbe] mb-1 uppercase tracking-wide">XP Penalty Per Occurrence</div>
                <div className="text-2xl text-[#ed4245] font-semibold">-{xpPenalty} XP</div>
              </div>
              {isLocked && (
                <div className="flex items-center gap-2 text-[#faa61a] text-xs">
                  <Lock className="w-4 h-4" />
                  <span>Severity Locked</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {antiQuest.description && (
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">Description</h3>
              <p className="text-sm text-[#dcddde]">{antiQuest.description}</p>
            </div>
          )}

          {/* Tags */}
          {antiQuest.tags && antiQuest.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {antiQuest.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-[#5865F2] text-white px-3 py-1 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="mb-6 flex items-center gap-4 text-xs text-[#72767d]">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Created {formatDate(antiQuest.createdAt)}</span>
            </div>
            {antiQuest.severity?.lockedAt && (
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Locked {formatDate(antiQuest.severity.lockedAt)}</span>
              </div>
            )}
          </div>

          {/* Locked State Notice */}
          {isLocked && (
            <div className="mb-6 bg-[#2f3136] rounded-lg p-4 border border-[#faa61a]">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#faa61a] mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm text-white mb-1">Severity is now locked</div>
                  <p className="text-xs text-[#b9bbbe]">
                    The severity level was locked after the first occurrence. XP penalty cannot be changed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Activity Summary Stats */}
          <div className="mb-6">
            <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-3">Activity Summary</h3>
            <div className="bg-[#2f3136] rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#b9bbbe] mb-1">Total Occurrences</div>
                  <div className="text-xl text-white">{totalOccurrences}</div>
                </div>
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#b9bbbe] mb-1">Today</div>
                  <div className="text-xl text-white">{todayCount}</div>
                </div>
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#b9bbbe] mb-1">This Week</div>
                  <div className="text-xl text-white">{weekCount}</div>
                </div>
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#b9bbbe] mb-1">This Month</div>
                  <div className="text-xl text-white">{monthCount}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#202225]">
                <div>
                  <div className="text-xs text-[#b9bbbe] mb-1">Last Occurred</div>
                  <div className="text-sm text-white">{lastOccurrence ? formatDate(lastOccurrence.timestamp) : 'Never'}</div>
                </div>
                <div>
                  <div className="text-xs text-[#b9bbbe] mb-1">Current Gap</div>
                  <div className="text-sm text-white">{currentGap} days</div>
                </div>
                <div>
                  <div className="text-xs text-[#b9bbbe] mb-1">Longest Gap</div>
                  <div className="text-sm text-white">{longestGap} days</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#b9bbbe]">Trend (vs. last week)</span>
                  <span className="text-sm" style={{ color: trendColor }}>{trendIndicator}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action - Log Occurrence */}
          <div className="mb-6">
            {!showLogForm ? (
              <Button
                onClick={() => setShowLogForm(true)}
                className="w-full bg-[#ed4245] hover:bg-[#c13639] text-white py-6 text-base"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Log Occurrence (-{xpPenalty} XP)
              </Button>
            ) : (
              <div className="bg-[#2f3136] rounded-lg p-4 border-2 border-[#ed4245]">
                <h4 className="text-sm text-white mb-3">Log New Occurrence</h4>

                <div className="mb-3">
                  <label className="text-xs text-[#b9bbbe] mb-1 block">When did this occur?</label>
                  <Input
                    type="datetime-local"
                    value={occurrenceTimestamp}
                    onChange={(e) => setOccurrenceTimestamp(e.target.value)}
                    max={new Date().toISOString().slice(0, 16)}
                    min={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                    className="bg-[#202225] border-[#202225] placeholder:text-[#72767d] focus-visible:ring-1 focus-visible:ring-[#ed4245]"
                  />
                  <p className="text-xs text-[#72767d] mt-1">Defaults to now. Can be edited within 30 days past.</p>
                </div>

                <div className="mb-3">
                  <label className="text-xs text-[#b9bbbe] mb-1 block">What triggered this?</label>
                  <Textarea
                    placeholder="Optional notes about this occurrence..."
                    value={occurrenceNotes}
                    onChange={(e) => setOccurrenceNotes(e.target.value)}
                    className="bg-[#202225] border-[#202225] min-h-[80px] placeholder:text-[#72767d] focus-visible:ring-1 focus-visible:ring-[#ed4245]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleLogOccurrence}
                    className="flex-1 bg-[#ed4245] hover:bg-[#c13639] text-white"
                  >
                    Confirm (-{xpPenalty} XP)
                  </Button>
                  <Button
                    onClick={() => {
                      setShowLogForm(false);
                      setOccurrenceNotes('');
                      setOccurrenceTimestamp('');
                    }}
                    variant="outline"
                    className="flex-1 border-[#4f545c] text-[#dcddde] hover:bg-[#34373c]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Event History */}
          {occurrences.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setExpandedHistory(!expandedHistory)}
                className="flex items-center gap-2 mb-3 hover:text-white transition-colors"
              >
                {expandedHistory ? (
                  <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
                )}
                <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe]">
                  Event History ({occurrences.length})
                </h3>
              </button>

              {expandedHistory && (
                <div className="space-y-2">
                  {occurrences.map((occurrence) => (
                    <div
                      key={occurrence.id}
                      className="bg-[#2f3136] rounded px-4 py-3 border-l-2 border-[#ed4245]"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm text-white">{formatFullDate(occurrence.timestamp)}</div>
                          <div className="text-xs text-[#72767d]">{formatDate(occurrence.timestamp)}</div>
                        </div>
                        <div className="text-sm text-[#ed4245] font-semibold">
                          -{occurrence.actualPenalty || occurrence.xpPenalty} XP
                        </div>
                      </div>
                      {occurrence.notes && (
                        <p className="text-sm text-[#b9bbbe] mt-2">{occurrence.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
