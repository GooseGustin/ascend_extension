import { useState, useRef } from "react";
import { X, Plus, Zap } from "lucide-react";
import { Quest } from "../worker/models/Quest";

interface QuestEditFormProps {
  quest: Quest;
  onSaveQuest: (updatedQuest: Partial<Quest>) => void;
  onCancel: () => void;
}

export function QuestEditForm({
  quest,
  onSaveQuest,
  onCancel,
}: QuestEditFormProps) {
  const [title, setTitle] = useState(quest.title);
  const [description, setDescription] = useState(quest.description);
  const [priority, setPriority] = useState<"A" | "B" | "C">(quest.priority);
  const [isPublic, setIsPublic] = useState(quest.isPublic);
  const [dueDate, setDueDate] = useState(quest.dueDate || "");
  const [tags, setTags] = useState<string[]>(quest.tags);
  const [tagInput, setTagInput] = useState("");
  const [pomodoroDuration, setPomodoroDuration] = useState(
    quest.schedule.pomodoroDurationMin
  );
  const [pomodoroBreak, setPomodoroBreak] = useState(
    quest.schedule.breakDurationMin
  );
  const [schedule, setSchedule] = useState<"daily" | "custom">(
    (quest.schedule.frequency.toLowerCase() as "daily" | "custom") ||
      "daily"
  );
  const [customDays, setCustomDays] = useState<number[]>(
    quest.schedule.customDays || []
  );
  const [subtasks, setSubtasks] = useState(
    quest.subtasks.map((st) => ({
      title: st.title,
      estimatedPomodoros: st.estimatePomodoros,
    }))
  );
  const firstSubtaskInputRef = useRef<HTMLInputElement>(null);

  const priorityColors = {
    A: "#ED4245",
    B: "#faa61a",
    C: "#00b0f4",
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const toggleCustomDay = (dayIndex: number) => {
    if (customDays.includes(dayIndex)) {
      setCustomDays(customDays.filter((d) => d !== dayIndex));
    } else {
      setCustomDays([...customDays, dayIndex].sort());
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // const handleAddSubtask = () => {
  //   setSubtasks([...subtasks, { title: "", estimatedPomodoros: 1 }]);
  // };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };
  const handleAddSubtask = () => {
    setSubtasks([{ title: "", estimatedPomodoros: 1 }, ...subtasks]);
    // Focus on the new input after React re-renders
    setTimeout(() => {
      firstSubtaskInputRef.current?.focus();
    }, 0);
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Only add new subtask if current one has content
      if (subtasks[index].title.trim()) {
        handleAddSubtask();
      }
    }
  };

  const handleSubtaskChange = (
    index: number,
    field: "title" | "estimatedPomodoros",
    value: string | number
  ) => {
    const updated = [...subtasks];
    updated[index] = { ...updated[index], [field]: value };
    setSubtasks(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      const updatedData: Partial<Quest> = {
        title: title.trim(),
        description: description.trim(),
        priority,
        isPublic,
        dueDate: dueDate || null,
        tags,
        schedule: {
          frequency: schedule === "daily" ? "Daily" : "Custom",
          customDays: schedule === "custom" ? customDays : undefined,
          pomodoroDurationMin: pomodoroDuration,
          breakDurationMin: pomodoroBreak,
          targetCompletionsPerCycle:
            schedule === "daily" ? 1 : customDays.length,
          preferredTimeSlots: quest.schedule.preferredTimeSlots,
        },
        // subtasks: subtasks
        //   .filter((st) => st.title.trim())
        //   .map((st, index) => ({
        //     id: quest.subtasks[index]?.id || `subtask_${quest.questId}_${index}`,
        //     title: st.title.trim(),
        //     estimatePomodoros: st.estimatedPomodoros,
        //     isComplete: quest.subtasks[index]?.isComplete || false,
        //     completedAt: quest.subtasks[index]?.completedAt || null,
        //     revisionCount: quest.subtasks[index]?.revisionCount || 0,
        //   })),
        subtasks: subtasks
          .filter((st) => st.title.trim())
          .map((st, index) => {
            // Find matching subtask by title to preserve its ID and metadata
            const existingSubtask = quest.subtasks.find(
              (existing) => existing.title === st.title
            );

            return {
              id:
                existingSubtask?.id ||
                `subtask_${quest.questId}_${Date.now()}_${index}`,
              title: st.title.trim(),
              estimatePomodoros: st.estimatedPomodoros,
              isComplete: existingSubtask?.isComplete || false,
              completedAt: existingSubtask?.completedAt || null,
              revisionCount: existingSubtask?.revisionCount || 0,
            };
          }),
      };

      onSaveQuest(updatedData);
    } catch (error) {
      console.error("Failed to save quest:", error);
    }
  };

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col overflow-hidden">
      {/* Header with X button */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-[#202225] shrink-0">
        <h2 className="text-xl text-white font-semibold">Edit Quest</h2>
        <button
          onClick={onCancel}
          className="p-1 text-[#72767d] hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-6">
          {/* Title - Full Width with Card */}
          <div>
            <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225] hover:border-[#5865F2] transition-colors">
              <label className="block text-sm text-[#b9bbbe] mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#faa61a]" />
                Quest Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter an epic quest title..."
                className="w-full bg-[#202225] text-white px-4 py-3 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors text-lg"
              />
            </div>
          </div>

          {/* Description - Full Width with Card */}
          <div>
            <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225] hover:border-[#5865F2] transition-colors">
              <label className="block text-sm text-[#b9bbbe] mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe where your epic journey will lead..."
                rows={4}
                className="w-full bg-[#202225] text-white px-4 py-3 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#b9bbbe] mb-3">
                  Priority
                </label>
                <div className="flex gap-2">
                  {(["A", "B", "C"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`
                        flex-1 px-3 py-2 rounded-lg border-2 text-sm transition-all
                        ${
                          priority === p
                            ? "border-[#5865F2] bg-[#5865F2]/20 text-white"
                            : "border-[#202225] bg-[#202225] hover:border-[#404449]"
                        }
                      `}
                    >
                      <span
                        className={
                          priority === p
                            ? "text-white font-medium"
                            : "text-[#b9bbbe]"
                        }
                      >
                        {p}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#b9bbbe] mb-3">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#202225] text-white px-3 py-2 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
            <label className="block text-sm text-[#b9bbbe] mb-2 font-medium">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[#5865F2] text-white px-3 py-1 rounded text-sm flex items-center gap-2"
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag..."
                className="flex-1 bg-[#202225] border-2 border-transparent rounded px-3 py-2 text-white placeholder:text-[#72767d] focus:outline-none focus:border-[#5865F2]"
              />
              <button
                onClick={handleAddTag}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded text-sm transition-colors font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
            <label className="block text-sm text-[#b9bbbe] mb-3 font-medium">
              Schedule
            </label>
            <div className="flex gap-2 mb-4">
              {(["daily", "custom"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSchedule(s)}
                  className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors capitalize ${
                    schedule === s
                      ? "bg-[#5865F2] text-white"
                      : "bg-[#202225] text-[#b9bbbe] hover:bg-[#404449]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {schedule === "custom" && (
              <div className="mt-3">
                <label className="block text-xs text-[#72767d] mb-2">
                  Select Days
                </label>
                <div className="flex gap-1">
                  {daysOfWeek.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleCustomDay(index)}
                      className={`flex-1 px-2 py-2 rounded text-xs font-medium transition-colors ${
                        customDays.includes(index)
                          ? "bg-[#5865F2] text-white"
                          : "bg-[#202225] text-[#72767d] hover:bg-[#404449]"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pomodoro Settings */}
          <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#b9bbbe] mb-2 font-medium">
                  Pomodoro Duration (min)
                </label>
                <input
                  type="number"
                  min="1"
                  value={pomodoroDuration}
                  onChange={(e) => setPomodoroDuration(parseInt(e.target.value))}
                  className="w-full bg-[#202225] text-white px-3 py-2 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-[#b9bbbe] mb-2 font-medium">
                  Break Duration (min)
                </label>
                <input
                  type="number"
                  min="1"
                  value={pomodoroBreak}
                  onChange={(e) => setPomodoroBreak(parseInt(e.target.value))}
                  className="w-full bg-[#202225] text-white px-3 py-2 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Public/Private Toggle */}
          <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 bg-[#202225] border border-[#404449] rounded cursor-pointer"
              />
              <span className="text-sm text-[#b9bbbe] font-medium">
                Make this quest public
              </span>
            </label>
          </div>

          {/* Subtasks */}
          <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-sm text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#faa61a]" />
                  Subtasks
                </label>
                <p className="text-xs text-[#72767d] mt-1">
                  Break down your quest into manageable tasks
                </p>
              </div>
              <button
                onClick={handleAddSubtask}
                className="text-sm text-[#5865F2] hover:text-[#4752C4] flex items-center gap-2 px-3 py-2 hover:bg-[#5865F2] hover:bg-opacity-10 rounded transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Subtask
              </button>
            </div>

            <div className="space-y-3">
              {subtasks.length === 0 ? (
                <p className="text-sm text-[#72767d] text-center py-4">No subtasks yet</p>
              ) : (
                subtasks.map((subtask, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-center bg-[#202225] p-4 rounded-lg border border-[#36393f] hover:border-[#5865F2] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#5865F2] bg-opacity-20 flex items-center justify-center text-[#5865F2] shrink-0">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      ref={index === 0 ? firstSubtaskInputRef : undefined}
                      value={subtask.title}
                      onChange={(e) =>
                        handleSubtaskChange(index, "title", e.target.value)
                      }
                      onKeyDown={(e) => handleSubtaskKeyDown(e, index)}
                      placeholder="Subtask title..."
                      className="flex-1 bg-transparent text-white px-0 py-0 border-0 outline-none placeholder:text-[#72767d]"
                    />
                    <div className="flex items-center gap-2 bg-[#2f3136] px-3 py-2 rounded">
                      <input
                        type="number"
                        value={subtask.estimatedPomodoros}
                        onChange={(e) =>
                          handleSubtaskChange(
                            index,
                            "estimatedPomodoros",
                            parseInt(e.target.value)
                          )
                        }
                        min="1"
                        max="10"
                        className="w-12 bg-transparent text-white text-center border-0 outline-none"
                        title="Estimated Pomodoros"
                      />
                      <span className="text-sm">🍅</span>
                    </div>
                    <button
                      onClick={() => handleRemoveSubtask(index)}
                      className="text-[#72767d] hover:text-[#ED4245] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
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
          className="px-6 py-2 rounded text-sm text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
