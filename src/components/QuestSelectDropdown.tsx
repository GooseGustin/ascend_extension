import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ChevronDown } from "lucide-react";

interface QuestOption {
  questId: string;
  title: string;
  color?: string;
}

interface QuestSelectDropdownProps {
  quests: QuestOption[];
  selectedQuestId: string | null;
  onSelect: (questId: string) => void;
  placeholder?: string;
}

export function QuestSelectDropdown({
  quests,
  selectedQuestId,
  onSelect,
  placeholder = "Select a quest...",
}: QuestSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedQuest = quests.find((q) => q.questId === selectedQuestId);

  const handleSelect = (questId: string) => {
    onSelect(questId);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full h-10 px-3 flex items-center justify-between gap-2 bg-[#2f3136] hover:bg-[#36393f] border border-[#202225] rounded-md text-sm text-[#dbdee1] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00b0f4]"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedQuest ? (
              <>
                {selectedQuest.color && (
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedQuest.color }}
                  />
                )}
                <span className="text-[#dbdee1] font-medium truncate">
                  {selectedQuest.title}
                </span>
              </>
            ) : (
              <span className="text-[#72767d]">{placeholder}</span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#72767d] flex-shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-2 bg-[#2f3136] border border-[#202225] rounded-lg shadow-2xl"
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-[#4f545c] scrollbar-track-transparent">
          {quests.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[#72767d]">
              No quests available
            </div>
          ) : (
            quests.map((quest) => (
              <button
                key={quest.questId}
                onClick={() => handleSelect(quest.questId)}
                className={`w-full px-3 py-2 rounded-md text-left text-sm transition-all duration-150 flex items-center gap-2 ${
                  selectedQuestId === quest.questId
                    ? "bg-[#5865F2] text-white font-semibold shadow-lg shadow-[#5865F2]/30"
                    : "text-[#dbdee1] hover:bg-[#36393f] hover:shadow-md hover:shadow-[#00b0f4]/20"
                }`}
              >
                {quest.color && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: quest.color }}
                  />
                )}
                <span className="truncate">{quest.title}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
