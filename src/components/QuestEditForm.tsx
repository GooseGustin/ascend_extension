import { useState } from "react";
import {
  Sword,
  Users,
  CheckSquare,
  X,
  Plus,
  Calendar,
  Sparkles,
  Zap,
} from "lucide-react";
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
  const [schedule, setSchedule] = useState<"daily" | "weekly" | "custom">(
    (quest.schedule.frequency.toLowerCase() as "daily" | "weekly" | "custom") ||
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

  const handleAddSubtask = () => {
    setSubtasks([...subtasks, { title: "", estimatedPomodoros: 1 }]);
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
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
          frequency:
            schedule === "daily"
              ? "Daily"
              : schedule === "weekly"
                ? "Weekly"
                : "Custom",
          customDays: schedule === "custom" ? customDays : undefined,
          pomodoroDurationMin: pomodoroDuration,
          breakDurationMin: pomodoroBreak,
          targetCompletionsPerCycle:
            schedule === "daily"
              ? 1
              : schedule === "weekly"
                ? 7
                : customDays.length,
          preferredTimeSlots: quest.schedule.preferredTimeSlots,
        },
        subtasks: subtasks
          .filter((st) => st.title.trim())
          .map((st, index) => ({
            id: quest.subtasks[index]?.id || `subtask_${quest.questId}_${index}`,
            title: st.title.trim(),
            estimatePomodoros: st.estimatedPomodoros,
            isComplete: quest.subtasks[index]?.isComplete || false,
            completedAt: quest.subtasks[index]?.completedAt || null,
            revisionCount: quest.subtasks[index]?.revisionCount || 0,
          })),
      };

      onSaveQuest(updatedData);
    } catch (error) {
      console.error("Failed to save quest:", error);
    }
  };

  return (
    <div className="bg-[#36393f] rounded-lg shadow-lg max-w-2xl max-h-[80vh] overflow-y-auto border border-[#202225]">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl text-white font-semibold">Edit Quest</h2>
          <button
            onClick={onCancel}
            className="text-[#72767d] hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm text-[#b9bbbe] mb-2">Quest Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter quest title..."
            className="w-full bg-[#2f3136] border border-[#202225] rounded px-3 py-2 text-white placeholder:text-[#72767d] focus:outline-none focus:border-[#5865F2]"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm text-[#b9bbbe] mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your quest..."
            rows={3}
            className="w-full bg-[#2f3136] border border-[#202225] rounded px-3 py-2 text-white placeholder:text-[#72767d] focus:outline-none focus:border-[#5865F2] resize-none"
          />
        </div>

        {/* Priority & Due Date */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm text-[#b9bbbe] mb-2">Priority</label>
            <div className="flex gap-2">
              {(["A", "B", "C"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    priority === p
                      ? "text-white"
                      : "text-[#b9bbbe] bg-[#2f3136]"
                  }`}
                  style={
                    priority === p
                      ? { backgroundColor: priorityColors[p], color: "white" }
                      : undefined
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#b9bbbe] mb-2">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#2f3136] border border-[#202225] rounded px-3 py-2 text-white focus:outline-none focus:border-[#5865F2]"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm text-[#b9bbbe] mb-2">Tags</label>
          <div className="flex gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-[#5865F2] text-white px-2 py-1 rounded text-sm flex items-center gap-1"
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
              className="flex-1 bg-[#2f3136] border border-[#202225] rounded px-3 py-2 text-white placeholder:text-[#72767d] focus:outline-none focus:border-[#5865F2]"
            />
            <button
              onClick={handleAddTag}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Schedule */}
        <div className="mb-6">
          <label className="block text-sm text-[#b9bbbe] mb-2">Schedule</label>
          <div className="flex gap-2 mb-4">
            {(["daily", "weekly", "custom"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSchedule(s)}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  schedule === s
                    ? "bg-[#5865F2] text-white"
                    : "bg-[#2f3136] text-[#b9bbbe] hover:bg-[#4f545c]"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {schedule === "custom" && (
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day, index) => (
                <button
                  key={index}
                  onClick={() => toggleCustomDay(index)}
                  className={`px-2 py-1 rounded text-sm transition-colors ${
                    customDays.includes(index)
                      ? "bg-[#5865F2] text-white"
                      : "bg-[#2f3136] text-[#b9bbbe] hover:bg-[#4f545c]"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pomodoro Settings */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm text-[#b9bbbe] mb-2">
              Pomodoro Duration (min)
            </label>
            <input
              type="number"
              min="1"
              value={pomodoroDuration}
              onChange={(e) => setPomodoroDuration(parseInt(e.target.value))}
              className="w-full bg-[#2f3136] border border-[#202225] rounded px-3 py-2 text-white focus:outline-none focus:border-[#5865F2]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#b9bbbe] mb-2">
              Break Duration (min)
            </label>
            <input
              type="number"
              min="1"
              value={pomodoroBreak}
              onChange={(e) => setPomodoroBreak(parseInt(e.target.value))}
              className="w-full bg-[#2f3136] border border-[#202225] rounded px-3 py-2 text-white focus:outline-none focus:border-[#5865F2]"
            />
          </div>
        </div>

        {/* Subtasks */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-[#b9bbbe]">Subtasks</label>
            <button
              onClick={handleAddSubtask}
              className="flex items-center gap-1 text-sm text-[#5865F2] hover:text-[#4752C4] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Subtask
            </button>
          </div>

          <div className="space-y-2">
            {subtasks.map((subtask, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={subtask.title}
                  onChange={(e) =>
                    handleSubtaskChange(index, "title", e.target.value)
                  }
                  placeholder="Subtask title..."
                  className="flex-1 bg-[#2f3136] border border-[#202225] rounded px-3 py-2 text-white placeholder:text-[#72767d] focus:outline-none focus:border-[#5865F2]"
                />
                <input
                  type="number"
                  min="1"
                  value={subtask.estimatedPomodoros}
                  onChange={(e) =>
                    handleSubtaskChange(
                      index,
                      "estimatedPomodoros",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-16 bg-[#2f3136] border border-[#202225] rounded px-2 py-2 text-white focus:outline-none focus:border-[#5865F2]"
                />
                <button
                  onClick={() => handleRemoveSubtask(index)}
                  className="p-2 text-[#72767d] hover:text-[#ED4245] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Public */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[#b9bbbe]">Make this quest public</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded text-sm text-[#dbdee1] bg-[#2f3136] hover:bg-[#4f545c] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-4 py-2 rounded text-sm text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
