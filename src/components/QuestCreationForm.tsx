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

interface QuestCreationFormProps {
//   onCreateQuest: (quest: Omit<Quest, "id" | "currentXP" | "progress">) => void;
  onCreateQuest: () => void;
  onCancel: () => void;
}

interface QuestFormData {
  title: string;
  description: string;
  type: 'Quest' | 'DungeonQuest' | 'TodoQuest';
  difficulty: 'Trivial' | 'Easy' | 'Medium' | 'Hard' | 'Epic';
  priority: 'A' | 'B' | 'C';
  isPublic: boolean;
  dueDate?: string;
  tags: string[];
  schedule: {
    frequency: 'Daily' | 'Weekly' | 'Custom';
    customDays?: number[];
    pomodoroDurationMin: number;
    breakDurationMin: number;
  };
  subtasks: Array<{
    title: string;
    estimatePomodoros: number;
  }>;
  icon?: string;
}

export function QuestCreationForm({
  onCreateQuest,
  onCancel,
}: QuestCreationFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questType, setQuestType] = useState<"personal" | "dungeon" | "guild">(
    "personal"
  );
  const [difficulty, setDifficulty] = useState<
    "Easy" | "Medium" | "Hard" | "Epic"
  >("Medium");
  const [isPublic, setIsPublic] = useState(false);
  const [priority, setPriority] = useState<"A" | "B" | "C">("B");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pomodoroDuration, setPomodoroDuration] = useState(25);
  const [pomodoroBreak, setPomodoroBreak] = useState(5);
  const [schedule, setSchedule] = useState<"daily" | "weekly" | "custom">(
    "daily"
  );
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [subtasks, setSubtasks] = useState<
    { title: string; estimatedPomodoros: number }[]
  >([{ title: "", estimatedPomodoros: 1 }]);
  const [icon, setIcon] = useState("⚔️");

  const questTypeOptions = [
    {
      value: "personal",
      label: "Quest",
      icon: Sword,
      description: "Personal quest",
      color: "#5865F2",
    },
    {
      value: "dungeon",
      label: "Dungeon",
      icon: Users,
      description: "Team collaboration",
      color: "#ED4245",
    },
    {
      value: "guild",
      label: "Todo Quest",
      icon: CheckSquare,
      description: "Simple checklist",
      color: "#FEE75C",
    },
  ];

  const difficultyColors = {
    Easy: "#57F287",
    Medium: "#FEE75C",
    Hard: "#faa61a",
    Epic: "#ED4245",
  };

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
    const { QuestService } = await import('../worker');
    const questService = new QuestService();
    
    const questData: QuestFormData = {
      title: title.trim(),
      description: description.trim(),
      type: questType === 'personal' ? 'Quest' : questType === 'dungeon' ? 'DungeonQuest' : 'TodoQuest',
      difficulty: questType === 'guild' ? 'Trivial' : difficulty,  // TodoQuest always Trivial
      priority,
      isPublic,
      dueDate: dueDate || undefined,
      tags,
      schedule: {
        frequency: schedule === 'daily' ? 'Daily' : schedule === 'weekly' ? 'Weekly' : 'Custom',
        customDays: schedule === 'custom' ? customDays : undefined,
        pomodoroDurationMin: pomodoroDuration,
        breakDurationMin: pomodoroBreak
      },
      subtasks: subtasks.filter(st => st.title.trim()),
      icon: icon
    };
    
    const createdQuest = await questService.createQuest(questData);
    
    // Notify parent (which will reload quests)
    // onCreateQuest({});  // Empty object since quest is already created
    onCreateQuest();
  } catch (error) {
    console.error('Failed to create quest:', error);
    alert('Failed to create quest. Please try again.');
  }
};

//   const handleSubmit = async () => {
//     if (!title.trim()) return;

//     try {
//       // Import at top of file
//       const { QuestService } = await import("../worker/services/quest.service");
//       const questService = new QuestService();

//       const questData: QuestFormData = {
//         title: title.trim(),
//         description: description.trim(),
//         type:
//           questType === "personal"
//             ? "Quest"
//             : questType === "dungeon"
//             ? "DungeonQuest"
//             : "TodoQuest",
//         difficulty,
//         priority,
//         isPublic,
//         dueDate: dueDate || undefined,
//         tags,
//         schedule: {
//           frequency:
//             schedule === "daily"
//               ? "Daily"
//               : schedule === "weekly"
//               ? "Weekly"
//               : "Custom",
//           customDays: schedule === "custom" ? customDays : undefined,
//           pomodoroDurationMin: pomodoroDuration,
//           breakDurationMin: pomodoroBreak,
//         },
//         subtasks: subtasks.filter((st) => st.title.trim()),
//         icon: icon,
//       };

//       const createdQuest = await questService.createQuest(questData);

//       // Convert to App's Quest format
//       const questColor =
//         questType === "personal"
//           ? "#5865F2"
//           : questType === "dungeon"
//           ? "#ED4245"
//           : "#FEE75C";

//       onCreateQuest({
//         title: createdQuest.title,
//         icon: icon,
//         type: questType,
//         level: createdQuest.gamification.currentLevel,
//         totalXP: createdQuest.gamification.expToNextLevel,
//         description: createdQuest.description,
//         color: questColor,
//         milestones: [],
//         subtasks: createdQuest.subtasks.map((st) => ({
//           id: st.id,
//           title: st.title,
//           completed: st.isComplete,
//           xp: st.estimatePomodoros * createdQuest.difficulty.xpPerPomodoro,
//         })),
//         comments: [],
//         deadline: createdQuest.dueDate || undefined,
//       });
//     } catch (error) {
//       console.error("Failed to create quest:", error);
//       // Could add error toast here
//     }
//   };

  return (
    <div className="flex-1 bg-[#36393f] overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header with gaming flair */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2] to-[#ED4245] opacity-20 blur-3xl rounded-full" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-8 h-8 text-[#faa61a]" />
                <h2 className="text-3xl text-white">Create New Quest</h2>
              </div>
              <p className="text-[#b9bbbe] ml-11">
                Forge your path to greatness
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-[#72767d] hover:text-white transition-colors p-2 hover:bg-[#2f3136] rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Title */}
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

            {/* Description */}
            <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225] hover:border-[#5865F2] transition-colors">
              <label className="block text-sm text-[#b9bbbe] mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your epic journey..."
                rows={4}
                className="w-full bg-[#202225] text-white px-4 py-3 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors resize-none"
              />
            </div>

            {/* Quest Type - Gaming styled */}
            <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
              <label className="block text-sm text-[#b9bbbe] mb-3">
                Quest Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {questTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setQuestType(option.value as any)}
                      className={`
                        relative p-4 rounded-lg border-2 transition-all group overflow-hidden
                        ${
                          questType === option.value
                            ? "border-[#5865F2] shadow-lg"
                            : "border-[#202225] hover:border-[#404449]"
                        }
                      `}
                      style={{
                        backgroundColor:
                          questType === option.value
                            ? `${option.color}15`
                            : "#202225",
                      }}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br from-transparent to-[#000] opacity-0 group-hover:opacity-20 transition-opacity`}
                      />
                      <Icon
                        className={`w-8 h-8 mx-auto mb-2 transition-transform group-hover:scale-110 ${
                          questType === option.value
                            ? "text-[#5865F2]"
                            : "text-[#72767d]"
                        }`}
                      />
                      <div className="text-sm text-center text-white mb-1">
                        {option.label}
                      </div>
                      <div className="text-xs text-center text-[#72767d]">
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty & Priority - Gaming themed */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
                <label className="block text-sm text-[#b9bbbe] mb-3">
                  Difficulty
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Easy", "Medium", "Hard", "Epic"] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`
                        px-3 py-2 rounded text-sm transition-all relative overflow-hidden group
                        ${
                          difficulty === diff
                            ? "ring-2 ring-offset-2 ring-offset-[#36393f] shadow-lg scale-105"
                            : "hover:scale-105"
                        }
                      `}
                      style={{
                        backgroundColor:
                          difficulty === diff
                            ? difficultyColors[diff]
                            : "#202225",
                        color:
                          difficulty === diff ? "#000" : difficultyColors[diff],
                        ringColor: difficultyColors[diff],
                      }}
                    >
                      <span className="relative z-10">{diff}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
                <label className="block text-sm text-[#b9bbbe] mb-3">
                  Priority
                </label>
                <div className="flex gap-2">
                  {(["A", "B", "C"] as const).map((pri) => (
                    <button
                      key={pri}
                      onClick={() => setPriority(pri)}
                      className={`
                        flex-1 px-3 py-2 rounded transition-all relative overflow-hidden
                        ${
                          priority === pri
                            ? "ring-2 ring-offset-2 ring-offset-[#36393f] shadow-lg scale-105"
                            : "hover:scale-105"
                        }
                      `}
                      style={{
                        backgroundColor:
                          priority === pri ? priorityColors[pri] : "#202225",
                        color: priority === pri ? "#fff" : priorityColors[pri],
                        ringColor: priorityColors[pri],
                      }}
                    >
                      {pri}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Dates */}
            <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
              <label className="block text-sm text-[#b9bbbe] mb-3">
                Quest Timeline
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#72767d] mb-2">
                    Start Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#202225] text-white px-3 py-2 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors"
                    />
                    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-[#72767d] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#72767d] mb-2">
                    Due Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-[#202225] text-white px-3 py-2 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors"
                    />
                    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-[#72767d] pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm text-[#b9bbbe] mb-2 font-medium">Tags</label>
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
                      <X className="w-3 h-3" />a
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleAddTag())
                  }
                  placeholder="Add a tag..."
                  className="flex-1 bg-[#2f3136] border border-[#202225] rounded px-3 py-2 text-white placeholder:text-[#72767d] focus:outline-none focus:border-[#5865F2]"
                />
                <button
                  onClick={handleAddTag}
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded text-sm transition-colors font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Pomodoro Settings */}
            <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
              <label className="block text-sm text-[#b9bbbe] mb-3">
                Pomodoro Settings
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#72767d] mb-2">
                    Focus (min)
                  </label>
                  <input
                    type="number"
                    value={pomodoroDuration}
                    onChange={(e) =>
                      setPomodoroDuration(Number(e.target.value))
                    }
                    min="1"
                    max="60"
                    className="w-full bg-[#202225] text-white px-3 py-2 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#72767d] mb-2">
                    Break (min)
                  </label>
                  <input
                    type="number"
                    value={pomodoroBreak}
                    onChange={(e) => setPomodoroBreak(Number(e.target.value))}
                    min="1"
                    max="30"
                    className="w-full bg-[#202225] text-white px-3 py-2 rounded border-2 border-transparent focus:border-[#5865F2] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Schedule with custom days */}
            <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
              <label className="block text-sm text-[#b9bbbe] mb-3">
                Schedule
              </label>
              <div className="flex gap-2 mb-3">
                {(["daily", "weekly", "custom"] as const).map((sched) => (
                  <button
                    key={sched}
                    onClick={() => setSchedule(sched)}
                    className={`
                      flex-1 px-4 py-2 rounded capitalize transition-all
                      ${
                        schedule === sched
                          ? "bg-[#5865F2] text-white shadow-lg"
                          : "bg-[#202225] text-[#dcddde] hover:bg-[#404449]"
                      }
                    `}
                  >
                    {sched}
                  </button>
                ))}
              </div>
              {schedule === "custom" && (
                <div className="mt-3">
                  <label className="block text-xs text-[#72767d] mb-2">
                    Select Days
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {daysOfWeek.map((day, index) => (
                      <button
                        key={day}
                        onClick={() => toggleCustomDay(index)}
                        className={`
                          px-2 py-2 rounded text-xs transition-all
                          ${
                            customDays.includes(index)
                              ? "bg-[#5865F2] text-white"
                              : "bg-[#202225] text-[#72767d] hover:bg-[#404449]"
                          }
                        `}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Public/Private */}
            <div className="bg-[#2f3136] p-4 rounded-lg border border-[#202225]">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-[#72767d] bg-[#202225] checked:bg-[#5865F2] checked:border-[#5865F2] transition-colors cursor-pointer"
                />
                <div>
                  <span className="text-sm text-white group-hover:text-[#5865F2] transition-colors">
                    Make this quest public
                  </span>
                  <p className="text-xs text-[#72767d]">
                    Others can discover and join this quest
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Subtasks Section - Full Width with gaming theme */}
        <div className="mt-8 bg-[#2f3136] p-6 rounded-lg border border-[#202225]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="text-sm text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#faa61a]" />
                Initial Subtasks
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
            {subtasks.map((subtask, index) => (
              <div
                key={index}
                className="flex gap-3 items-center bg-[#202225] p-4 rounded-lg border border-[#36393f] hover:border-[#5865F2] transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-[#5865F2] bg-opacity-20 flex items-center justify-center text-[#5865F2] shrink-0">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={subtask.title}
                  onChange={(e) =>
                    handleSubtaskChange(index, "title", e.target.value)
                  }
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
                        Number(e.target.value)
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
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-[#2f3136] hover:bg-[#404449] text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-8 py-3 bg-gradient-to-r from-[#5865F2] to-[#4752C4] hover:from-[#4752C4] hover:to-[#3c44a8] text-white rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Create Quest
          </button>
        </div>
      </div>
    </div>
  );
}
