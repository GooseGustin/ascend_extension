import { useEffect, useState } from "react";
import { Search, Sparkles, MessageCircle, Activity } from "lucide-react";
import { Input } from "./ui/input";
import { SearchService, ActivityFeedService } from "../worker";
import type { Quest } from "../worker/models/Quest";
import type { ActivityItem } from "../worker/models/ActivityItem";

interface MiddlePanelProps {
  userId: string;
}

export function MiddlePanel({ userId }: MiddlePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Quest[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  const searchService = new SearchService();
  const activityService = new ActivityFeedService();

  useEffect(() => {
    loadActivityFeed();
  }, [userId]);

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  const loadActivityFeed = async () => {
    try {
      const activities = await activityService.getActivityFeed(userId, {
        limit: 10,
      });
      setActivityFeed(activities);
    } catch (error) {
      console.error("Failed to load activity feed:", error);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await searchService.searchQuestsOnly(
        userId,
        searchQuery,
        {
          limit: 10,
        }
      );
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const gmSuggestions = [
    {
      id: 1,
      text: "Complete 3 focus sessions to level up!",
      type: "challenge",
    },
    { id: 2, text: "Your streak is at 7 days. Keep it up!", type: "milestone" },
  ];

  const watcherComments = [
    {
      id: 1,
      user: "TaskMaster",
      avatar: "🎯",
      comment: "Great progress today!",
      time: "2h ago",
    },
    {
      id: 2,
      user: "FocusBot",
      avatar: "🤖",
      comment: "You've earned 250 XP",
      time: "4h ago",
    },
  ];

  // const activityFeed = [
  //   { id: 1, text: 'Completed "Morning meditation"', time: '1h ago' },
  //   { id: 2, text: 'Started Work Sprint quest', time: '3h ago' },
  //   { id: 3, text: 'Reached Level 15', time: '5h ago' },
  // ];

  return (
    <div className="w-60 bg-[#2f3136] flex flex-col border-r border-[#202225]">
      {/* Title Bar */}
      <div className="h-12 px-4 flex items-center border-b border-[#202225] shrink-0">
        <span className="text-white uppercase tracking-wide text-xs">
          Activity Feed
        </span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Search Bar */}
        <div className="p-2 border-b border-[#202225]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72767d]" />
            <Input
              placeholder="Search tasks, quests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#202225] border-0 pl-8 h-8 text-sm placeholder:text-[#72767d] focus-visible:ring-1 focus-visible:ring-[#00b0f4]"
            />
          </div>
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map((quest) => (
                <div
                  key={quest.questId}
                  className="bg-[#202225] rounded px-2 py-1 text-xs text-[#dcddde] hover:bg-[#34373c] cursor-pointer"
                >
                  {quest.title}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GM Suggestions */}
        <div className="p-3 border-b border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#faa61a]" />
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">
              GM Suggestions
            </span>
          </div>
          {gmSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-[#202225] rounded px-3 py-2 mb-2 text-sm"
            >
              <p className="text-[#dcddde]">{suggestion.text}</p>
            </div>
          ))}
        </div>

        {/* Watchers Comments */}
        <div className="p-3 border-b border-[#202225]">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-[#57F287]" />
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">
              Watchers
            </span>
          </div>
          {watcherComments.map((comment) => (
            <div key={comment.id} className="flex gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center shrink-0">
                <span>{comment.avatar}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#dcddde]">{comment.user}</span>
                  <span className="text-xs text-[#72767d]">{comment.time}</span>
                </div>
                <p className="text-xs text-[#b9bbbe]">{comment.comment}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Feed */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#00b0f4]" />
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">
              Recent Activity
            </span>
          </div>
          {activityFeed.length > 0 ? (
            activityFeed.slice(0, 5).map((activity) => (
              <div
                key={activity.activityId}
                className="mb-2 pl-3 border-l-2 border-[#202225] hover:border-[#00b0f4] transition-colors"
              >
                <p className="text-sm text-[#dcddde]">
                  {activity.type === "level_up" &&
                    `Reached Level ${activity.data.level}`}
                  {activity.type === "quest_complete" &&
                    `Completed "${activity.data.questTitle}"`}
                  {activity.type === "streak_milestone" &&
                    `${activity.data.streakDays}-day streak!`}
                </p>
                <span className="text-xs text-[#72767d]">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#72767d]">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
