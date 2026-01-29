import { useState } from 'react';
import { AlertTriangle, Lock, X } from 'lucide-react';
import type { Quest, Severity } from '../worker/models/Quest';

interface AntiQuestEditFormProps {
  antiQuest: Quest;
  onSave: (updates: {
    title?: string;
    description?: string;
    severity?: Severity;
    tags?: string[];
  }) => void;
  onCancel: () => void;
}

const SEVERITY_OPTIONS: {
  value: Severity;
  label: string;
  xpPenalty: number;
  color: { bg: string; text: string; border: string };
  description: string;
}[] = [
  {
    value: 'mild',
    label: 'Mild',
    xpPenalty: 25,
    color: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    description: 'Minor setback, easily recovered from',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    xpPenalty: 50,
    color: { bg: '#fed7aa', text: '#9a3412', border: '#ea580c' },
    description: 'Noticeable impact on progress',
  },
  {
    value: 'severe',
    label: 'Severe',
    xpPenalty: 100,
    color: { bg: '#fecaca', text: '#991b1b', border: '#dc2626' },
    description: 'Significant setback, needs serious attention',
  },
  {
    value: 'critical',
    label: 'Critical',
    xpPenalty: 200,
    color: { bg: '#fecdd3', text: '#881337', border: '#be123c' },
    description: 'Major impact, critical behavior to eliminate',
  },
];

export function AntiQuestEditForm({ antiQuest, onSave, onCancel }: AntiQuestEditFormProps) {
  const [title, setTitle] = useState(antiQuest.title);
  const [description, setDescription] = useState(antiQuest.description || '');
  const [showDescription, setShowDescription] = useState(!!antiQuest.description);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(antiQuest.tags || []);
  const [showTags, setShowTags] = useState((antiQuest.tags?.length || 0) > 0);
  const [severity, setSeverity] = useState<Severity>(antiQuest.severity?.userAssigned || 'moderate');

  const isLocked = antiQuest.severity?.isLocked || false;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const updates: {
      title?: string;
      description?: string;
      severity?: Severity;
      tags?: string[];
    } = {};

    if (title.trim() !== antiQuest.title) {
      updates.title = title.trim();
    }
    if (description.trim() !== (antiQuest.description || '')) {
      updates.description = description.trim();
    }
    if (!isLocked && severity !== antiQuest.severity?.userAssigned) {
      updates.severity = severity;
    }
    if (JSON.stringify(tags) !== JSON.stringify(antiQuest.tags || [])) {
      updates.tags = tags;
    }

    onSave(updates);
  };

  const selectedSeverity = SEVERITY_OPTIONS.find(s => s.value === severity)!;

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col overflow-hidden">
      {/* Header with X button */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-[#202225] shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#ed4245]" />
          <h2 className="text-xl text-white font-semibold">Edit AntiQuest</h2>
        </div>
        <button
          onClick={onCancel}
          className="p-1 text-[#72767d] hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div>
          {/* Behavior Definition Section */}
          <div className="mb-6">
            <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225] hover:border-[#ed4245] transition-colors">
              <label className="block text-sm text-[#b9bbbe] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ed4245]" />
                Behavior to track *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Porn relapse, Late-night junk food, Skipping exercise"
                className="w-full bg-[#202225] text-white px-4 py-3 rounded border-2 border-transparent focus:border-[#ed4245] outline-none transition-colors text-lg"
              />
            </div>
          </div>

          {/* Optional: Description */}
          <div className="mb-6">
            {!showDescription ? (
              <button
                onClick={() => setShowDescription(true)}
                className="text-sm text-[#5865F2] hover:text-[#4752C4] transition-colors"
              >
                + Add description
              </button>
            ) : (
              <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
                <label className="block text-sm text-[#b9bbbe] mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why do you want to stop this behavior? What triggers it?"
                  rows={3}
                  className="w-full bg-[#202225] text-white px-4 py-3 rounded border-2 border-transparent focus:border-[#ed4245] outline-none transition-colors resize-none"
                />
              </div>
            )}
          </div>

          {/* Optional: Tags */}
          <div className="mb-6">
            {!showTags && tags.length === 0 ? (
              <button
                onClick={() => setShowTags(true)}
                className="text-sm text-[#5865F2] hover:text-[#4752C4] transition-colors"
              >
                + Add tags
              </button>
            ) : (
              <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
                <label className="block text-sm text-[#b9bbbe] mb-2">
                  Tags (optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#ed4245] text-white px-3 py-1 rounded text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-[#dcddde]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a tag..."
                    className="flex-1 bg-[#202225] border border-[#202225] rounded px-3 py-2 text-white placeholder:text-[#72767d] focus:outline-none focus:border-[#ed4245]"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!tagInput.trim() || tags.length >= 5}
                    className="bg-[#ed4245] hover:bg-[#c13639] text-white px-4 py-2 rounded text-sm transition-colors font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-[#72767d] mt-2">Max 5 tags</p>
              </div>
            )}
          </div>

          {/* Severity Section */}
          <div className="mb-6">
            <div className={`bg-[#2f3136] p-4 rounded-lg border ${isLocked ? 'border-[#faa61a]' : 'border-[#202225]'}`}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-[#b9bbbe]">
                  Severity
                </label>
                {isLocked && (
                  <div className="flex items-center gap-1 text-xs text-[#faa61a]">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-[#72767d] mb-4">
                {isLocked
                  ? 'Severity is locked after the first occurrence and cannot be changed.'
                  : 'How costly should this behavior be?'
                }
              </p>

              <div className="grid grid-cols-2 gap-3">
                {SEVERITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => !isLocked && setSeverity(option.value)}
                    disabled={isLocked}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${severity === option.value
                        ? isLocked
                          ? 'border-[#faa61a] bg-[#202225]'
                          : 'border-[#ed4245] bg-[#202225]'
                        : 'border-[#202225] bg-[#202225]'
                      }
                      ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:border-[#4f545c]'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full border-2`}
                          style={{
                            borderColor: option.color.border,
                            backgroundColor: severity === option.value ? option.color.border : 'transparent'
                          }}
                        />
                        <span
                          className="text-sm font-medium uppercase tracking-wide"
                          style={{ color: option.color.border }}
                        >
                          {option.label}
                        </span>
                      </div>
                      <span className="text-base font-semibold text-[#ed4245]">
                        -{option.xpPenalty} XP
                      </span>
                    </div>
                    <p className="text-xs text-[#72767d]">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lock Notice (only show if not yet locked) */}
          {!isLocked && (
            <div className="mb-6">
              <div className="bg-[#2f3136] rounded-lg p-4 border border-[#faa61a]">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-[#faa61a] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm text-white mb-1">Important</div>
                    <p className="text-xs text-[#b9bbbe]">
                      Severity cannot be changed after the first occurrence is logged.
                      You selected <strong style={{ color: selectedSeverity.color.border }}>{selectedSeverity.label}</strong> with a penalty of <strong className="text-[#ed4245]">-{selectedSeverity.xpPenalty} XP</strong> per occurrence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - sticky at bottom */}
      <div className="border-t border-[#202225] bg-[#2f3136] px-6 py-4 flex gap-3 justify-end shrink-0">
        <button
          onClick={onCancel}
          className="px-6 py-2 rounded text-sm text-[#dbdee1] bg-[#202225] hover:bg-[#4f545c] transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="px-6 py-2 rounded text-sm text-white bg-[#ed4245] hover:bg-[#c13639] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
